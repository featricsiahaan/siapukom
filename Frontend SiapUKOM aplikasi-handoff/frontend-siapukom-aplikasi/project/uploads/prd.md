# PRD — SiapUKOM
### Aplikasi Latihan & Simulasi UKMPPD (Ujian Kompetensi Mahasiswa Program Profesi Dokter)

| | |
|---|---|
| **Status dokumen** | Draft v0.1 — disusun dari kondisi prototipe `prototipe-ukom_3.html` |
| **Pemilik produk** | Featric |
| **Terakhir diperbarui** | Agustus 2026 |

---

## 1. Ringkasan Eksekutif

SiapUKOM adalah aplikasi web untuk membantu mahasiswa program profesi dokter (koas) di Indonesia mempersiapkan diri menghadapi UKMPPD melalui bank soal latihan yang terstruktur sesuai blueprint resmi, simulasi ujian yang menyerupai kondisi CBT sesungguhnya, dan analitik kesiapan per kompetensi/materi.

Produk ini **bukan** aplikasi kuis generik. Diferensiasinya terletak pada tiga hal: (1) soal disusun mengikuti proporsi blueprint UKMPPD/SKDI, bukan sekadar dikumpulkan bebas; (2) setiap pembahasan memiliki sumber yang bisa ditelusuri (DOI/pedoman/buku ajar); dan (3) ada tahap validasi oleh dosen/fakultas berlisensi sebelum soal dipakai secara komersial.

**Catatan kejujuran:** poin diferensiasi di atas adalah *tujuan produk*, bukan kondisi saat ini. Prototipe yang ada baru mengimplementasikan mekanisme kuis dan navigasi; kontennya (8 soal contoh) dan proses validasinya belum ada.

---

## 2. Latar Belakang & Masalah

**Masalah yang ingin diselesaikan:**
- Mahasiswa profesi dokter butuh latihan soal yang representatif terhadap struktur UKMPPD (150 soal, format vignette klinis, distribusi tinjauan sesuai blueprint), bukan kumpulan soal acak dengan bobot materi yang tidak proporsional.
- Aplikasi latihan yang ada di pasar umumnya tidak transparan soal sumber rujukan pembahasan, sehingga sulit dipercaya sebagai bahan belajar untuk ujian dengan konsekuensi profesi (izin praktik).
- Mahasiswa butuh gambaran kesiapan per kompetensi/tinjauan (bukan hanya skor total) agar bisa fokus belajar di area lemah.

**Asumsi yang belum divalidasi (perlu riset pengguna):**
- Bahwa mahasiswa target mau membayar untuk akses (model komersial one-time-purchase belum divalidasi dengan willingness-to-pay survey).
- Bahwa 1.000–1.500 soal adalah jumlah yang cukup untuk dianggap "komprehensif" oleh target pengguna — ini asumsi internal tim, bukan riset pasar.

---

## 3. Tujuan Produk (Goals)

| # | Tujuan | Indikator |
|---|---|---|
| G1 | Mahasiswa dapat berlatih soal dengan pembahasan yang bersumber jelas | 100% soal punya rujukan (DOI/pedoman/buku) sebelum publish |
| G2 | Distribusi soal merepresentasikan blueprint resmi UKMPPD | Deviasi proporsi per tinjauan ≤ ±2% dari blueprint |
| G3 | Mahasiswa mendapat simulasi ujian yang realistis | Format 150 soal / ~200 menit, tanpa pembahasan langsung, sesuai kondisi CBT |
| G4 | Mahasiswa dapat melihat kesiapannya per kategori materi | Dashboard kesiapan berbasis riwayat 5 sesi terakhir (sudah ada di prototipe) |
| G5 | Konten soal tervalidasi sebelum dipakai berbayar | Setiap soal AI-generated memiliki status validasi oleh dosen berlisensi sebelum masuk bank produksi |

