import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { SimulasiStatus, SlideItem } from '../api/types';

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Materi() {
  const { token, isAuthenticated } = useAuth();

  const [status, setStatus] = useState<SimulasiStatus | null>(null);
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .getSimulasiStatus(token)
      .then((s) => {
        setStatus(s);
        if (s.isAksesPenuhActive) {
          return api.getMateri(token).then((res) => setSlides(res.slides));
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat materi.'))
      .finally(() => setLoading(false));
  }, [token]);

  const openSlide = async (slide: SlideItem) => {
    if (!token) return;
    setOpeningId(slide.id);
    try {
      const blob = await api.getMateriFileBlob(token, slide.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal membuka materi.');
    } finally {
      setOpeningId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 15, color: 'rgba(15,44,89,0.7)' }}>Materi Belajar membutuhkan akun. Silakan masuk terlebih dahulu.</p>
        <Link to="/masuk" style={{ background: '#0F2C59', color: '#fff', fontSize: 14, fontWeight: 700, padding: '12px 24px', borderRadius: 10 }}>
          Masuk
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#0F2C59', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 64px', borderBottom: '1px solid rgba(15,44,89,0.08)' }}>
        <Link to="/dashboard" className="link-hover" style={{ fontSize: 14, fontWeight: 600 }}>
          ← Kembali
        </Link>
        <div style={{ fontSize: 18, fontWeight: 800, marginLeft: 8 }}>
          <span style={{ color: '#0F2C59' }}>Siap</span>
          <span style={{ color: '#C9962E' }}>UKOM</span>
        </div>
      </div>

      <div style={{ flex: 1, padding: '56px 64px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 720 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 10px' }}>Materi Belajar</h1>
          <p style={{ fontSize: 15.5, color: 'rgba(15,44,89,0.65)', margin: '0 0 28px', maxWidth: '56ch' }}>
            Slide dan bahan bacaan tambahan dari tim SiapUKOM.
          </p>

          {error && (
            <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(192,57,43,0.1)', color: '#C0392B', fontSize: 13.5 }}>
              {error}
            </div>
          )}

          {loading && <p style={{ fontSize: 14, color: 'rgba(15,44,89,0.6)' }}>Memuat…</p>}

          {!loading && status && !status.isAksesPenuhActive && (
            <div>
              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: 10,
                  background: 'rgba(229,186,115,0.12)',
                  color: '#8A6A2E',
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                Materi Belajar adalah fitur Akses Penuh. Beli paket untuk membuka akses slide dan bahan bacaan.
              </div>
              <Link
                to="/upgrade"
                style={{ background: '#0F2C59', color: '#fff', fontSize: 15, fontWeight: 700, padding: '14px 28px', borderRadius: 10 }}
              >
                Upgrade ke Akses Penuh
              </Link>
            </div>
          )}

          {!loading && status?.isAksesPenuhActive && slides.length === 0 && (
            <p style={{ fontSize: 14, color: 'rgba(15,44,89,0.55)' }}>Belum ada materi yang diunggah.</p>
          )}

          {!loading && status?.isAksesPenuhActive && slides.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {slides.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    background: '#fff',
                    border: '1px solid rgba(15,44,89,0.1)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    boxShadow: '0 4px 14px rgba(15,44,89,0.05)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {s.kategori && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#8A6A2E',
                            background: 'rgba(229,186,115,0.18)',
                            padding: '3px 9px',
                            borderRadius: 999,
                          }}
                        >
                          {s.kategori}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'rgba(15,44,89,0.45)' }}>
                        {s.mimeType === 'application/pdf' ? 'PDF' : 'Gambar'} • {formatFileSize(s.fileSize)}
                      </span>
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{s.title}</div>
                  </div>
                  <button
                    onClick={() => openSlide(s)}
                    disabled={openingId === s.id}
                    style={{
                      background: '#0F2C59',
                      color: '#fff',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 700,
                      padding: '10px 18px',
                      borderRadius: 8,
                      cursor: openingId === s.id ? 'default' : 'pointer',
                      opacity: openingId === s.id ? 0.7 : 1,
                    }}
                  >
                    {openingId === s.id ? 'Membuka…' : 'Lihat'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
