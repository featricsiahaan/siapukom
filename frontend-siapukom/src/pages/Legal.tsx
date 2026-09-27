import { Link } from 'react-router-dom';

export function Legal() {
  return (
    <div style={{ background: '#FFFFFF', color: '#0F2C59' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 40,
          padding: '22px 64px',
          borderBottom: '1px solid rgba(15,44,89,0.08)',
        }}
      >
        <Link to="/" style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em' }}>
          <span style={{ color: '#0F2C59' }}>Siap</span>
          <span style={{ color: '#C9962E' }}>UKOM</span>
        </Link>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 96px' }}>
        <section id="disclaimer" style={{ marginBottom: 56, scrollMarginTop: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 18px' }}>Disclaimer</h1>
          <p style={sty.p}>
            SiapUKOM adalah platform latihan soal mandiri yang dikembangkan secara independen dan{' '}
            <strong>bukan produk resmi</strong> dari Konsil Kedokteran Indonesia (KKI), Kementerian
            Kesehatan, AIPKI, PUKMPPD, atau institusi pendidikan kedokteran mana pun.
          </p>
          <p style={sty.p}>
            Bank soal saat ini masih dalam tahap pengembangan awal (beta) dan belum sepenuhnya melalui
            proses validasi oleh dosen/fakultas berlisensi. Soal dan pembahasan disusun sebagai bahan
            latihan tambahan, <strong>bukan pengganti</strong> kurikulum resmi, buku ajar, atau bimbingan
            dari institusi pendidikan Anda.
          </p>
          <p style={sty.p}>
            Skor dan analitik kesiapan pada dashboard bersifat estimasi berdasarkan riwayat latihan Anda
            di aplikasi ini, dan <strong>tidak menjamin</strong> maupun memprediksi secara pasti hasil UKMPPD
            sesungguhnya. Gunakan sebagai salah satu alat bantu belajar, bukan satu-satunya acuan kesiapan.
          </p>
          <p style={sty.p}>
            Kami secara aktif memperbarui jumlah dan kualitas soal dari waktu ke waktu. Jika Anda
            menemukan soal atau pembahasan yang keliru, silakan hubungi kami agar dapat segera diperbaiki.
          </p>
        </section>

        <section id="privasi" style={{ marginBottom: 56, scrollMarginTop: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 18px' }}>Kebijakan Privasi</h1>
          <p style={sty.p}>
            Kami mengumpulkan data minimal yang diperlukan untuk menjalankan layanan: nama, email,
            kata sandi (tersimpan dalam bentuk hash, bukan teks asli), serta riwayat sesi latihan dan
            simulasi Anda untuk menghitung skor kesiapan.
          </p>
          <p style={sty.p}>
            Data pembayaran (QRIS, dsb.) diproses langsung oleh mitra payment gateway kami
            (DOKU) dan <strong>tidak pernah disimpan</strong> di server SiapUKOM.
          </p>
          <p style={sty.p}>
            Data Anda tidak kami jual atau bagikan ke pihak ketiga untuk kepentingan komersial di luar
            operasional layanan (mis. pemrosesan pembayaran). Anda dapat meminta penghapusan akun dan
            data terkait kapan saja dengan menghubungi kami.
          </p>
          <p style={sty.p}>
            Dengan menggunakan SiapUKOM, Anda menyetujui pengumpulan dan pengolahan data sesuai
            kebijakan ini, sejalan dengan ketentuan Undang-Undang Perlindungan Data Pribadi (UU PDP).
          </p>
        </section>

        <section id="syarat" style={{ scrollMarginTop: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 18px' }}>Syarat &amp; Ketentuan</h1>
          <p style={sty.p}>
            Akses berbayar ("Akses Penuh") berlaku selama periode aktif sesuai paket yang dibeli
            (14 atau 30 hari) sejak transaksi berhasil, atau diperpanjang dari tanggal kedaluwarsa
            yang masih berjalan jika Anda memperpanjang sebelum masa aktif habis.
          </p>
          <p style={sty.p}>
            Pembayaran yang telah berhasil diproses <strong>tidak dapat dikembalikan</strong> (non-refundable),
            kecuali terjadi kesalahan sistem yang menyebabkan akses tidak dapat digunakan sama sekali —
            dalam kasus tersebut silakan hubungi kami untuk penyelesaian.
          </p>
          <p style={sty.p}>
            Akun bersifat personal dan tidak boleh dibagikan atau diperjualbelikan ke pihak lain.
            Kami berhak menonaktifkan akun yang terindikasi melanggar ketentuan ini.
          </p>
          <p style={sty.p}>
            Kami dapat memperbarui fitur, harga, maupun ketentuan ini dari waktu ke waktu. Perubahan
            yang berlaku akan diumumkan melalui aplikasi atau kanal komunikasi resmi kami.
          </p>
        </section>

        <p style={{ ...sty.p, marginTop: 48, fontSize: 13, color: 'rgba(15,44,89,0.5)' }}>
          Ada pertanyaan? Hubungi kami melalui kontak yang tertera di halaman utama.
        </p>
      </div>
    </div>
  );
}

const sty = {
  p: { fontSize: 14.5, lineHeight: 1.7, color: 'rgba(15,44,89,0.75)', margin: '0 0 14px' },
};