**Non-Goals (secara eksplisit di luar cakupan versi awal):**
- Bukan platform pembelajaran materi (bukan pengganti buku ajar/kuliah) — fokus hanya pada *assessment & latihan soal*.
- Bukan sistem manajemen pembelajaran (LMS) penuh dengan forum diskusi, penjadwalan, dsb.
- Bukan alat proctoring/pengawasan ujian resmi — hanya simulasi mandiri.

---

## 4. Target Pengguna

### Persona utama: Mahasiswa Program Profesi Dokter (Peserta)
- Sedang menjalani stase klinik / mempersiapkan UKMPPD dalam 1–6 bulan ke depan.
- Butuh latihan terjadwal, feedback cepat, dan pelacakan progres.
- Akses mayoritas dari mobile/laptop pribadi, koneksi internet bervariasi (perlu dipertimbangkan untuk arsitektur backend nanti).

### Persona sekunder: Dosen/Pengajar (Admin)
- Mengelola bank soal (tambah manual, impor massal, hapus).
- Mengatur parameter (batas lulus, akses mode latihan, PIN).
- **Peran yang belum ada di prototipe:** dosen sebagai *validator* konten AI-generated — saat ini "admin" hanya mengelola CRUD soal, tidak ada alur review/approval terpisah dari alur input.

---

## 5. Ruang Lingkup Fitur

### 5.1 Sudah terimplementasi di prototipe (baseline)

| Fitur | Deskripsi | Catatan risiko/gap |
|---|---|---|
| Dua peran akses | Peserta (default) & Admin (PIN, session-only) | PIN disimpan plaintext di objek `CFG` yang dapat dibaca dari client — **bukan kontrol keamanan sesungguhnya** |
| Mode latihan (Latihan) | Soal dengan pembahasan langsung setelah menjawab | — |
| Mode simulasi ujian | Timer, tanpa pembahasan langsung, palet navigasi nomor soal | Durasi dihitung otomatis 1 menit/soal (hardcoded) — belum bisa dikonfigurasi |
| Pilihan jumlah soal | Simulasi: 20/50/100/150; Latihan: 5/10/20/50 | — |
| Randomisasi soal | Fisher-Yates shuffle per sesi | — |
| Navigasi soal bernomor | Indikator warna terjawab/belum/ragu-ragu | — |
| Dashboard kesiapan | Gauge visual + breakdown per kategori dari 5 sesi terakhir | Perhitungan berbasis riwayat lokal saja, tidak ada agregasi lintas perangkat |
| Kelola soal (admin) | Tambah manual, impor massal (CSV/delimited), hapus | Tidak ada validasi duplikasi, tidak ada versioning, tidak ada jejak siapa yang menambahkan soal |
| Pengaturan | Batas nilai lulus, PIN admin, toggle akses mode latihan | — |
| Penyimpanan | localStorage → window.storage → in-memory (fallback berjenjang) | Data tidak tersinkronisasi lintas perangkat; hilang jika browser data dibersihkan |

### 5.2 Diperlukan untuk mencapai tujuan produk (belum ada)

| Prioritas | Fitur | Alasan |
|---|---|---|
| **P0** | Bank soal 1.000–1.500 soal sesuai blueprint tinjauan 5 & dimensi tambahan | Tanpa ini, simulasi 150 soal penuh tidak representatif (saat ini hanya 8 soal seed) |
| **P0** | Alur validasi konten: draft AI → review dosen berlisensi → status "tervalidasi" sebelum masuk bank produksi | Wajib secara etis untuk konten yang berimplikasi pada kompetensi klinis |
| **P0** | Backend terpusat (bukan localStorage) untuk bank soal & autentikasi | localStorage rentan hilang, tidak bisa diaudit, tidak bisa dibagikan lintas admin |
| **P1** | Stratified sampling proporsional saat generate sesi (bukan random murni dari seluruh pool) | Saat ini `filterPool` + shuffle acak tidak menjamin proporsi blueprint per sesi simulasi |
| **P1** | Durasi per soal dapat dikonfigurasi (bukan hardcoded 60 detik/soal) | Fleksibilitas kebijakan admin |
| **P1** | Gerbang akses berbasis kode aktivasi (model jual putus) | Untuk model komersial one-time-purchase |
| **P2** | Integrasi payment gateway lokal (Midtrans/Xendit/Doku/Mayar) | Diperlukan saat masuk fase komersial |
| **P2** | Kepatuhan UU PDP, disclaimer status materi tidak resmi | Kewajiban legal sebelum go-to-market |

