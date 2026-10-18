import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { SimulasiRiwayat } from '../api/types';
import { ikonSkor } from '../utils/ikonKategori';

const WARNA: Record<string, string> = { Siap: '#2E8B57', Cukup: '#B8860B', 'Perlu Latihan': '#C0392B' };
const tgl = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export function Riwayat() {
  const { token } = useAuth();
  const [data, setData] = useState<SimulasiRiwayat | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api
      .getSimulasiRiwayat(token)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat riwayat.'));
  }, [token]);

  const card = { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 6px 20px rgba(15,44,89,0.06)' } as const;
  const list = data ? [...data.sessions].reverse() : [];
  const W = 600;
  const H = 180;
  const pts = data
    ? data.sessions.map((s, i) => ({
        x: data.sessions.length === 1 ? W / 2 : 30 + (i * (W - 60)) / (data.sessions.length - 1),
        y: 10 + ((100 - s.score) / 100) * (H - 30),
        s,
      }))
    : [];

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

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Riwayat Simulasi</h1>
        {error && <div style={{ color: '#C0392B', fontSize: 14 }}>{error}</div>}
        {!data && !error && <div style={{ fontSize: 14, color: 'rgba(15,44,89,0.6)' }}>Memuat…</div>}

        {data && data.total === 0 && (
          <div style={{ ...card, textAlign: 'center', fontSize: 14.5, color: 'rgba(15,44,89,0.7)' }}>
            Belum ada simulasi yang selesai. Kerjakan satu simulasi untuk mulai mencatat rekor pribadimu.
            <div style={{ marginTop: 16 }}>
              <Link to="/simulasi" style={{ background: '#0F2C59', color: '#fff', padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
                Mulai Simulasi
              </Link>
            </div>
          </div>
        )}

        {data && data.best && (
          <>
            <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 24, border: '2px solid #C9962E' }}>
              <img src={ikonSkor(data.best.level, data.jenisKelamin)} alt="" width={110} height={110} style={{ objectFit: 'contain', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', color: '#C9962E' }}>REKOR PRIBADI</div>
                <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1 }}>
                  {data.best.score}
                  <span style={{ fontSize: 16, color: 'rgba(15,44,89,0.5)' }}> / 100</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: WARNA[data.best.level] }}>{data.best.level}</div>
                <div style={{ fontSize: 12.5, color: 'rgba(15,44,89,0.55)', marginTop: 2 }}>{tgl(data.best.finishedAt)}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 13, color: 'rgba(15,44,89,0.65)' }}>
                <div>
                  <b style={{ fontSize: 20, color: '#0F2C59' }}>{data.total}</b> simulasi
                </div>
                <div>
                  rata-rata <b style={{ color: '#0F2C59' }}>{data.average}</b>
                </div>
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Tren {data.sessions.length} simulasi terakhir</div>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
                {[60, 80].map((v) => {
                  const y = 10 + ((100 - v) / 100) * (H - 30);
                  return (
                    <g key={v}>
                      <line x1={30} x2={W - 30} y1={y} y2={y} stroke="rgba(15,44,89,0.15)" strokeDasharray="4 4" />
                      <text x={4} y={y + 4} fontSize={10} fill="rgba(15,44,89,0.5)">
                        {v}
                      </text>
                    </g>
                  );
                })}
                <polyline fill="none" stroke="#0F2C59" strokeWidth={2.5} points={pts.map((p) => `${p.x},${p.y}`).join(' ')} />
                {pts.map((p) => (
                  <circle
                    key={p.s.id}
                    cx={p.x}
                    cy={p.y}
                    r={p.s.id === data.best!.id ? 7 : 4.5}
                    fill={p.s.id === data.best!.id ? '#C9962E' : WARNA[p.s.level]}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </svg>
            </div>

            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Riwayat</div>
              {list.map((s, i) => {
                const sebelumnya = list[i + 1];
                const selisih = sebelumnya ? s.score - sebelumnya.score : null;
                const rekor = s.id === data.best!.id;
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: i ? '1px solid rgba(15,44,89,0.08)' : 'none' }}>
                    <div style={{ width: 54, fontSize: 24, fontWeight: 800, color: WARNA[s.level] }}>{s.score}</div>
                    <div style={{ flex: 1, fontSize: 13.5 }}>
                      <div style={{ fontWeight: 700 }}>
                        {s.level}
                        {rekor && (
                          <span style={{ marginLeft: 8, fontSize: 11, background: 'rgba(201,150,46,0.18)', color: '#9A7020', padding: '2px 8px', borderRadius: 99 }}>
                            Rekor
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'rgba(15,44,89,0.55)', fontSize: 12.5 }}>
                        {tgl(s.finishedAt)} · {s.correctCount}/{s.totalQuestions} benar · {s.durationMinutes} menit
                      </div>
                    </div>
                    {selisih !== null && (
                      <div style={{ fontSize: 13, fontWeight: 700, color: selisih > 0 ? '#2E8B57' : selisih < 0 ? '#C0392B' : 'rgba(15,44,89,0.5)' }}>
                        {selisih > 0 ? '▲' : selisih < 0 ? '▼' : '='} {Math.abs(selisih)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
