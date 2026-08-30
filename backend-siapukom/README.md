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

### Catatan integrasi ke frontend

- Layar **Masuk** di prototipe hanya punya field Nama + Password. Backend ini pakai **email** sebagai identitas unik login (praktik standar untuk auth sungguhan) — tambahkan field email di form login/register saat mengimplementasikan ulang layar tersebut.
- Layar **Latihan Gratis**: soal & kunci jawaban **tidak** dikirim sekaligus ke client. Alur: `POST /sessions` (dapat daftar soal tanpa kunci) → per soal dijawab, panggil `POST /sessions/:id/answer` untuk dapat feedback instan (benar/salah + pembahasan) → `POST /sessions/:id/finish` untuk hasil akhir. Ini menutup gap keamanan yang disebut PRD (bank soal & kunci tidak boleh terekspos di client sebelum dijawab).
- Layar **Dashboard**: skor & kategori sekarang berasal dari riwayat sesi latihan pengguna yang sudah login (5 sesi terakhir), bukan data dummy. Membership masih memakai default sederhana (`plan: "Gratis"`, `sessionsTotal: 0`) karena gerbang akses berbayar & payment gateway ada di luar cakupan MVP ini (lihat PRD §5.2, prioritas P1–P2).
- Sesi latihan anonim (tanpa token) tetap berfungsi penuh, tapi hasilnya tidak memengaruhi dashboard kesiapan siapa pun (tidak terikat user) — sesuai perilaku "Latihan Gratis" di prototipe.