---

## 6. Persyaratan Fungsional Utama

### 6.1 Manajemen Bank Soal
- Setiap soal memiliki metadata minimal: kategori/tinjauan sistem organ, tingkat kesulitan, level kompetensi SKDI, kata kunci proses (recall/reasoning/problem-solving — bila dimensi ini diadopsi dari blueprint), status validasi, sumber rujukan pembahasan.
- **Gap saat ini:** struktur data soal di prototipe (`{id, kategori, tingkat, pertanyaan, opsi, kunci, pembahasan}`) tidak menyimpan level SKDI, sumber rujukan, atau status validasi. Skema ini perlu diperluas sebelum impor massal dari blueprint Excel dilakukan.

### 6.2 Sesi Latihan & Simulasi
- Peserta memilih materi (kategori) dan jumlah soal (latihan) atau menjalankan simulasi format penuh.
- Simulasi: timer berjalan, tanpa feedback langsung, hasil & pembahasan hanya muncul setelah submit.
- Latihan: feedback (benar/salah + pembahasan) langsung setelah menjawab tiap soal.
- Peserta dapat menandai soal ragu-ragu dan melompat antar nomor soal.

### 6.3 Analitik Kesiapan
- Skor kesiapan keseluruhan dihitung dari rata-rata 5 sesi terakhir.
- Breakdown per kategori materi ditampilkan sebagai bar chart dengan ambang warna (di bawah/di atas batas lulus).
- **Gap:** tidak ada analitik per level kompetensi SKDI atau per dimensi kognitif — hanya per kategori materi. Jika blueprint mensyaratkan pelaporan multi-dimensi, ini perlu ditambahkan.

### 6.4 Peran & Akses
- Peserta: akses default, tidak bisa melihat menu Kelola Soal/Pengaturan.
- Admin: akses via PIN, session-only (tidak persisten), dapat CRUD soal dan mengubah konfigurasi.
- **Gap keamanan:** ini cukup untuk prototipe demo, tidak cukup untuk produksi. Diperlukan autentikasi berbasis akun (bukan PIN bersama) sebelum ada data pengguna nyata dan konten berbayar.

---

## 7. Persyaratan Non-Fungsional

| Kategori | Requirement | Status di prototipe |
|---|---|---|
| Keamanan | Bank soal & jawaban kunci tidak boleh terekspos di client-side yang bisa dibaca sebelum sesi dimulai | ❌ Tidak terpenuhi — seluruh bank ada di source HTML/JS |
| Keamanan | Kredensial admin tidak disimpan plaintext di client | ❌ Tidak terpenuhi |
| Ketersediaan data | Progres/riwayat peserta harus persisten lintas perangkat | ❌ Tidak terpenuhi (localStorage per-browser) |
| Auditability | Setiap perubahan bank soal tercatat (siapa, kapan, apa) | ❌ Belum ada |
| Performa | Render soal & navigasi < 100ms per interaksi | ✅ Kemungkinan besar terpenuhi (arsitektur ringan, single-file) |
| Aksesibilitas | Kontras warna, ukuran target sentuh mobile | Sebagian — perlu audit WCAG formal |
| Kepatuhan | UU PDP untuk data pengguna (jika backend + akun ditambahkan) | ❌ Belum relevan di prototipe, wajib sebelum backend live |

