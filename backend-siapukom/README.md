# Backend SiapUKOM

Backend REST API untuk SiapUKOM — menggantikan `localStorage`/data hardcoded di prototipe frontend (`Frontend SiapUKOM aplikasi-handoff`) dengan autentikasi, bank soal, sesi latihan, dan dashboard kesiapan yang sungguhan.

**Cakupan versi ini (MVP inti):** autentikasi, bank soal + sesi latihan (fetch soal, submit jawaban, hitung skor), dan dashboard kesiapan per kategori. Fitur admin (CRUD bank soal, impor massal, validasi dosen) dan pembayaran **belum** termasuk — lihat `project/uploads/prd.md` di bundle frontend untuk roadmap lengkap.

## Stack

- Node.js + TypeScript + Express
- Prisma ORM + PostgreSQL
- JWT (jsonwebtoken) + bcrypt untuk autentikasi
- zod untuk validasi input

## Setup Lokal

1. Install dependencies:
   ```bash
   npm install
   ```
2. Salin `.env.example` menjadi `.env` dan sesuaikan `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`.
3. Siapkan database (pilih salah satu):
   - **Docker**: `docker compose up -d db`
   - **PostgreSQL lokal/cloud**: pastikan `DATABASE_URL` menunjuk ke sana.
4. Sinkronkan skema ke database:
   ```bash
   npm run prisma:push
   ```
5. Isi data awal (8 kategori + 8 soal contoh dari prototipe):
   ```bash
   npm run prisma:seed
   ```
6. Jalankan server dev:
   ```bash
   npm run dev
   ```
   Server berjalan di `http://localhost:4000` (atau sesuai `PORT`). Cek `GET /api/health`.

## Migrasi Database

Repo ini belum menyertakan folder `prisma/migrations` — skema disinkronkan langsung lewat `prisma db push`, supaya deploy pertama tidak terhambat menunggu file migrasi. Setelah skema mulai stabil (menambah tabel/kolom baru untuk fitur admin, payment, dll.), beralih ke workflow migrasi standar Prisma:

```bash
npx prisma migrate dev --name <nama_perubahan>   # saat development, generate file migrasi
npx prisma migrate deploy                         # saat deploy ke produksi
```

## Deploy

### Opsi A — Docker Compose (VPS / self-hosted)

```bash
JWT_SECRET="isi-secret-acak-panjang" CORS_ORIGIN="https://domain-frontend-anda" docker compose up -d --build
```
Ini menjalankan PostgreSQL + API dalam satu perintah. Container API otomatis menjalankan `prisma db push` sebelum start.

### Opsi B — PaaS (Railway / Render / Fly.io, dll.)

1. Buat service PostgreSQL di platform pilihan, salin connection string-nya ke `DATABASE_URL`.
2. Deploy folder ini sebagai service Node:
   - Build command: `npm install && npm run build`
   - Start command: `npx prisma db push --skip-generate --accept-data-loss && npm start`
3. Set environment variables: `DATABASE_URL`, `JWT_SECRET` (wajib diganti, jangan pakai nilai contoh), `CORS_ORIGIN` (origin domain frontend produksi), `NODE_ENV=production`.
4. Jalankan seed sekali (lewat shell/console platform): `npm run prisma:seed`.

**Sebelum go-live**, pastikan:
- `JWT_SECRET` sudah diganti dengan nilai acak & rahasia (bukan nilai di `.env.example`).
- `CORS_ORIGIN` diisi domain frontend yang sebenarnya, bukan `*`.
- Koneksi database memakai SSL jika platform mengharuskan (tambahkan `?sslmode=require` pada `DATABASE_URL` bila diperlukan).

## Ringkasan API

Semua response JSON. Endpoint yang butuh login mengharapkan header `Authorization: Bearer <token>`.

| Method & Path | Auth | Deskripsi |
|---|---|---|
| `GET /api/health` | - | Health check |
| `POST /api/auth/register` | - | `{nama, email, password}` → `{token, user}` |
| `POST /api/auth/login` | - | `{email, password}` → `{token, user}` |
| `GET /api/auth/me` | wajib | Data user yang sedang login |
| `GET /api/categories` | - | Daftar kategori soal |
| `POST /api/practice/sessions` | opsional | `{categoryId?, jumlah}` → mulai sesi latihan, dapat dipakai tanpa login (mode "Latihan Gratis") |
| `POST /api/practice/sessions/:id/answer` | opsional | `{order, answerLetter}` → cek jawaban di server, balikan kunci + pembahasan |
| `POST /api/practice/sessions/:id/finish` | opsional | Menutup sesi, balikan skor total & per kategori |
| `GET /api/dashboard` | wajib | Skor kesiapan, breakdown kategori, status membership (dihitung dari 5 sesi selesai terakhir) |
| `POST /api/admin/import` | admin | Upload file `.pdf`/`.docx` (multipart, field `file`) → parsing otomatis → soal masuk sebagai draft |
| `GET /api/admin/questions?status=DRAFT\|ACTIVE` | admin | Daftar soal berdasarkan status |
| `PATCH /api/admin/questions/:id` | admin | Edit field soal (kategori/pertanyaan/opsi/kunci/pembahasan/status) |
| `POST /api/admin/questions/approve-batch` | admin | `{ids: string[]}` → set beberapa soal draft jadi ACTIVE sekaligus |
| `DELETE /api/admin/questions/:id` | admin | Hapus soal (dipakai untuk menolak draft yang salah) |

## Import Bank Soal dari PDF/Word/CSV

