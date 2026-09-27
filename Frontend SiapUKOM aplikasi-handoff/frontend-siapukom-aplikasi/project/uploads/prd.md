# PRD — SiapUKOM
### Aplikasi Latihan & Simulasi UKMPPD (Ujian Kompetensi Mahasiswa Program Profesi Dokter)

| | |
|---|---|
| **Status dokumen** | Draft v0.2 — revisi taksonomi ke SKD 2026, menggantikan v0.1 (berbasis SKDI 2012) |
| **Pemilik produk** | Featric |
| **Terakhir diperbarui** | 27 September 2026 |
| **Dokumen pendamping** | `Panduan_Induk_Kurikulum_dan_Bank_Soal_SiapUKOM_SKD2026_v1.0.md` — rujukan editorial operasional (template materi/soal, kamus data, alur telaah). PRD ini mengatur *apa* yang dibangun; Panduan mengatur *bagaimana* konten dan soal disusun sehari-hari. |

---

## 0. Riwayat Perubahan dari v0.1

| Perubahan | Alasan |
|---|---|
| Fondasi taksonomi berganti dari SKDI 2012 (7 area kompetensi) ke **SKD 2026** (5 area kompetensi) | Blocker 1 di v0.1 §11 **terverifikasi** — pengguna menyediakan salinan resmi Keputusan Ketua Konsil Kesehatan Indonesia Nomor HK.01.02/KKI/1291/2026, ditetapkan 7 Mei 2026, berlaku sejak tanggal ditetapkan (Diktum KELIMA) |
| Blocker 2 (indikasi pergeseran MCQ → SCT) **diturunkan status**, bukan dihapus | Belum ada sumber resmi (PUKMPPD/AIPKI) yang mengonfirmasi; Panduan Induk menetapkan *single best answer* MCQ sebagai format editorial default. Tetap dicatat sebagai pertanyaan terbuka di §12, bukan blocker yang menghentikan kerja |
| §5.1 (baseline implementasi) diperbarui agar sesuai kondisi aktual, bukan lagi prototipe localStorage | Backend terpusat, autentikasi akun, admin import massal, dan payment gateway DOKU sudah berjalan di produksi sejak v0.1 ditulis — PRD yang menyebut ini "belum ada" sudah usang |
| §6.1 (skema bank soal) diperluas mengikuti kamus data minimum Panduan Induk §12 | Skema `Question` saat ini (`{categoryId, pertanyaan, opsi, kunci, pembahasan, status}`) tidak menyimpan area kompetensi, kategori sumber (Tuntas/Awal-Rujuk), atau jejak telaah — semua wajib menurut Panduan |
| Alur validasi konten (§6.4) diganti dari biner Draft/Active menjadi 8 status bertahap sesuai Panduan §11 | Biner saat ini tidak mencatat siapa/apa yang sudah ditelaah — tidak auditable |

---

## 1. Ringkasan Eksekutif

SiapUKOM adalah aplikasi web untuk membantu mahasiswa program profesi dokter (koas) di Indonesia mempersiapkan diri menghadapi UKMPPD melalui bank soal latihan yang terstruktur sesuai **Standar Kompetensi Dokter (SKD) 2026**, simulasi ujian yang menyerupai kondisi CBT sesungguhnya, dan analitik kesiapan per area kompetensi/bagian klinis.

Produk ini **bukan** aplikasi kuis generik. Diferensiasinya terletak pada tiga hal: (1) soal disusun mengacu pada 5 area kompetensi dan 14 bagian klinis SKD 2026 — bukan sekadar dikumpulkan bebas; (2) setiap pembahasan memiliki sumber yang bisa ditelusuri (pedoman klinis dengan halaman/DOI, dan rujukan tabel SKD); dan (3) ada tahap validasi berjenjang (telaah sumber → klinis → soal) sebelum soal dipakai secara komersial.

**Catatan kejujuran:** poin diferensiasi di atas adalah *tujuan produk*. Kondisi aktual per 27 September 2026: bank soal berisi ±1.600 soal aktif di backend produksi, tetapi **belum ada satupun** yang memiliki metadata area kompetensi SKD 2026, kategori sumber (Tuntas/Awal-Rujuk), atau jejak telaah berjenjang — seluruh soal existing ditulis sebelum SKD 2026 diadopsi sebagai acuan dan perlu diinventarisasi ulang (lihat §9 Roadmap).

---

## 2. Latar Belakang & Masalah