---

## 8. Metrik Keberhasilan

**Metrik produk (setelah backend & konten lengkap):**
- Proporsi soal per tinjauan menyimpang ≤ ±2% dari blueprint resmi.
- ≥ 95% soal memiliki rujukan sumber yang dapat diverifikasi.
- Rasio soal tervalidasi dosen terhadap total soal aktif = 100% untuk soal berbayar/komersial.

**Metrik engagement (perlu instrumentasi, belum ada di prototipe):**
- Jumlah sesi simulasi penuh (150 soal) diselesaikan per pengguna.
- Retensi mingguan pengguna aktif.
- Korelasi skor simulasi dengan hasil UKMPPD riil (idealnya divalidasi lewat survei pasca-ujian — sulit diukur, butuh desain riset terpisah).

**Catatan:** metrik terakhir (korelasi dengan hasil ujian riil) adalah klaim nilai produk yang paling kuat secara pemasaran, tapi juga paling sulit dan paling lama diverifikasi. Jangan mengklaim korelasi ini di materi pemasaran sebelum benar-benar ada data pendukung.

---

## 9. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Soal AI-generated mengandung kesalahan klinis tanpa terdeteksi | Tinggi — bisa membentuk miskonsepsi pada calon dokter | Wajib validasi dosen berlisensi sebelum status "aktif komersial"; soal draft ditandai jelas sebagai belum tervalidasi |
| Bank soal dapat diekstrak dari source code (arsitektur single-file/client-side) | Tinggi untuk model komersial — konten berbayar bisa dibajak | Pindah ke backend dengan penyajian soal per-request, bukan bundel penuh di client |
| PIN admin bersama & tidak persisten memberi rasa aman semu | Sedang | Ganti dengan autentikasi akun individual sebelum multi-admin/produksi |
| Proporsi blueprint tidak terjaga otomatis saat sesi dibuat dari pool campuran | Sedang | Implementasi stratified sampling, bukan random dari seluruh pool |
| Model bisnis one-time-purchase belum divalidasi pasar | Sedang | Riset willingness-to-pay sebelum investasi besar di payment gateway |
| SKDI 2012 kemungkinan telah digantikan SKD 2026 (restrukturisasi 7→5 area kompetensi) | **Tinggi** — seluruh taksonomi Fase 1 berisiko usang | Lihat Blocker 1 di §11. Wajib verifikasi ke sumber primer (KKI/Kemenkes/AIPKI) sebelum populasi soal massal |
| Indikasi (belum terkonfirmasi) pergeseran format soal MCQ → SCT | Tinggi jika benar — skema data soal tidak kompatibel | Lihat Blocker 2 di §11. Wajib verifikasi ke PUKMPPD/AIPKI sebelum finalisasi skema data soal |

---

## 10. Roadmap Bertahap (diusulkan)

1. **Fase 1 — Fondasi Blueprint** *(sudah dimulai)*: taksonomi tinjauan, skema metadata soal, kalkulator proporsi.
2. **Fase 2 — Populasi Konten**: penulisan soal massal mengikuti blueprint, disertai alur draft → review dosen → aktif.
3. **Fase 3 — Migrasi Backend**: pindah dari localStorage/single-file ke backend terpusat (kandidat: Supabase) dengan autentikasi akun sungguhan.
4. **Fase 4 — Pengerasan Keamanan Konten**: penyajian soal per-sesi dari server (bukan bundel client), audit trail perubahan bank soal.
5. **Fase 5 — Komersialisasi**: gerbang kode aktivasi, integrasi payment gateway, kepatuhan legal (UU PDP, disclaimer, registrasi usaha).

---

## 11. Blocker Berprioritas Tinggi (harus diselesaikan sebelum populasi soal massal)

