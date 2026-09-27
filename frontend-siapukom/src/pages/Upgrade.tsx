import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { ManualTransferInfo, PackageType, PaymentStatusValue } from '../api/types';

type Screen = 'idle' | 'loading' | 'waiting' | 'manual-waiting' | 'success' | 'expired' | 'error';
type PayMethod = 'DOKU' | 'MANUAL';

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
  const [payMethod, setPayMethod] = useState<PayMethod>('DOKU');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [amount, setAmount] = useState(PACKAGES[1].amount);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [manualOrderId, setManualOrderId] = useState<string | null>(null);
  const [manualStatus, setManualStatus] = useState<PaymentStatusValue>('PENDING');
  const [transferInfo, setTransferInfo] = useState<ManualTransferInfo | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  useEffect(() => {
    if ((screen !== 'waiting' && screen !== 'manual-waiting') || !expiresAt) return;
    if (screen === 'manual-waiting' && manualStatus === 'WAITING_CONFIRMATION') return;
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
  }, [screen, expiresAt, manualStatus]);

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
    } else if (status === 'WAITING_CONFIRMATION') {
      setManualStatus(status);
    }
  };

  const startPolling = (orderId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const statusRes = await api.getPaymentStatus(token!, orderId);
        applyStatus(statusRes.status);
      } catch {
        // gangguan jaringan sesaat, coba lagi di polling berikutnya
      }
    }, POLL_INTERVAL_MS);
  };

  const startPayment = async () => {
    if (!token) return;
    setErrorMessage('');
    setScreen('loading');
    try {
      if (payMethod === 'MANUAL') {
        const res = await api.createManualPayment(token, packageType);
        setManualOrderId(res.orderId);
        setManualStatus(res.status);
        setTransferInfo(res.transferInfo);
        setAmount(res.amount);
        setExpiresAt(res.expiresAt);
        setScreen('manual-waiting');
        startPolling(res.orderId);
        return;
      }

      const res = await api.createPayment(token, packageType);
      setPaymentUrl(res.paymentUrl);
      setAmount(res.amount);
      setExpiresAt(res.expiresAt);
      setScreen('waiting');
      if (res.paymentUrl) {
        window.open(res.paymentUrl, '_blank', 'noopener,noreferrer');
      }
      startPolling(res.orderId);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Gagal membuat pembayaran, coba lagi.');
      setScreen('error');
    }
  };

  const handleMarkPaid = async () => {
    if (!token || !manualOrderId) return;
    setMarkingPaid(true);
    try {
      const res = await api.markPaymentPaid(token, manualOrderId);
      setManualStatus(res.status as PaymentStatusValue);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Gagal mengonfirmasi, coba lagi.');
    } finally {
      setMarkingPaid(false);
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
                  {payMethod === 'MANUAL' ? 'Buat Pesanan' : 'Bayar Sekarang'}
                </button>
                <button
                  onClick={() => setPayMethod(payMethod === 'MANUAL' ? 'DOKU' : 'MANUAL')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(15,44,89,0.55)',
                    fontSize: 12.5,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    marginTop: 14,
                  }}
                >
                  {payMethod === 'MANUAL'
                    ? 'Kembali ke pembayaran Virtual Account'
                    : 'Kesulitan bayar via Virtual Account? Transfer manual (BCA/GoPay)'}
                </button>
              </>
            )}

            {screen === 'loading' && (
              <p style={{ fontSize: 14.5, color: 'rgba(15,44,89,0.65)', margin: 0 }}>Menyiapkan pembayaran…</p>
            )}

            {screen === 'waiting' && (
              <>
                <div style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>{formatRupiah(amount)}</div>
                <p style={{ fontSize: 13, color: 'rgba(15,44,89,0.6)', margin: '0 0 20px' }}>
                  Tab baru sudah terbuka untuk menyelesaikan pembayaran (Virtual Account) di halaman DOKU. Kalau
                  tidak terbuka otomatis, klik tombol di bawah.
                </p>
                {paymentUrl && (
                  <a
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      background: '#0F2C59',
                      color: '#fff',
                      fontSize: 14.5,
                      fontWeight: 700,
                      padding: '13px 24px',
                      borderRadius: 10,
                      marginBottom: 20,
                    }}
                  >
                    Buka Halaman Pembayaran
                  </a>
                )}
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

            {screen === 'manual-waiting' && transferInfo && (
              <>
                <div style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>{formatRupiah(amount)}</div>

                {manualStatus === 'PENDING' ? (
                  <>
                    <div
                      style={{
                        background: '#F7F8FA',
                        borderRadius: 10,
                        padding: 16,
                        textAlign: 'left',
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(15,44,89,0.5)', marginBottom: 6 }}>
                        TRANSFER BANK
                      </div>
                      <div style={{ fontSize: 14, marginBottom: 2 }}>
                        {transferInfo.bank.bankName} — <strong>{transferInfo.bank.accountNumber}</strong>
                      </div>
                      <div style={{ fontSize: 13, color: 'rgba(15,44,89,0.6)' }}>
                        a.n. {transferInfo.bank.accountHolder}
                      </div>
                    </div>
                    <div
                      style={{
                        background: '#F7F8FA',
                        borderRadius: 10,
                        padding: 16,
                        textAlign: 'left',
                        marginBottom: 20,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(15,44,89,0.5)', marginBottom: 6 }}>
                        ATAU GOPAY
                      </div>
                      <div style={{ fontSize: 14 }}>{transferInfo.gopay.phoneNumber}</div>
                    </div>
                    <p style={{ fontSize: 12.5, color: 'rgba(15,44,89,0.6)', margin: '0 0 20px' }}>
                      Transfer/kirim tepat sesuai nominal di atas, lalu klik tombol di bawah ini setelah selesai.
                    </p>
                    <button
                      onClick={handleMarkPaid}
                      disabled={markingPaid}
                      style={{
                        width: '100%',
                        background: '#0F2C59',
                        color: '#fff',
                        fontSize: 15,
                        fontWeight: 700,
                        padding: 14,
                        borderRadius: 10,
                        border: 'none',
                        cursor: markingPaid ? 'default' : 'pointer',
                        opacity: markingPaid ? 0.7 : 1,
                        marginBottom: 12,
                      }}
                    >
                      {markingPaid ? 'Memproses…' : 'Saya Sudah Transfer'}
                    </button>
                    <div
                      style={{
                        display: 'inline-block',
                        fontSize: 13,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: 'rgba(15,44,89,0.6)',
                      }}
                    >
                      Batas waktu: {formatCountdown(secondsLeft)}
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        background: 'rgba(229,186,115,0.12)',
                        color: '#8A6420',
                        padding: '16px 18px',
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        marginBottom: 16,
                      }}
                    >
                      Terima kasih! Konfirmasi pembayaran Anda sedang diverifikasi admin (maksimal 1x24 jam).
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(15,44,89,0.45)', margin: 0 }}>
                      Halaman ini akan otomatis memperbarui status setelah dikonfirmasi.
                    </p>
                  </>
                )}
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
                  {screen === 'expired' ? 'Batas waktu pembayaran sudah habis.' : errorMessage || 'Terjadi kesalahan.'}
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