**Masalah yang ingin diselesaikan:**
- Mahasiswa profesi dokter butuh latihan soal yang representatif terhadap struktur kompetensi resmi (SKD 2026: 5 area, 14 bagian klinis), bukan kumpulan soal acak dengan bobot materi yang tidak proporsional.
- Aplikasi latihan yang ada di pasar umumnya tidak transparan soal sumber rujukan pembahasan, sehingga sulit dipercaya sebagai bahan belajar untuk ujian dengan konsekuensi profesi (izin praktik).
- Mahasiswa butuh gambaran kesiapan per area kompetensi/bagian klinis (bukan hanya skor total) agar bisa fokus belajar di area lemah.

**Yang sudah terverifikasi (berbeda dari v0.1):**
- SKD 2026 (Keputusan KKI No. HK.01.02/KKI/1291/2026, 7 Mei 2026) **berlaku efektif sejak tanggal ditetapkan** dan menggantikan acuan kompetensi sebelumnya sebagai dasar penyusunan kurikulum, standar profesi, dan uji kompetensi (Diktum KETIGA).
- Struktur kompetensi **5 area** (Keselamatan Pasien, Penatalaksanaan Klinis, Prosedur dan Intervensi Klinis, Promotif dan Preventif, Profesionalisme) — bukan 8 area seperti disebut sepintas di salah satu paragraf pembuka dokumen SKD (Panduan Induk §2 mencatat ini sebagai inkonsistensi redaksional sumber, bukan kesalahan pemetaan kita).

