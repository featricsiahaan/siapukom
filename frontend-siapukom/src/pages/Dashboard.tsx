import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { DashboardResponse } from '../api/types';

export function Dashboard() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api
      .getDashboard(token)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat dashboard.'));
  }, [token]);

  const onLogout = () => {
    logout();
    navigate('/masuk');
  };

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C0392B' }}>
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(15,44,89,0.6)' }}>
        Memuat dashboard…
      </div>
    );
  }

  const circumference = 2 * Math.PI * 60;
  const filled = (data.readiness.score / 100) * circumference;
  const isAksesPenuhActive =
    data.membership?.plan === 'Akses Penuh' &&
    !!data.membership.expiry &&
    new Date(data.membership.expiry) > new Date();

  return (
    <div style={{ minHeight: '100vh', background: '#F6F8FC', color: '#0F2C59' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 64px',
          background: '#fff',
          borderBottom: '1px solid rgba(15,44,89,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            <span style={{ color: '#0F2C59' }}>Siap</span>
            <span style={{ color: '#C9962E' }}>UKOM</span>
          </div>
          <div style={{ display: 'flex', gap: 28, fontSize: 14, fontWeight: 600 }}>
            <span style={{ color: '#0F2C59' }}>Dashboard</span>
            <Link to="/latihan" className="link-hover">
              Latihan
            </Link>
            <Link to="/simulasi" className="link-hover">
              Simulasi
            </Link>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#0F2C59',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {data.initial}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{data.nama}</div>
          </div>
          <button
            onClick={onLogout}
            className="link-hover"
            style={{ fontSize: 13, fontWeight: 600, color: 'rgba(15,44,89,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Keluar
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '44px 24px 72px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 6px' }}>Halo, {data.nama} 👋</h1>
        <p style={{ fontSize: 14.5, color: 'rgba(15,44,89,0.6)', margin: '0 0 32px' }}>
          Berikut ringkasan kesiapan dan status membermu.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr', gap: 24, marginBottom: 36 }}>
          <div
            style={{
              background: '#0F2C59',
              borderRadius: 18,
              padding: 30,
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              boxShadow: '0 10px 28px rgba(15,44,89,0.18)',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#E5BA73', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Status Membership
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{data.membership?.plan ?? 'Gratis'}</div>
              <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
                {data.membership?.expiry
                  ? `${isAksesPenuhActive ? 'Berlaku hingga' : 'Kedaluwarsa pada'} ${new Date(data.membership.expiry).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : 'Belum ada masa berlaku aktif'}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, opacity: 0.8, marginBottom: 6 }}>
                <span>Sesi latihan terpakai</span>
                <span>
                  {data.membership?.sessionsUsed ?? 0}/{data.membership?.sessionsTotal ?? 0}
                </span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.18)', borderRadius: 99, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    background: '#E5BA73',
                    borderRadius: 99,
                    width: data.membership?.sessionsPercent ?? '0%',
                  }}
                />
              </div>
            </div>
            {isAksesPenuhActive ? (
              <div
                style={{
                  marginTop: 'auto',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.12)',
                  color: '#E5BA73',
                  fontSize: 13.5,
                  fontWeight: 700,
                  padding: '11px 18px',
                  borderRadius: 10,
                }}
              >
                ✓ Akses Penuh Aktif
              </div>
            ) : (
              <Link
                to="/upgrade"
                style={{
                  marginTop: 'auto',
                  textAlign: 'center',
                  background: '#E5BA73',
                  color: '#0F2C59',
                  fontSize: 13.5,
                  fontWeight: 700,
                  padding: '11px 18px',
                  borderRadius: 10,
                }}
              >
                {data.membership?.plan === 'Akses Penuh' ? 'Perpanjang Akses Penuh' : 'Upgrade ke Akses Penuh'}
              </Link>
            )}
          </div>

          <div
            style={{
              background: '#fff',
              borderRadius: 18,
              padding: 30,
              display: 'flex',
              gap: 32,
              alignItems: 'center',
              boxShadow: '0 6px 20px rgba(15,44,89,0.06)',
            }}
          >
            <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
              <svg width={140} height={140} viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={70} cy={70} r={60} fill="none" stroke="#EEF1F7" strokeWidth={14} />
                <circle
                  cx={70}
                  cy={70}
                  r={60}
                  fill="none"
                  stroke={data.readiness.color}
                  strokeWidth={14}
                  strokeLinecap="round"
                  strokeDasharray={`${filled} ${circumference}`}
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: 30, fontWeight: 800 }}>{data.readiness.score}</div>
                <div style={{ fontSize: 11, color: 'rgba(15,44,89,0.5)', fontWeight: 600 }}>/ 100</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'rgba(15,44,89,0.5)',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Skor Kesiapan
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: data.readiness.color, marginBottom: 6 }}>
                {data.readiness.label}
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(15,44,89,0.6)', margin: 0 }}>
                {data.readiness.hasData
                  ? 'Skor gabungan dari 5 sesi latihan terakhir. Perkuat kategori yang masih merah untuk menaikkan skor.'
                  : 'Belum ada riwayat latihan. Selesaikan sesi latihan untuk melihat skor kesiapanmu di sini.'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>Evaluasi Kesiapan per Kategori</h2>
          <span style={{ fontSize: 12.5, color: 'rgba(15,44,89,0.45)' }}>Berdasarkan 5 sesi latihan terakhir</span>
        </div>

        {data.categories.length === 0 ? (
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              padding: 32,
              textAlign: 'center',
              color: 'rgba(15,44,89,0.55)',
              fontSize: 14,
            }}
          >
            Belum ada data latihan.{' '}
            <Link to="/latihan" className="link-hover" style={{ fontWeight: 700, color: '#0F2C59' }}>
              Mulai latihan pertamamu
            </Link>
            .
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            {data.categories.map((cat) => (
              <div
                key={cat.name}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 22,
                  boxShadow: '0 4px 14px rgba(15,44,89,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{cat.name}</div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 9px',
                      borderRadius: 99,
                      background: cat.badgeBg,
                      color: cat.badgeText,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat.level}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 800 }}>{cat.score}</span>
                  <span style={{ fontSize: 12, color: 'rgba(15,44,89,0.45)' }}>/100</span>
                </div>
                <div style={{ height: 7, background: '#EEF1F7', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: cat.badgeText, width: cat.scorePercent }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 11.5, color: 'rgba(15,44,89,0.4)', margin: '28px 0 0' }}>
          Skor & status membership dihitung dari data akunmu di server SiapUKOM.
        </p>
      </div>
    </div>
  );
}