Dua temuan berikut ditemukan lewat pencarian web saat penyusunan dokumen ini (Agustus 2026), **belum diverifikasi terhadap sumber primer**, dan berpotensi mengubah fondasi taksonomi maupun skema data soal. Populasi bank soal massal (Fase 2 pada roadmap §10) **tidak disarankan dimulai** sebelum keduanya diklarifikasi, karena keduanya memengaruhi struktur dasar, bukan detail konten.

### Blocker 1 — Kemungkinan SKDI 2012 telah digantikan oleh SKD 2026
**Confidence: Medium-High** (dikuatkan oleh 3 sumber independen dengan detail konsisten — nomor keputusan, tanggal, nama penandatangan — namun belum diverifikasi dari domain resmi KKI/Kemenkes karena situs resmi tidak dapat diakses otomatis).

- Keputusan Ketua Konsil Kesehatan Indonesia Nomor **HK.01.02/KKI/1291/2026**, ditetapkan 7 Mei 2026, dilaporkan menggantikan SKDI 2012.
- Struktur kompetensi dilaporkan berubah dari **7 area menjadi 5 area kompetensi**, dengan pemetaan eksplisit ke standar internasional (ACGME/AAMC, GMC, CanMEDS, AMC, WHO).
- Jika benar dan berlaku untuk siklus UKMPPD yang menjadi target SiapUKOM, **seluruh taksonomi Fase 1 (`SiapUKOM_Blueprint_Fase1.xlsx`) perlu direstrukturisasi** sebelum digunakan sebagai acuan penulisan soal massal.
- **Tindakan diperlukan:** verifikasi teks resmi keputusan ini langsung dari situs KKI/Kemenkes/AIPKI/PUKMPPD, dan konfirmasi apakah UKMPPD periode yang relevan (misal periode setelah Mei 2026) sudah menggunakan struktur baru atau masih dalam masa transisi ke struktur lama.

### Blocker 2 — Indikasi (belum terkonfirmasi) pergeseran format soal MCQ → SCT
**Confidence: Low-Medium** (sumber tunggal, bukan sumber resmi — blog bimbel UKMPPD, bukan situs KKI/AIPKI/PUKMPPD).

- Ditemukan referensi ke perubahan format dari MCQ standar ke **Script Concordance Test (SCT)** untuk UKMPPD 2025, format yang menilai penalaran klinis dalam kondisi ambigu, bukan pilihan-jawaban-tunggal-terbaik.
- Jika benar, skema data soal saat ini (`{id, kategori, tingkat, pertanyaan, opsi:{A–E}, kunci, pembahasan}`) **tidak kompatibel** dengan format SCT, yang membutuhkan struktur skenario-item-respons berskala (bukan satu kunci tunggal).
- **Tindakan diperlukan:** konfirmasi ke PUKMPPD/AIPKI apakah SCT sudah menjadi bagian resmi format CBT UKMPPD, sebagian, atau masih wacana.

---

## 12. Pertanyaan Terbuka Lainnya (prioritas menengah, tidak memblokir Fase 1)

1. Apakah dimensi analitik hanya per kategori materi, atau juga per level kompetensi SKDI / tahap proses klinis? Ini menentukan skema data dan kompleksitas dashboard.
2. Siapa yang menjadi validator konten selain Featric sendiri — apakah sudah ada komitmen dosen/faculty reviewer, atau ini masih dicari?
3. Apakah target 1.000–1.500 soal ditetapkan berdasarkan benchmark aplikasi kompetitor, atau angka internal tanpa validasi eksternal?
4. Apakah ada rencana korpus soal berbahasa Inggris (untuk kompetensi yang mensyaratkan literatur internasional), atau seluruhnya Bahasa Indonesia?

---

*Dokumen ini merefleksikan kondisi prototipe per file `prototipe-ukom_3.html` yang tersedia saat penyusunan. Bagian "gap" dan "risiko" ditulis secara eksplisit agar tidak menciptakan kesan bahwa fitur yang direncanakan sudah terimplementasi.*
