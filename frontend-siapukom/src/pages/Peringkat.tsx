import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { LeaderboardEntry } from '../api/types';

export function Peringkat() {
  const { token } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    api
      .getLeaderboard(token)
      .then((res) => {
        setLeaderboard(res.leaderboard);
        setMe(res.me);
      })
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : 'Gagal memuat peringkat.'))
      .finally(() => setLoading(false));
  }, [token]);

  const medalFor = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null);

  return (
    <div style={{ minHeight: '100vh', background: '#F6F8FC', color: '#0F2C59' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '22px 64px',
          background: '#fff',
          borderBottom: '1px solid rgba(15,44,89,0.08)',
        }}
      >
        <Link to="/dashboard" className="link-hover" style={{ fontSize: 14, fontWeight: 600 }}>
          ← Kembali
        </Link>
        <div style={{ fontSize: 18, fontWeight: 800, marginLeft: 8 }}>
          <span style={{ color: '#0F2C59' }}>Siap</span>
          <span style={{ color: '#C9962E' }}>UKOM</span>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px', textAlign: 'center' }}>
          Peringkat Simulasi Ujian
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(15,44,89,0.6)', margin: '0 0 28px', textAlign: 'center' }}>
          Berdasarkan skor Simulasi Ujian terbaik dari setiap peserta.
        </p>

        {errorMessage && (
          <div
            style={{
              background: 'rgba(192,57,43,0.08)',
              color: '#C0392B',
              padding: '12px 16px',
              borderRadius: 10,
              fontSize: 14,
              marginBottom: 20,
            }}
          >
            {errorMessage}
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(15,44,89,0.6)' }}>Memuat…</p>
        ) : leaderboard.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(15,44,89,0.6)' }}>
            Belum ada yang menyelesaikan Simulasi Ujian. Jadilah yang pertama!
          </p>
        ) : (
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 8px 28px rgba(15,44,89,0.08)',
              overflow: 'hidden',
            }}
          >
            {leaderboard.map((entry, i) => (
              <div
                key={entry.rank}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '14px 24px',
                  borderBottom: i === leaderboard.length - 1 ? 'none' : '1px solid rgba(15,44,89,0.06)',
                }}
              >
                <div style={{ width: 32, fontSize: 15, fontWeight: 800, textAlign: 'center' }}>
                  {medalFor(entry.rank) ?? entry.rank}
                </div>
                <div style={{ flex: 1, fontSize: 14.5, fontWeight: 600 }}>{entry.nama}</div>
                <div style={{ fontSize: 13, color: 'rgba(15,44,89,0.5)' }}>
                  {entry.correctCount}/{entry.totalQuestions}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F2C59', minWidth: 48, textAlign: 'right' }}>
                  {entry.score}%
                </div>
              </div>
            ))}
          </div>
        )}

        {me && me.rank > leaderboard.length && (
          <div
            style={{
              marginTop: 16,
              background: 'rgba(15,44,89,0.04)',
              border: '2px solid #0F2C59',
              borderRadius: 12,
              padding: '14px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div style={{ width: 32, fontSize: 15, fontWeight: 800, textAlign: 'center' }}>{me.rank}</div>
            <div style={{ flex: 1, fontSize: 14.5, fontWeight: 700 }}>Anda</div>
            <div style={{ fontSize: 13, color: 'rgba(15,44,89,0.5)' }}>
              {me.correctCount}/{me.totalQuestions}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F2C59', minWidth: 48, textAlign: 'right' }}>
              {me.score}%
            </div>
          </div>
        )}

        {!me && !loading && leaderboard.length > 0 && (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(15,44,89,0.5)', marginTop: 16 }}>
            Selesaikan Simulasi Ujian untuk masuk ke papan peringkat.
          </p>
        )}
      </div>
    </div>
  );
}
