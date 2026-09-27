import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { AdminPaymentItem } from '../api/types';

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export function AdminPayments() {
  const { token, user } = useAuth();
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.listAdminPayments(token);
      setPayments(res.payments);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Gagal memuat daftar pembayaran.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleConfirm = async (orderId: string) => {
    if (!token) return;
    setBusyOrderId(orderId);
    try {
      await api.confirmAdminPayment(token, orderId);
      setPayments((prev) => prev.filter((p) => p.orderId !== orderId));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Gagal mengonfirmasi pembayaran.');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleReject = async (orderId: string) => {
    if (!token) return;
    if (!window.confirm('Tolak pembayaran ini? User perlu mengulang dari awal.')) return;
    setBusyOrderId(orderId);
    try {
      await api.rejectAdminPayment(token, orderId);
      setPayments((prev) => prev.filter((p) => p.orderId !== orderId));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Gagal menolak pembayaran.');
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#0F2C59' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '22px 64px', borderBottom: '1px solid rgba(15,44,89,0.08)' }}>
        <Link to="/dashboard" className="link-hover" style={{ fontSize: 14, fontWeight: 600 }}>
          ← Kembali
        </Link>
        <div style={{ fontSize: 18, fontWeight: 800, marginLeft: 8 }}>
          <span style={{ color: '#0F2C59' }}>Siap</span>
          <span style={{ color: '#C9962E' }}>UKOM</span>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Konfirmasi Pembayaran Manual</h1>
          <button
            onClick={load}
            style={{
              background: 'none',
              border: '1px solid rgba(15,44,89,0.2)',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              color: '#0F2C59',
            }}
          >
            Muat Ulang
          </button>
        </div>

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
          <p style={{ color: 'rgba(15,44,89,0.6)' }}>Memuat…</p>
        ) : payments.length === 0 ? (
          <p style={{ color: 'rgba(15,44,89,0.6)' }}>Tidak ada pembayaran yang menunggu konfirmasi.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {payments.map((p) => (
              <div
                key={p.orderId}
                style={{
                  border: '1px solid rgba(15,44,89,0.12)',
                  borderRadius: 12,
                  padding: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.nama}</div>
                  <div style={{ fontSize: 13, color: 'rgba(15,44,89,0.6)' }}>{p.email}</div>
                  <div style={{ fontSize: 12, color: 'rgba(15,44,89,0.45)', marginTop: 4 }}>
                    {p.orderId} · {formatDateTime(p.createdAt)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{formatRupiah(p.amount)}</div>
                  <div style={{ fontSize: 12, color: 'rgba(15,44,89,0.5)' }}>{p.durationDays} hari</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleConfirm(p.orderId)}
                    disabled={busyOrderId === p.orderId}
                    style={{
                      background: '#2E8B57',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 16px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: busyOrderId === p.orderId ? 'default' : 'pointer',
                      opacity: busyOrderId === p.orderId ? 0.6 : 1,
                    }}
                  >
                    Konfirmasi
                  </button>
                  <button
                    onClick={() => handleReject(p.orderId)}
                    disabled={busyOrderId === p.orderId}
                    style={{
                      background: 'none',
                      color: '#C0392B',
                      border: '1px solid rgba(192,57,43,0.3)',
                      borderRadius: 8,
                      padding: '10px 16px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: busyOrderId === p.orderId ? 'default' : 'pointer',
                      opacity: busyOrderId === p.orderId ? 0.6 : 1,
                    }}
                  >
                    Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
