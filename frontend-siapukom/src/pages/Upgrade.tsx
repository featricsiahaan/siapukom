import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { PackageType, PaymentStatusValue } from '../api/types';

type Screen = 'idle' | 'loading' | 'qr' | 'success' | 'expired' | 'error';

const POLL_INTERVAL_MS = 3000;

const PACKAGES: { type: PackageType; label: string; amount: number }[] = [
  { type: '2_MINGGU', label: '2 Minggu', amount: 17000 },
  { type: '1_BULAN', label: '1 Bulan', amount: 30000 },
];

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
  const [packageType, setPackageType] = useState<PackageType>('1_BULAN');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [amount, setAmount] = useState(PACKAGES[1].amount);
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
      const res = await api.createPayment(token, packageType);
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
            Simulasi Ujian dan Latihan Kategori Khusus tanpa batas selama masa aktif. Akses Materi Belajar khusus paket 1 Bulan.
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
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E5BA73', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 16 }}>
                  Pilih Masa Aktif
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                  {PACKAGES.map((pkg) => {
                    const active = packageType === pkg.type;
                    return (
                      <button
                        key={pkg.type}
                        onClick={() => {
                          setPackageType(pkg.type);
                          setAmount(pkg.amount);
                        }}
                        style={{
                          flex: 1,
                          textAlign: 'left',
                          padding: '14px 16px',
                          borderRadius: 12,
                          border: `2px solid ${active ? '#0F2C59' : 'rgba(15,44,89,0.15)'}`,
                          background: active ? 'rgba(15,44,89,0.04)' : '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F2C59' }}>{pkg.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0F2C59', marginTop: 4 }}>
                          {formatRupiah(pkg.amount)}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: 12.5, color: 'rgba(15,44,89,0.5)', margin: '0 0 20px' }}>
                  {packageType === '1_BULAN'
                    ? 'Termasuk Simulasi, Latihan Kategori Khusus, dan Materi Belajar tanpa batas.'
                    : 'Termasuk Simulasi dan Latihan Kategori Khusus tanpa batas (tanpa akses Materi Belajar).'}
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
