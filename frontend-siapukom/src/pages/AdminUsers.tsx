import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { AdminUserItem } from '../api/types';

interface Reset {
  email: string;
  nama: string;
  temporaryPassword: string;
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-';
}

export function AdminUsers() {
  const { token, user } = useAuth();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<AdminUserItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [reset, setReset] = useState<Reset | null>(null);
  const [copied, setCopied] = useState(false);

  if (!user || user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  const search = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError('');
    setReset(null);
    if (q.trim().length < 3) {
      setError('Ketik minimal 3 huruf nama atau email.');
      return;
    }
    setLoading(true);
    try {
      setResults((await api.searchAdminUsers(token, q.trim())).users);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mencari pengguna.');
    } finally {
      setLoading(false);
    }
  };

  const doReset = async (u: AdminUserItem) => {
    if (!token) return;
    if (!window.confirm(`Atur ulang kata sandi ${u.email}? Kata sandi lama tidak berlaku lagi.`)) return;
    setBusyId(u.id);
    setError('');
    setCopied(false);
    try {
      setReset(await api.resetUserPassword(token, u.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengatur ulang kata sandi.');
    } finally {
      setBusyId(null);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
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

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px' }}>Pengguna</h1>
        <p style={{ fontSize: 13.5, color: 'rgba(15,44,89,0.6)', margin: '0 0 20px' }}>
          Cari peserta, lalu atur ulang kata sandi bila mereka lupa. Kata sandi sementara hanya tampil sekali dan perlu Anda sampaikan
          sendiri (mis. lewat WhatsApp). Minta peserta menggantinya di menu Akun setelah masuk.
        </p>

        <form onSubmit={search} style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nama atau email peserta"
            style={{ flex: 1, padding: '12px 14px', fontSize: 14.5, borderRadius: 10, border: '1px solid rgba(15,44,89,0.2)' }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ background: '#0F2C59', color: '#fff', border: 'none', borderRadius: 10, padding: '0 22px', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Mencari…' : 'Cari'}
          </button>
        </form>

        {error && (
          <div style={{ background: 'rgba(192,57,43,0.08)', color: '#C0392B', padding: '12px 16px', borderRadius: 10, fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {reset && (
          <div style={{ background: 'rgba(229,186,115,0.16)', border: '1px solid rgba(201,150,46,0.4)', borderRadius: 12, padding: 18, marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              Kata sandi sementara untuk {reset.nama} ({reset.email})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <code style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.04em', background: '#fff', padding: '8px 14px', borderRadius: 8 }}>
                {reset.temporaryPassword}
              </code>
              <button
                onClick={() => copy(reset.temporaryPassword)}
                style={{ background: '#0F2C59', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}
              >
                {copied ? 'Tersalin' : 'Salin'}
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(15,44,89,0.6)', margin: '10px 0 0' }}>
              Tampil sekali saja. Bila hilang, atur ulang lagi.
            </p>
          </div>
        )}

        {results && results.length === 0 && <p style={{ color: 'rgba(15,44,89,0.6)' }}>Tidak ada pengguna yang cocok.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {results?.map((u) => (
            <div
              key={u.id}
              style={{ border: '1px solid rgba(15,44,89,0.12)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{u.nama}</div>
                <div style={{ fontSize: 13, color: 'rgba(15,44,89,0.6)' }}>{u.email}</div>
                <div style={{ fontSize: 12, color: 'rgba(15,44,89,0.45)', marginTop: 4 }}>
                  {u.role === 'ADMIN' ? 'Admin' : u.plan} · aktif hingga {formatDate(u.expiryDate)} · daftar {formatDate(u.createdAt)}
                </div>
              </div>
              {u.role === 'PESERTA' ? (
                <button
                  onClick={() => doReset(u)}
                  disabled={busyId === u.id}
                  style={{ background: 'none', color: '#0F2C59', border: '1px solid rgba(15,44,89,0.3)', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer', opacity: busyId === u.id ? 0.6 : 1 }}
                >
                  Atur Ulang Kata Sandi
                </button>
              ) : (
                <span style={{ fontSize: 12, color: 'rgba(15,44,89,0.45)' }}>Akun admin tidak dapat diatur ulang di sini</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