**Asumsi yang masih belum divalidasi (perlu riset/verifikasi lanjutan):**
- Bahwa mahasiswa target mau membayar untuk akses (model komersial belum divalidasi dengan willingness-to-pay survey).
- **Belum ada blueprint ujian UKMPPD 2026 resmi** yang menetapkan persentase soal per area/bagian, jumlah stasiun OSCE, durasi, atau nilai batas lulus CBT — SKD 2026 mengatur *cakupan kompetensi*, bukan *distribusi soal ujian*. Jangan mengklaim proporsi blueprint apa pun sampai dokumen ini tersedia dan terverifikasi (lihat Panduan Induk §2 aturan sumber #1 dan #3).
- Apakah format soal UKMPPD tetap MCQ *single best answer* atau bergeser ke Script Concordance Test (SCT) — lihat §12 Pertanyaan Terbuka.

---

## 3. Tujuan Produk (Goals)

| # | Tujuan | Indikator |
|---|---|---|
| G1 | Mahasiswa dapat berlatih soal dengan pembahasan yang bersumber jelas | 100% soal aktif memiliki rujukan SKD (tabel/halaman) **dan** rujukan pedoman klinis sebelum publish |
| G2 | Bank soal mencakup 5 area kompetensi dan 14 bagian klinis SKD 2026 secara bertahap dan seimbang | Setiap area kompetensi dan bagian klinis memiliki soal aktif; kesenjangan cakupan tercatat di matriks distribusi (Panduan Induk §9) |
| G3 | Mahasiswa mendapat simulasi ujian yang realistis | Format 150 soal / ~200 menit dipertahankan sebagai *alokasi internal* — diperbarui begitu blueprint resmi UKMPPD 2026 terverifikasi |
| G4 | Mahasiswa dapat melihat kesiapannya per area kompetensi **dan** per bagian klinis | Dashboard kesiapan menampilkan breakdown ganda (area A1–A5 × bagian M01–M14), bukan hanya kategori tunggal seperti saat ini |
| G5 | Konten soal tervalidasi sebelum dipakai berbayar | Setiap soal berstatus mengikuti alur telaah berjenjang (§6.4) sebelum berstatus AKTIF untuk pengguna Akses Penuh |

**Non-Goals (secara eksplisit di luar cakupan versi ini):**
- Bukan platform pembelajaran materi (bukan pengganti buku ajar/kuliah) — fokus hanya pada *assessment & latihan soal*, meski materi ringkas (per template Panduan Induk §7) dapat mendukung pembahasan.
- Bukan sistem manajemen pembelajaran (LMS) penuh dengan forum diskusi, penjadwalan, dsb.
- Bukan alat proctoring/pengawasan ujian resmi — hanya simulasi mandiri.
- **Bukan** klaim kesesuaian dengan blueprint ujian resmi UKMPPD 2026 sampai dokumen tersebut terverifikasi dari PUKMPPD/AIPKI.

---

## 4. Target Pengguna

### Persona utama: Mahasiswa Program Profesi Dokter (Peserta)
- Sedang menjalani stase klinik / mempersiapkan UKMPPD dalam 1–6 bulan ke depan.
- Butuh latihan terjadwal, feedback cepat, dan pelacakan progres per area kompetensi.
- Akses mayoritas dari mobile/laptop pribadi, koneksi internet bervariasi.

### Persona sekunder: Dosen/Penelaah (Reviewer)
- Melakukan telaah klinis dan telaah soal sesuai alur di §6.4 sebelum konten berstatus AKTIF.
- **Peran yang masih belum terimplementasi di backend:** saat ini role `ADMIN` hanya melakukan CRUD soal (approve/reject batch) tanpa jejak telaah berjenjang (siapa menelaah apa, kapan, dengan hasil apa) — lihat gap di §6.4.

---

## 5. Ruang Lingkup Fitur

### 5.1 Sudah terimplementasi (kondisi aktual per 27 September 2026)

| Fitur | Deskripsi | Catatan risiko/gap |
|---|---|---|
| Autentikasi akun | Registrasi/login berbasis email + JWT, role `PESERTA`/`ADMIN` | — |
| Bank soal terpusat (PostgreSQL) | ±1.600 soal aktif di 24 kategori materi (taksonomi lama, belum dipetakan ke SKD 2026) | **Belum ada satu soal pun dengan metadata area kompetensi/kategori sumber SKD 2026** — lihat §6.1 |
| Sesi latihan & simulasi | Mode Latihan (feedback langsung), Simulasi (150 soal/200 menit, kunci tersembunyi sampai submit), Kategori Khusus (30 soal per kategori, fitur Akses Penuh) | Simulasi mengambil random dari seluruh pool tanpa stratified sampling per kategori — kategori tipis (misal 2 soal) bisa nyaris tidak pernah muncul |
| Dashboard kesiapan | Skor & breakdown per kategori dari 5 sesi terakhir milik user login | Hanya 1 dimensi (kategori materi lama); belum ada breakdown per area kompetensi SKD 2026 |
| Admin: import massal | Upload PDF/DOCX/CSV dengan parser berbasis format tetap → soal masuk sebagai `DRAFT` → admin approve batch → `ACTIVE` | Validasi biner (Draft/Active) saja, tidak ada jejak telaah berjenjang, tidak ada field area kompetensi/kategori sumber untuk diisi saat impor |
| Payment gateway | DOKU QRIS terintegrasi (checkout, notifikasi, settlement otomatis ke membership) | Menunggu aktivasi merchant QRIS oleh DOKU (proses eksternal, di luar kendali kode) |
| Legal & kepatuhan dasar | Halaman Disclaimer, Kebijakan Privasi, Syarat & Ketentuan live di `/legal` | — |

### 5.2 Diperlukan untuk mencapai tujuan produk SKD 2026 (belum ada)

| Prioritas | Fitur | Alasan |
|---|---|---|
| **P0** | Perluasan skema `Question`: `primaryArea`/`secondaryAreas` (A1–A5), `moduleId` (M01–M14), `sourceCategory` (Tuntas/Awal-Rujuk/Rujuk-Balik/Belum-Terverifikasi/Pengayaan) | Tanpa ini, dashboard kesiapan per area kompetensi (G4) dan cakupan blueprint (G2) tidak bisa dihitung sama sekali |
| **P0** | Alur status konten 8-tahap (DRAF → TELAAH_SUMBER → TELAAH_KLINIS → TELAAH_SOAL → SIAP_UJI_COBA → AKTIF, plus DITAHAN/DIARSIPKAN) menggantikan status biner `DRAFT`/`ACTIVE` | Wajib secara etis untuk konten berimplikasi kompetensi klinis; status biner saat ini tidak bisa membedakan "belum ditelaah sama sekali" dari "sudah lolos telaah klinis tapi belum uji coba" |
| **P0** | Inventarisasi ulang 1.600 soal existing: petakan ke area kompetensi + bagian klinis, atau tandai `BELUM_TERVERIFIKASI` sampai ditelaah | Panduan Induk §15 poin 3 secara eksplisit menyatakan panduan ini **belum melakukan audit bank soal lama** — ini pekerjaan yang masih harus dilakukan, bukan otomatis |
| **P1** | Stratified sampling proporsional saat generate sesi Simulasi (berdasar alokasi internal per area/bagian, bukan random murni dari pool campuran) | Distribusi kategori saat ini sangat tidak seimbang (2 soal vs 160 soal pada kategori berbeda); tanpa stratifikasi, simulasi tidak representatif |
| **P1** | Dashboard breakdown ganda: per area kompetensi (A1–A5) dan per bagian klinis (M01–M14) | Saat ini hanya breakdown per kategori tunggal |
| **P1** | Jejak telaah (reviewer, tanggal, hasil) tersimpan di database, bukan hanya status | Dibutuhkan untuk auditability dan checklist Panduan §11 |
| **P2** | Kepatuhan UU PDP lanjutan, audit trail perubahan bank soal | Sebagian sudah ada (halaman legal), audit trail belum |

---

## 6. Persyaratan Fungsional Utama

### 6.1 Manajemen Bank Soal — Skema Data (mengikuti kamus data minimum Panduan Induk §12)

Setiap soal aktif **wajib** memiliki metadata berikut sebelum dianggap lengkap untuk klaim kesesuaian SKD 2026:

| Field | Sumber aturan | Status di skema `Question` saat ini |
|---|---|---|
| `categoryId` (kategori materi lama) | — | ✅ Ada |
| `moduleId` (M01–M14, bagian klinis) | Panduan §4 | ❌ Belum ada |
| `primaryArea`, `secondaryAreas` (A1–A5) | Panduan §3, §12 | ❌ Belum ada |
| `sourceCategory` (Tuntas / Awal-Rujuk / Rujuk-Balik / Belum-Terverifikasi / Pengayaan) | Panduan §5 | ❌ Belum ada |
| `decisionType` (diagnosis/pemeriksaan/terapi/rujukan/dst.) | Panduan §8 (template soal) | ❌ Belum ada |
| `sourceDocument`, `sourceTable`, `sourcePage`, `sourceVerificationStatus` | Panduan §12 | Sebagian — `sourceFile` ada tapi hanya nama file impor, bukan rujukan SKD/pedoman klinis |
| `reviewer`, `reviewDate`, `editorialStatus` (8 tahap) | Panduan §11–12 | ❌ Belum ada — hanya `status` biner `DRAFT`/`ACTIVE` |
| `pertanyaan`, `opsi` (A–E), `kunci`, `pembahasan` | — | ✅ Ada |

**Aturan penting dari Panduan Induk yang berlaku untuk semua penulisan/impor soal baru:**
1. Jangan menjadikan tingkat 1–4A SKDI 2012 sebagai kategori utama. Untuk migrasi data lama, simpan di kolom terpisah tanpa menyamakan otomatis dengan area SKD 2026.
2. Kategori atau angka yang ambigu dari sumber wajib diperiksa ke PDF asli — jangan menebak.
3. Belum ada blueprint ujian 2026 terverifikasi — jangan menetapkan persentase soal per area sebagai "resmi".

### 6.2 Sesi Latihan & Simulasi
- Peserta memilih materi (kategori/bagian klinis) dan jumlah soal (latihan) atau menjalankan simulasi format penuh.
- Simulasi: timer berjalan, tanpa feedback langsung, hasil & pembahasan hanya muncul setelah submit.
- Latihan: feedback (benar/salah + pembahasan) langsung setelah menjawab tiap soal.
- **Gap baru:** begitu field `moduleId`/`primaryArea` tersedia, mode Simulasi harus mengambil soal dengan stratified sampling mengikuti alokasi internal per area/bagian (§5.2 P1), bukan random murni.

### 6.3 Analitik Kesiapan
- Skor kesiapan keseluruhan dihitung dari rata-rata sesi terakhir.
- **Gap:** breakdown saat ini hanya per kategori materi. Setelah metadata SKD 2026 tersedia, breakdown wajib ditambahkan per area kompetensi (A1–A5) dan per bagian klinis (M01–M14), sesuai Tujuan G4.

### 6.4 Alur Validasi Konten (menggantikan status biner)

Mengikuti Panduan Induk §11, status konten mengikuti 8 tahap:

`DRAF → TELAAH_SUMBER → TELAAH_KLINIS → TELAAH_SOAL → SIAP_UJI_COBA → AKTIF`, dengan cabang `DITAHAN` (ambiguitas/konflik pedoman/masalah keselamatan) dan `DIARSIPKAN` (versi usang/diganti).

- **Gap implementasi:** enum `QuestionStatus` di `schema.prisma` saat ini hanya `DRAFT | ACTIVE`. Perlu diperluas menjadi 8 nilai di atas, plus kolom `reviewer`/`reviewDate` agar setiap transisi status tercatat.
- Soal hasil impor massal (CSV/PDF/DOCX) tetap masuk sebagai `DRAF`, tidak otomatis lanjut ke tahap telaah manapun — telaah tetap butuh tindakan manusia.
- Checklist sebelum status `AKTIF` mengikuti checklist lengkap di Panduan Induk §11 (tujuan belajar jelas, kategori sumber benar, pedoman klinis dapat diperiksa, satu jawaban terbaik, dst.) — tidak diulang di sini agar tidak ada dua sumber kebenaran yang bisa berbeda; PRD merujuk ke Panduan sebagai satu-satunya rujukan checklist.

### 6.5 Peran & Akses
- Peserta: akses default.
- Admin/Reviewer: saat ini digabung dalam satu role `ADMIN`. Panduan mensyaratkan tahap telaah oleh "penelaah kompeten" — produk perlu mempertimbangkan apakah role `ADMIN` dipecah menjadi `ADMIN` (kelola sistem) dan `REVIEWER` (telaah klinis/soal) agar jejak akuntabilitas jelas siapa menelaah apa.

---

## 7. Persyaratan Non-Fungsional

| Kategori | Requirement | Status |
|---|---|---|
| Keamanan | Bank soal & kunci jawaban tidak boleh terekspos di client sebelum sesi dimulai | ✅ Terpenuhi — backend menyajikan soal per-sesi, kunci baru dikirim setelah jawaban disubmit |
| Ketersediaan data | Progres/riwayat peserta persisten lintas perangkat | ✅ Terpenuhi — backend + akun |
| Auditability konten | Setiap perubahan status soal tercatat (siapa, kapan, hasil telaah apa) | ❌ Belum terpenuhi — lihat gap §6.4 |
| Akurasi taksonomi | Setiap soal aktif terpetakan ke area kompetensi & bagian klinis SKD 2026, atau ditandai belum terverifikasi | ❌ Belum terpenuhi — 1.600 soal existing belum diinventarisasi ulang |
| Kepatuhan | UU PDP untuk data pengguna | ✅ Sebagian — halaman kebijakan privasi live; audit trail teknis belum ada |

---

## 8. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Soal existing (pra-SKD 2026) diklaim "sesuai SKD 2026" tanpa telaah ulang | Tinggi — klaim produk yang tidak benar, bisa merugikan mahasiswa yang berlatih dengan asumsi keliru | Tandai seluruh 1.600 soal existing sebagai `BELUM_TERVERIFIKASI` terhadap SKD 2026 sampai proses inventarisasi (§9) selesai per soal |
| Distribusi kategori sangat tidak seimbang menyebabkan simulasi tidak representatif | Sedang-Tinggi | Stratified sampling (§5.2 P1) + produksi soal tambahan untuk area/bagian yang tipis |
| Blueprint ujian UKMPPD 2026 belum terverifikasi, tapi tim tergoda menetapkan persentase soal "resmi" secara sepihak | Tinggi jika terjadi — klaim pemasaran yang tidak dapat dipertanggungjawabkan | Semua alokasi persentase soal per area/bagian wajib diberi label "alokasi internal", bukan "sesuai blueprint resmi", sampai dokumen blueprint terverifikasi dari PUKMPPD/AIPKI |
| Indikasi (belum terkonfirmasi) pergeseran format soal MCQ → SCT | Tinggi jika benar — skema data soal tidak kompatibel | Tetap gunakan MCQ *single best answer* sebagai default (sesuai Panduan §8); pantau konfirmasi resmi PUKMPPD/AIPKI sebelum ada keputusan migrasi skema (lihat §12) |
| Model bisnis one-time-purchase belum divalidasi pasar | Sedang | Riset willingness-to-pay sebelum investasi besar lanjutan |

---

## 9. Roadmap Bertahap (diusulkan, menggantikan roadmap v0.1)

1. **Fase 1 — Perluasan Skema** *(belum dimulai)*: tambahkan field `moduleId`, `primaryArea`/`secondaryAreas`, `sourceCategory`, `reviewer`/`reviewDate`, dan enum status 8-tahap ke `schema.prisma`. Tanpa fase ini, tidak ada fase lain yang bisa dimulai.
2. **Fase 2 — Inventarisasi Bank Soal Existing**: audit ±1.600 soal aktif, petakan ke area kompetensi & bagian klinis satu per satu (atau tandai `BELUM_TERVERIFIKASI`), sesuai Panduan Induk §15 poin 3.
3. **Fase 3 — Modul Percontohan**: pilih satu bagian klinis (M01–M14), buat materi + soal lengkap mengikuti template Panduan §7–8 sebagai acuan kualitas untuk penulis lain.
4. **Fase 4 — Stratified Sampling & Dashboard Ganda**: implementasi pengambilan soal proporsional untuk Simulasi, dan breakdown dashboard per area kompetensi + bagian klinis.
5. **Fase 5 — Populasi Skala Penuh**: lanjutkan penulisan/impor soal baru untuk area/bagian yang masih tipis, dengan alur telaah 8-tahap berjalan penuh.
6. **Fase 6 — Blueprint Resmi (kondisional)**: begitu blueprint ujian UKMPPD 2026 resmi tersedia dan terverifikasi, buat matriks distribusi baru tanpa menghapus jejak alokasi internal sebelumnya (mengikuti Panduan §15 poin 6).

---

## 10. Blocker (status per v0.2)

### Blocker 1 — SKDI 2012 digantikan SKD 2026: **TERVERIFIKASI, TIDAK LAGI BLOCKER**
Sumber primer (Keputusan Ketua Konsil Kesehatan Indonesia Nomor HK.01.02/KKI/1291/2026, ditetapkan di Jakarta 7 Mei 2026, ditandatangani Arianti Anaya) telah diperiksa langsung. Diktum KESATU–KELIMA mengonfirmasi: SKD 2026 berlaku sebagai standar kompetensi minimal untuk pengembangan kurikulum, standar profesi, dan uji kompetensi, berlaku sejak tanggal ditetapkan. Struktur 5 area kompetensi (Keselamatan Pasien, Penatalaksanaan Klinis, Prosedur dan Intervensi Klinis, Promotif dan Preventif, Profesionalisme) tercantum eksplisit di BAB III bagian A. **Tindakan:** seluruh taksonomi produk (§5–6 dokumen ini) sekarang mengacu ke SKD 2026, bukan SKDI 2012.

### Blocker 2 — Indikasi pergeseran MCQ → SCT: **DITURUNKAN menjadi Pertanyaan Terbuka (lihat §12)**
Belum ada sumber resmi PUKMPPD/AIPKI yang ditemukan untuk mengonfirmasi ini. Panduan Induk menetapkan MCQ *single best answer* sebagai format editorial default sampai ada informasi lebih lanjut. Ini tidak lagi memblokir penulisan soal, tapi tetap dipantau.

---

## 11. Pertanyaan Terbuka (prioritas menengah, tidak memblokir Fase 1–3)

1. Apakah role `ADMIN` perlu dipecah menjadi `ADMIN` dan `REVIEWER` agar jejak telaah berjenjang punya akuntabilitas yang jelas?
2. Siapa yang menjadi penelaah klinis selain Featric sendiri — apakah sudah ada komitmen dosen/faculty reviewer?
3. Kapan blueprint ujian UKMPPD 2026 resmi (persentase soal per area, jumlah stasiun, durasi, nilai batas lulus) diperkirakan tersedia, dan dari sumber mana ia akan diverifikasi?
4. Apakah format soal UKMPPD tetap MCQ atau bergeser ke SCT — perlu konfirmasi PUKMPPD/AIPKI sebelum populasi soal skala besar berikutnya dimulai untuk topik yang berisiko tidak kompatibel dengan skema SCT.
5. Bagaimana strategi migrasi 24 kategori materi lama ke struktur 14 bagian klinis (M01–M14) — apakah pemetaan 1:1, 1:banyak, atau sebagian kategori lama dipecah/digabung?

---

*Dokumen ini merefleksikan kondisi backend produksi dan sumber SKD 2026 per 27 September 2026. Bagian "gap" ditulis secara eksplisit agar tidak menciptakan kesan bahwa fitur yang direncanakan sudah terimplementasi. Untuk detail operasional penulisan materi/soal (template, kamus data lengkap, checklist telaah), rujuk `Panduan_Induk_Kurikulum_dan_Bank_Soal_SiapUKOM_SKD2026_v1.0.md` — dokumen ini tidak menduplikasi isinya.*
