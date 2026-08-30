import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

export function Masuk() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorEmail, setErrorEmail] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [errorGeneral, setErrorGeneral] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const inputBase: CSSProperties = {
    padding: '12px 14px',
    fontSize: 14.5,
    borderRadius: 10,
    border: '1px solid',
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrorEmail = email.trim() ? '' : 'Email wajib diisi';
    const nextErrorPassword = !password
      ? 'Password wajib diisi'
      : password.length < 4
        ? 'Password minimal 4 karakter'
        : '';

    setErrorEmail(nextErrorEmail);
    setErrorPassword(nextErrorPassword);
    setErrorGeneral('');

    if (nextErrorEmail || nextErrorPassword) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      setShowSuccess(true);
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      setErrorGeneral(err instanceof ApiError ? err.message : 'Gagal menghubungi server.');
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        color: '#0F2C59',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '22px 64px', borderBottom: '1px solid rgba(15,44,89,0.08)' }}>
        <Link to="/" className="link-hover" style={{ fontSize: 14, fontWeight: 600 }}>
          ← Kembali
        </Link>
        <div style={{ fontSize: 18, fontWeight: 800, marginLeft: 8 }}>
          <span style={{ color: '#0F2C59' }}>Siap</span>
          <span style={{ color: '#C9962E' }}>UKOM</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 24px' }}>
        <form style={{ width: '100%', maxWidth: 400 }} onSubmit={onSubmit} noValidate>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 8px' }}>Masuk</h1>
          <p style={{ fontSize: 14.5, color: 'rgba(15,44,89,0.65)', margin: '0 0 28px' }}>
            Masuk untuk melanjutkan latihan dan melihat kesiapanmu.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>Email</label>
            <input
              type="email"
              placeholder="Alamat email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorEmail('');
              }}
              style={{ ...inputBase, borderColor: errorEmail ? '#C0392B' : 'rgba(15,44,89,0.2)' }}
            />
            {errorEmail && <span style={{ fontSize: 12, color: '#C0392B' }}>{errorEmail}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>Password</label>
            <input
              type="password"
              placeholder="Kata sandi"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorPassword('');
              }}
              style={{ ...inputBase, borderColor: errorPassword ? '#C0392B' : 'rgba(15,44,89,0.2)' }}
            />
            {errorPassword && <span style={{ fontSize: 12, color: '#C0392B' }}>{errorPassword}</span>}
          </div>

          {errorGeneral && (
            <div style={{ fontSize: 12.5, color: '#C0392B', margin: '4px 0 0' }}>{errorGeneral}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '22px 0 22px' }}>
            <a href="#lupa" className="link-hover-brown" style={{ fontSize: 12.5, fontWeight: 600, color: '#C9962E' }}>
              Lupa password?
            </a>
          </div>

          <button
            type="submit"
            disabled={submitting}
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
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              boxShadow: '0 10px 24px rgba(15,44,89,0.22)',
            }}
          >
            {showSuccess ? 'Berhasil…' : submitting ? 'Memproses…' : 'Masuk'}
          </button>

          {showSuccess && (
            <div
              style={{
                marginTop: 16,
                padding: '14px 16px',
                borderRadius: 10,
                background: 'rgba(229,186,115,0.18)',
                color: '#8A6A2E',
                fontSize: 13.5,
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              Berhasil masuk. Mengarahkan ke aplikasi…
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(15,44,89,0.55)', margin: '24px 0 0' }}>
            Belum punya akun?{' '}
            <Link to="/latihan" className="link-hover" style={{ fontWeight: 700, color: '#0F2C59' }}>
              Coba Latihan Gratis
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
