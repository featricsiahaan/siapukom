import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ApiError } from '../api/client';

export function Akun() {
  const { token, user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setDone(false);
    if (!current) return setError('Password saat ini wajib diisi');
    if (next.length < 8) return setError('Password baru minimal 8 karakter');
    if (next !== confirm) return setError('Konfirmasi password baru tidak sama');
    if (!token) return;
    setSubmitting(true);
    try {
      await api.changePassword(token, current, next);
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengganti password.');
    } finally {
      setSubmitting(false);
    }
  };

  const input = { padding: '12px 14px', fontSize: 14.5, borderRadius: 10, border: '1px solid rgba(15,44,89,0.2)' } as const;
  const field = (label: string, value: string, set: (v: string) => void, autoComplete: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 700 }}>{label}</label>
      <input type="password" autoComplete={autoComplete} value={value} onChange={(e) => set(e.target.value)} style={input} />
    </div>
  );

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
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>Akun</h1>
        <p style={{ fontSize: 14, color: 'rgba(15,44,89,0.6)', margin: '0 0 28px' }}>
          {user?.nama} · {user?.email}
        </p>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px' }}>Ganti Password</h2>
        <form onSubmit={submit} noValidate>
          {field('Password saat ini', current, setCurrent, 'current-password')}
          {field('Password baru (minimal 8 karakter)', next, setNext, 'new-password')}
          {field('Ulangi password baru', confirm, setConfirm, 'new-password')}
          {error && <div style={{ fontSize: 12.5, color: '#C0392B', margin: '0 0 12px' }}>{error}</div>}
          {done && <div style={{ fontSize: 13, color: '#2E8B57', fontWeight: 700, margin: '0 0 12px' }}>Password berhasil diganti.</div>}
          <button
            type="submit"
            disabled={submitting}
            style={{ width: '100%', background: '#0F2C59', color: '#fff', fontSize: 15, fontWeight: 700, padding: 14, borderRadius: 10, border: 'none', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Memproses…' : 'Simpan Password Baru'}
          </button>
        </form>
      </div>
    </div>
  );
}