Endpoint `POST /api/admin/import` menerima file `.pdf`, `.docx`, atau `.csv` (dideteksi otomatis dari ekstensi/mimetype) dan memakai **parser berbasis format tetap** (bukan AI, jadi gratis tanpa API eksternal).

### Format CSV (paling gampang untuk data tabular)

Header wajib ada (nama kolom tidak case-sensitive), delimiter `;` atau `,` (dideteksi otomatis dari baris header):

```
materi;pertanyaan;opsi_a;opsi_b;opsi_c;opsi_d;opsi_e;kunci;pembahasan
Kardiovaskular;Laki-laki 50 tahun...;Angina stabil;STEMI inferior;Perikarditis;Diseksi aorta;Emboli paru;B;Elevasi ST di sadapan inferior...
```

- Kolom `materi` (atau `kategori`) → jadi kategori soal.
- Kolom `opsi_a` s.d. `opsi_e` → opsi jawaban (minimal 2 kolom opsi harus ada; kolom yang kosong di suatu baris otomatis dilewati).
- Kolom `kunci` (atau `jawaban`) → satu huruf sesuai salah satu kolom opsi yang terisi.
- Kolom `pembahasan` (atau `penjelasan`) → opsional.
- Kolom lain (misal `tingkat`/level kesulitan) **diabaikan** — skema saat ini belum menyimpan field itu; dilaporkan lewat field `ignoredColumns` di response.
- Field tidak perlu dibungkus tanda kutip; jika suatu field (biasanya `pembahasan`) kebetulan mengandung karakter delimiter, parser otomatis menggabungkannya kembali ke kolom terakhir supaya teksnya tidak terpotong.

### Format PDF/Word (teks bebas terstruktur)

Dokumen sumber **wajib** mengikuti pola penulisan berikut persis (spasi/kapitalisasi kata kunci boleh bervariasi, tapi strukturnya harus konsisten):

```
Kategori: Kardiovaskular

1. Laki-laki 50 tahun datang dengan nyeri dada khas iskemik selama 2 jam.
Boleh lanjut ke baris berikutnya untuk vignette panjang.
A. Angina stabil
B. STEMI inferior
C. Perikarditis
D. Diseksi aorta
E. Emboli paru
Kunci: B
Pembahasan: Elevasi ST di sadapan inferior menunjukkan STEMI inferior.

2. Soal berikutnya di kategori yang sama...
A. ...
B. ...
Kunci: A
Pembahasan: ...

Kategori: Respirasi

3. Soal pertama di kategori baru...
```

Aturan parsing:
- Baris `Kategori: <nama>` menentukan kategori untuk semua soal setelahnya, sampai muncul baris `Kategori:` berikutnya.
- Setiap soal **wajib** diawali baris bernomor (`1.`, `2.`, dst — boleh pakai `)` juga, misal `1)`).
- Baris opsi wajib diawali huruf + titik/kurung tutup, misal `A.` atau `A)`.
- Baris kunci jawaban wajib diawali `Kunci:` atau `Jawaban:` diikuti satu huruf.
- Baris pembahasan wajib diawali `Pembahasan:` atau `Penjelasan:`.
- Soal yang tidak lengkap (opsi kurang dari 2, kunci tidak ditemukan/tidak cocok dengan opsi) otomatis dilewati dan dilaporkan lewat field `warnings` di response — bukan bikin seluruh import gagal.
- Kategori yang belum ada di database akan **dibuat otomatis** (dilaporkan lewat `categoriesCreated`).

Semua soal hasil import masuk dengan `status: DRAFT` — **tidak akan muncul di sesi latihan peserta** sampai di-approve lewat `POST /api/admin/questions/approve-batch` (atau `PATCH .../status=ACTIVE` satu-satu).

### Mengakses endpoint admin

Endpoint `/api/admin/*` butuh user dengan `role: ADMIN`. Role ini tidak bisa didapat lewat registrasi biasa (selalu `PESERTA`) — harus diubah manual lewat database, misal via Neon Console SQL Editor:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'email-akun-anda';
```
Setelah itu, login seperti biasa lewat `POST /api/auth/login` — token JWT yang didapat akan punya klaim `role: ADMIN` dan bisa dipakai untuk semua endpoint admin.

### Catatan integrasi ke frontend

- Layar **Masuk** di prototipe hanya punya field Nama + Password. Backend ini pakai **email** sebagai identitas unik login (praktik standar untuk auth sungguhan) — tambahkan field email di form login/register saat mengimplementasikan ulang layar tersebut.
- Layar **Latihan Gratis**: soal & kunci jawaban **tidak** dikirim sekaligus ke client. Alur: `POST /sessions` (dapat daftar soal tanpa kunci) → per soal dijawab, panggil `POST /sessions/:id/answer` untuk dapat feedback instan (benar/salah + pembahasan) → `POST /sessions/:id/finish` untuk hasil akhir. Ini menutup gap keamanan yang disebut PRD (bank soal & kunci tidak boleh terekspos di client sebelum dijawab).
- Layar **Dashboard**: skor & kategori sekarang berasal dari riwayat sesi latihan pengguna yang sudah login (5 sesi terakhir), bukan data dummy. Membership masih memakai default sederhana (`plan: "Gratis"`, `sessionsTotal: 0`) karena gerbang akses berbayar & payment gateway ada di luar cakupan MVP ini (lihat PRD §5.2, prioritas P1–P2).
- Sesi latihan anonim (tanpa token) tetap berfungsi penuh, tapi hasilnya tidak memengaruhi dashboard kesiapan siapa pun (tidak terikat user) — sesuai perilaku "Latihan Gratis" di prototipe.
