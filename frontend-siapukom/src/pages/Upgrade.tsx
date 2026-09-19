import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { PaymentStatusValue } from '../api/types';

type Screen = 'idle' | 'loading' | 'qr' | 'success' | 'expired' | 'error';

const POLL_INTERVAL_MS = 3000;

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function Upgrade() {
  const { token } = useAuth();

  const [screen, setScreen] = useState<Screen>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [amount, setAmount] = useState(20000);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  useEffect(() => {
    if (screen !== 'qr' || !expiresAt) return;
    const tick = () => {
      const remaining = Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        setScreen('expired');
        stopPolling();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [screen, expiresAt]);

  const applyStatus = (status: PaymentStatusValue) => {
    if (status === 'SETTLEMENT') {
      setScreen('success');
      stopPolling();
    } else if (status === 'EXPIRE') {
      setScreen('expired');
      stopPolling();
    } else if (status === 'CANCEL' || status === 'DENY') {
      setErrorMessage('Pembayaran dibatalkan atau ditolak. Silakan coba lagi.');
      setScreen('error');
      stopPolling();
    }
  };

  const startPayment = async () => {
    if (!token) return;
    setErrorMessage('');
    setScreen('loading');
    try {
      const res = await api.createPayment(token);
      setQrUrl(res.qrUrl);
      setAmount(res.amount);
      setExpiresAt(res.expiresAt);
      setScreen('qr');

      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await api.getPaymentStatus(token, res.orderId);
          applyStatus(statusRes.status);
        } catch {
          // gangguan jaringan sesaat, coba lagi di polling berikutnya
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Gagal membuat pembayaran, coba lagi.');
      setScreen('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#0F2C59', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '22px 64px', borderBottom: '1px solid rgba(15,44,89,0.08)' }}>
        <Link to="/dashboard" className="link-hover" style={{ fontSize: 14, fontWeight: 600 }}>
          ← Kembali
        </Link>
        <div style={{ fontSize: 18, fontWeight: 800, marginLeft: 8 }}>
          <span style={{ color: '#0F2C59' }}>Siap</span>
          <span style={{ color: '#C9962E' }}>UKOM</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '56px 24px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 8px', textAlign: 'center' }}>
            Upgrade ke Akses Penuh
          </h1>
          <p style={{ fontSize: 14.5, color: 'rgba(15,44,89,0.65)', margin: '0 0 28px', textAlign: 'center' }}>
            Bank soal lengkap, simulasi tanpa batas, dan dashboard kesiapan penuh — aktif 30 hari, perpanjang manual saat masa aktif habis.
          </p>

          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 32,
              boxShadow: '0 8px 28px rgba(15,44,89,0.08)',
              textAlign: 'center',
            }}
          >
            {screen === 'idle' && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E5BA73', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Akses Penuh
                </div>
                <div style={{ fontSize: 34, fontWeight: 800, margin: '10px 0 4px' }}>
                  {formatRupiah(amount)} <span style={{ fontSize: 15, fontWeight: 600, opacity: 0.6 }}>/30 hari</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'rgba(15,44,89,0.5)', margin: '0 0 20px' }}>
                  Perpanjang manual saat masa aktif habis.
                </p>
                <button
                  onClick={startPayment}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    background: '#0F2C59',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    padding: 14,
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 10px 24px rgba(15,44,89,0.22)',
                  }}
                >
                  Bayar dengan QRIS
                </button>
              </>
            )}

            {screen === 'loading' && (
              <p style={{ fontSize: 14.5, color: 'rgba(15,44,89,0.65)', margin: 0 }}>Menyiapkan QRIS…</p>
            )}

            {screen === 'qr' && qrUrl && (
              <>
                <img
                  src={qrUrl}
                  alt="Kode QRIS pembayaran SiapUKOM"
                  style={{ width: 240, height: 240, borderRadius: 12, border: '1px solid rgba(15,44,89,0.12)' }}
                />
                <div style={{ fontSize: 20, fontWeight: 800, margin: '18px 0 4px' }}>{formatRupiah(amount)}</div>
                <p style={{ fontSize: 13, color: 'rgba(15,44,89,0.6)', margin: '0 0 16px' }}>
                  Scan dengan aplikasi e-wallet atau m-banking yang mendukung QRIS.
                </p>
                <div
                  style={{
                    display: 'inline-block',
                    fontSize: 14,
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: secondsLeft < 60 ? '#C0392B' : '#0F2C59',
                    background: secondsLeft < 60 ? 'rgba(192,57,43,0.1)' : '#EEF1F6',
                    padding: '8px 16px',
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  ⏱ Kedaluwarsa dalam {formatCountdown(secondsLeft)}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(15,44,89,0.45)', margin: 0 }}>
                  Halaman ini akan otomatis memperbarui status setelah pembayaran diterima.
                </p>
              </>
            )}

            {screen === 'success' && (
              <>
                <div
                  style={{
                    background: 'rgba(46,139,87,0.08)',
                    color: '#2E8B57',
                    padding: '16px 18px',
                    borderRadius: 10,
                    fontSize: 14.5,
                    fontWeight: 700,
                    marginBottom: 20,
                  }}
                >
                  Pembayaran berhasil! Akun Anda sekarang Akses Penuh.
                </div>
                <Link
                  to="/dashboard"
                  style={{ background: '#0F2C59', color: '#fff', fontSize: 15, fontWeight: 700, padding: '14px 28px', borderRadius: 10 }}
                >
                  Lihat Dashboard
                </Link>
              </>
            )}

            {(screen === 'expired' || screen === 'error') && (
              <>
                <div
                  style={{
                    background: 'rgba(192,57,43,0.08)',
                    color: '#C0392B',
                    padding: '16px 18px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 20,
                  }}
                >
                  {screen === 'expired' ? 'Kode QRIS sudah kedaluwarsa.' : errorMessage || 'Terjadi kesalahan.'}
                </div>
                <button
                  onClick={startPayment}
                  style={{
                    background: '#0F2C59',
                    color: '#fff',
                    border: 'none',
                    fontSize: 14.5,
                    fontWeight: 700,
                    padding: '12px 24px',
                    borderRadius: 10,
                    cursor: 'pointer',
                  }}
                >
                  Coba Lagi
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
