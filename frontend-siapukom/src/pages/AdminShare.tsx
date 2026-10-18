import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { AdminShareClaim } from '../api/types';

const tgl = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export function AdminShare() {
  const { token, user } = useAuth();
  const [claims, setClaims] = useState<AdminShareClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [dipilih, setDipilih] = useState<Set<string>>(new Set());
  const [massal, setMassal] = useState(false);
  const [besar, setBesar] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .listShareClaims(token)
      .then((r) => setClaims(r.claims))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat klaim.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (!user || user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  const decide = async (c: AdminShareClaim, action: 'approve' | 'reject') => {
    if (!token) return;
    setBusy(c.id);
    try {
      await api.decideShareClaim(token, c.id, action);
      setClaims((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memproses klaim.');
    } finally {
      setBusy(null);
    }
  };

  const toggle = (id: string) =>
    setDipilih((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setujuiTerpilih = async () => {
    if (!token || dipilih.size === 0) return;
    if (!window.confirm(`Setujui ${dipilih.size} klaim terpilih? Masa berlaku masing-masing bertambah.`)) return;
    setMassal(true);
    setError('');
    let gagal = 0;
    const selesai = new Set<string>();
    for (const id of dipilih) {
      try {
        await api.decideShareClaim(token, id, 'approve');
        selesai.add(id);
      } catch {
        gagal += 1;
      }
    }
    setClaims((prev) => prev.filter((x) => !selesai.has(x.id)));
    setDipilih(new Set());
    if (gagal) setError(`${gagal} klaim gagal diproses. Muat ulang halaman lalu coba lagi.`);
    setMassal(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F6F8FC', color: '#0F2C59' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '22px 64px', background: '#fff', borderBottom: '1px solid rgba(15,44,89,0.08)' }}>
        <Link to="/dashboard" className="link-hover" style={{ fontSize: 14, fontWeight: 600 }}>
          ← Kembali
        </Link>
        <div style={{ fontSize: 18, fontWeight: 800, marginLeft: 8 }}>
          <span>Siap</span>
          <span style={{ color: '#C9962E' }}>UKOM</span>
        </div>
      </div>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px' }}>Verifikasi Share</h1>
        <p style={{ fontSize: 14, color: 'rgba(15,44,89,0.6)', margin: '0 0 24px' }}>
          Periksa bukti share peserta. Jika disetujui, masa berlaku otomatis bertambah.
        </p>
        {claims.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={dipilih.size === claims.length}
                onChange={(e) => setDipilih(e.target.checked ? new Set(claims.map((c) => c.id)) : new Set())}
              />
              Pilih semua ({claims.length})
            </label>
            <button
              disabled={massal || dipilih.size === 0}
              onClick={setujuiTerpilih}
              style={{ background: dipilih.size ? '#2E8B57' : 'rgba(15,44,89,0.2)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: dipilih.size ? 'pointer' : 'default' }}
            >
              {massal ? 'Memproses…' : `Setujui terpilih (${dipilih.size})`}
            </button>
          </div>
        )}
        {besar && (
          <div
            onClick={() => setBesar(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, cursor: 'zoom-out' }}
          >
            <img src={besar} alt="Screenshot" style={{ maxWidth: '92vw', maxHeight: '92vh', borderRadius: 8 }} />
          </div>
        )}
        {error && <div style={{ color: '#C0392B', fontSize: 14, marginBottom: 12 }}>{error}</div>}
        {loading && <div style={{ fontSize: 14 }}>Memuat…</div>}
        {!loading && claims.length === 0 && <div style={{ fontSize: 14, color: 'rgba(15,44,89,0.6)' }}>Tidak ada klaim yang menunggu.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {claims.map((c) => (
            <div key={c.id} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 4px 14px rgba(15,44,89,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <input type="checkbox" checked={dipilih.has(c.id)} onChange={() => toggle(c.id)} style={{ marginTop: 4 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800 }}>{c.nama}</div>
                  <div style={{ fontSize: 13, color: 'rgba(15,44,89,0.6)' }}>{c.email}</div>
                </div>
                <div style={{ fontSize: 12.5, color: 'rgba(15,44,89,0.55)', textAlign: 'right' }}>
                  <div>Diajukan {tgl(c.createdAt)}</div>
                  <div>Aktif hingga {c.expiryDate ? tgl(c.expiryDate) : '-'}</div>
                </div>
              </div>
              <div style={{ fontSize: 13.5, margin: '10px 0' }}>
                Instagram:{' '}
                {c.instagram ? (
                  <a href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: '#C9962E' }}>
                    @{c.instagram}
                  </a>
                ) : (
                  '-'
                )}
                <span style={{ color: 'rgba(15,44,89,0.55)' }}> · cek apakah sudah follow @siapukom</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {c.screenshots.map((s, i) => (
                  <img
                    key={i}
                    src={s}
                    alt={`Screenshot ${i + 1}`}
                    onClick={() => setBesar(s)}
                    style={{ width: 86, height: 86, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(15,44,89,0.15)', cursor: 'zoom-in' }}
                  />
                ))}
                <span style={{ fontSize: 12.5, color: 'rgba(15,44,89,0.55)', alignSelf: 'center' }}>{c.screenshots.length}/5 screenshot</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  disabled={busy === c.id}
                  onClick={() => decide(c, 'approve')}
                  style={{ background: '#2E8B57', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Setujui (+{c.bonusDays} hari)
                </button>
                <button
                  disabled={busy === c.id}
                  onClick={() => decide(c, 'reject')}
                  style={{ background: '#fff', color: '#C0392B', border: '1px solid rgba(192,57,43,0.4)', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Tolak
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
