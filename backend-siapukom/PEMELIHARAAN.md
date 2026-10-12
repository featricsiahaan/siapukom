# Jadwal Pemeliharaan SiapUKOM

Jendela pemeliharaan mingguan yang disarankan: **Minggu malam, 21.00-23.00 WITA** (sesuaikan dengan jam paling sepi peserta). Hindari rilis menjelang jadwal ujian atau akhir pekan panjang.

## Harian (5-10 menit)
- Cek peringatan UptimeRobot (monitor `/api/health/db` dan frontend).
- Buka halaman **Konfirmasi Pembayaran** di aplikasi (akun admin) minimal 2x sehari; cocokkan nominal dengan mutasi BCA/GoPay lalu Konfirmasi atau Tolak.

## Mingguan (60-90 menit)
1. **Uji asap sebelum mulai:** `node scripts/smokeTest.js` (semua baris harus OK).
2. **Backup:** `npx ts-node scripts/backupDb.ts`, lalu **salin file `backups/*.json.gz` ke penyimpanan lain** (mis. Google Drive pribadi). Jangan di-commit; berisi data pribadi.
3. **Log:** buka log aplikasi di hPanel (Node.js > Logs); cari `ERROR`, "Cek status DOKU gagal", dan error 5xx berulang.
4. **Pembayaran:** cari pembayaran `PENDING` atau `WAITING_CONFIRMATION` yang menggantung; cocokkan dengan dashboard DOKU dan mutasi bank.
5. **Laporan peserta:** tinjau laporan soal salah; tahan soal bermasalah (status `DITAHAN`) sampai diperiksa.
6. **Konten (soal):** impor sebagai DRAFT -> telaah dokter (lembar telaah xlsx) -> `scripts/applyLembarTelaah.ts` -> aktif. Jangan mengaktifkan soal tanpa telaah.
7. **Fitur/perbaikan:** kembangkan dan uji lokal -> `git push` ke `main` (Vercel dan Hostinger membangun otomatis) -> jalankan lagi `node scripts/smokeTest.js` -> uji satu alur nyata (login, mulai latihan).
8. **Dependensi:** `npm audit` (jangan `--force` tanpa menguji). Terapkan pembaruan patch saja di jendela ini.

## Bulanan
- **Uji pemulihan:** buat branch Neon baru, `npx prisma db push`, arahkan `DATABASE_URL` ke sana, jalankan `scripts/restoreDb.ts <file> --apply`, cek jumlah baris. Backup yang belum pernah diuji belum bisa diandalkan.
- Cek masa berlaku hosting, domain, dan sertifikat SSL; cek kuota/biaya Hostinger, Vercel, Neon.
- Cek settlement dan biaya DOKU di dashboard.

## Per kuartal
- Ganti `JWT_SECRET`, kata sandi database, dan `DOKU_SECRET_KEY` (satu per satu, cek `/api/health/db` setelah tiap langkah; ganti `JWT_SECRET` membuat semua peserta login ulang).

## Rollback cepat
- Rilis bermasalah: `git revert <commit>` lalu `git push`; Hostinger dan Vercel akan membangun versi sebelumnya. Perubahan skema database dikerjakan hati-hati dan didahului backup.
- Database rusak: pulihkan ke database baru dengan `restoreDb.ts`, lalu ganti `DATABASE_URL`.

## Catatan konfigurasi saat ini
- Backend: Hostinger Node.js (auto-deploy dari GitHub, root `backend-siapukom`). Variabel lingkungan diatur di hPanel.
- Frontend: Vercel; alamat API dibaca dari `frontend-siapukom/.env.production`.
- Pembayaran DOKU memakai pengecekan status langsung saat halaman pembayaran terbuka (webhook DOKU tidak terbukti sampai).
