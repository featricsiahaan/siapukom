import { Link } from 'react-router-dom';

export function Landing() {
  return (
    <div style={{ background: '#FFFFFF', color: '#0F2C59', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 40,
          padding: '22px 64px',
          borderBottom: '1px solid rgba(15,44,89,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em' }}>
            <span style={{ color: '#0F2C59' }}>Siap</span>
            <span style={{ color: '#C9962E' }}>UKOM</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 32, marginLeft: 24, fontSize: 14.5, fontWeight: 500 }}>
          <a href="#fitur" className="link-hover">
            Fitur
          </a>
          <a href="#harga" className="link-hover">
            Harga
          </a>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/masuk" className="link-hover" style={{ fontSize: 14.5, fontWeight: 600 }}>
            Masuk
          </Link>
          <Link
            to="/latihan"
            className="btn-primary"
            style={{
              background: '#0F2C59',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              padding: '11px 22px',
              borderRadius: 8,
            }}
          >
            Mulai Gratis
          </Link>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 56,
          alignItems: 'center',
          padding: '88px 64px 96px',
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(229,186,115,0.18)',
              color: '#8A6A2E',
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: '0.02em',
              padding: '7px 16px',
              borderRadius: 999,
              marginBottom: 24,
            }}
          >
            Persiapan UKNPDPD
          </span>
          <h1
            style={{
              fontSize: 52,
              lineHeight: 1.12,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '0 0 22px',
              maxWidth: '15ch',
            }}
          >
            Lulus Uji Kompetensi dengan Percaya Diri.
          </h1>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.6,
              color: 'rgba(15,44,89,0.68)',
              maxWidth: '46ch',
              margin: '0 0 34px',
            }}
          >
            Latihan soal tersusun sesuai <i>blueprint</i> resmi, simulasi ujian menyerupai kondisi
            CBT, dan gambaran kesiapan per kategori materi — dalam satu tempat.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 28 }}>
            <Link
              to="/latihan"
              className="btn-primary"
              style={{
                background: '#0F2C59',
                color: '#fff',
                fontSize: 15.5,
                fontWeight: 700,
                padding: '16px 30px',
                borderRadius: 10,
                boxShadow: '0 10px 24px rgba(15,44,89,0.22)',
              }}
            >
              Mulai Latihan Gratis
            </Link>
            <Link to="/masuk" className="link-hover-brown" style={{ color: '#C9962E', fontSize: 15, fontWeight: 700 }}>
              Masuk →
            </Link>
          </div>
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic',
                fontWeight: 800,
                fontSize: 58,
                lineHeight: 1.15,
                color: '#C9962E',
              }}
            >
              Victory Loves Preparation
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: '#8A6A2E',
                marginTop: 6,
              }}
            >
              Amat Victoria Curam
            </div>
          </div>
        </div>

        <div id="demo" style={{ display: 'flex', justifyContent: 'center', scrollMarginTop: 24 }}>
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              borderRadius: 14,
              overflow: 'hidden',
              background: '#fff',
              boxShadow: '0 0 0 1px rgba(15,44,89,0.08), 0 24px 60px rgba(15,44,89,0.22)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 16px',
                background: '#EEF1F6',
              }}
            >
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#febc2e' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840' }} />
              <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 600, color: 'rgba(15,44,89,0.55)' }}>
                SiapUkom — Dashboard
              </span>
            </div>
            <div style={{ background: '#F8F9FC', padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F2C59' }}>Dashboard Kesiapan</div>
              <div
                style={{
                  display: 'flex',
                  gap: 18,
                  alignItems: 'center',
                  background: '#fff',
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: '0 2px 10px rgba(15,44,89,0.06)',
                }}
              >
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    background: 'conic-gradient(#E5BA73 0 71%, #E7EAF1 0 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      fontWeight: 800,
                      color: '#0F2C59',
                    }}
                  >
                    71%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0F2C59' }}>Skor Kesiapan</div>
                  <div style={{ fontSize: 11, color: 'rgba(15,44,89,0.55)' }}>Rata-rata 5 sesi terakhir</div>
                </div>
              </div>
              <div
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: '0 2px 10px rgba(15,44,89,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {[
                  { name: 'Kardiovaskular', pct: 78, color: '#0F2C59' },
                  { name: 'Neurologi', pct: 52, color: '#E5BA73' },
                  { name: 'Pediatri', pct: 66, color: '#0F2C59' },
                ].map((row) => (
                  <div key={row.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#0F2C59' }}>
                      <span>{row.name}</span>
                      <span>{row.pct}%</span>
                    </div>
                    <div style={{ height: 6, background: '#E7EAF1', borderRadius: 4 }}>
                      <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="fitur" style={{ background: '#F6F8FC', padding: '88px 64px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 12px' }}>
              Kenapa SiapUKOM
            </h2>
            <p style={{ fontSize: 15.5, color: 'rgba(15,44,89,0.6)', margin: 0 }}>
              Dirancang khusus untuk kebutuhan koas menghadapi UKMPPD.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 28 }}>
            {FITUR.map((f) => (
              <div
                key={f.title}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: 34,
                  boxShadow: '0 8px 28px rgba(15,44,89,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'rgba(229,186,115,0.16)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {f.icon}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{f.title}</div>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(15,44,89,0.65)', margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="harga" style={{ background: '#F6F8FC', padding: '88px 64px', scrollMarginTop: 24 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 12px' }}>Harga</h2>
            <p style={{ fontSize: 15.5, color: 'rgba(15,44,89,0.6)', margin: 0 }}>
              Model harga masih dalam riset — coba dulu versi gratisnya.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 28, maxWidth: 800, margin: '0 auto' }}>
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 34,
                boxShadow: '0 8px 28px rgba(15,44,89,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#C9962E' }}>GRATIS</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>Rp 0</div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(15,44,89,0.65)', margin: 0 }}>
                Latihan terbatas dengan soal contoh dan pembahasan langsung.
              </p>
              <Link
                to="/latihan"
                style={{
                  marginTop: 'auto',
                  textAlign: 'center',
                  background: '#fff',
                  color: '#0F2C59',
                  border: '1px solid rgba(15,44,89,0.2)',
                  fontSize: 14,
                  fontWeight: 700,
                  padding: '13px 22px',
                  borderRadius: 10,
                }}
              >
                Mulai Gratis
              </Link>
            </div>
            <div
              style={{
                background: '#0F2C59',
                color: '#fff',
                borderRadius: 16,
                padding: 34,
                boxShadow: '0 8px 28px rgba(15,44,89,0.16)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E5BA73' }}>AKSES PENUH</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>Segera Hadir</div>
              <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.8, margin: 0 }}>
                Bank soal lengkap, simulasi format penuh, dan dashboard kesiapan lintas perangkat.
              </p>
              <Link
                to="/dashboard"
                style={{
                  marginTop: 'auto',
                  textAlign: 'center',
                  background: '#E5BA73',
                  color: '#0F2C59',
                  fontSize: 14,
                  fontWeight: 700,
                  padding: '13px 22px',
                  borderRadius: 10,
                }}
              >
                Lihat Pratinjau
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '28px 64px', textAlign: 'center', fontSize: 12.5, color: 'rgba(15,44,89,0.45)' }}>
        SiapUKOM 2026 • Developed by Featric Anju
      </div>
    </div>
  );
}

const FITUR = [
  {
    title: 'Bank Soal Terupdate',
    desc: 'Soal disusun mengikuti proporsi blueprint resmi, bukan kumpulan soal acak.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9962E" strokeWidth={1.8}>
        <path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5v-15z" />
        <path d="M4 19a2.5 2.5 0 012.5-2.5H20" />
      </svg>
    ),
  },
  {
    title: 'Simulasi Mirip Asli',
    desc: 'Timer berjalan, navigasi bernomor, dan format menyerupai kondisi CBT sesungguhnya.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9962E" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.2 1.8" />
      </svg>
    ),
  },
  {
    title: 'Analitik Kesiapan',
    desc: 'Pantau kesiapan per kategori materi, bukan hanya skor total.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9962E" strokeWidth={1.8}>
        <path d="M4 20V10M11 20V4M18 20v-7" />
      </svg>
    ),
  },
];
