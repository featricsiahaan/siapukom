import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError, type JenisKelamin } from '../api/client';
import type { PackageType } from '../api/types';

const PILIHAN: { value: PackageType; label: string; harga: string; ket: string }[] = [
  { value: '2_MINGGU', label: '2 Minggu', harga: 'Rp 17.000', ket: 'Simulasi + Kategori Khusus' },
  { value: '1_BULAN', label: '1 Bulan', harga: 'Rp 30.000', ket: 'Plus Materi Belajar' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Daftar() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paketParam = params.get('paket');
  const [pilihan, setPilihan] = useState<PackageType>(
    paketParam === '2_MINGGU' || paketParam === '1_BULAN' ? paketParam : '1_BULAN'
  );

  const [nama, setNama] = useState('');
  const [jk, setJk] = useState<JenisKelamin | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inputBase: CSSProperties = { padding: '12px 14px', fontSize: 14.5, borderRadius: 10, border: '1px solid' };
  const border = (k: string) => (errors[k] ? '#C0392B' : 'rgba(15,44,89,0.2)');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!nama.trim()) next.nama = 'Nama wajib diisi';
    if (!jk) next.jk = 'Pilih jenis kelamin';
    if (!email.trim()) next.email = 'Email wajib diisi';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Format email tidak valid';
    if (!password) next.password = 'Password wajib diisi';
    else if (password.length < 8) next.password = 'Password minimal 8 karakter';
    if (konfirmasi !== password) next.konfirmasi = 'Konfirmasi password tidak sama';
    setErrors(next);
    setErrorGeneral('');
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await register(nama.trim(), email.trim(), password, jk as JenisKelamin);
      navigate(`/upgrade?paket=${pilihan}`);
    } catch (err) {
      setErrorGeneral(err instanceof ApiError ? err.message : 'Gagal menghubungi server.');
      setSubmitting(false);
    }
  };

  const field = (key: string, label: string, type: string, value: string, set: (v: string) => void, placeholder: string, autoComplete: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 700 }}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => {
          set(e.target.value);
          setErrors((p) => ({ ...p, [key]: '' }));
        }}
        style={{ ...inputBase, borderColor: border(key) }}
      />
      {errors[key] && <span style={{ fontSize: 12, color: '#C0392B' }}>{errors[key]}</span>}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#0F2C59', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '22px 64px', borderBottom: '1px solid rgba(15,44,89,0.08)' }}>
        <Link to="/" className="link-hover" style={{ fontSize: 14, fontWeight: 600 }}>
          ← Kembali
        </Link>
        <div style={{ fontSize: 18, fontWeight: 800, marginLeft: 8 }}>
          <span style={{ color: '#0F2C59' }}>Siap</span>
          <span style={{ color: '#C9962E' }}>UKOM</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <form style={{ width: '100%', maxWidth: 440 }} onSubmit={onSubmit} noValidate>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 8px' }}>Daftar</h1>
          <p style={{ fontSize: 14.5, color: 'rgba(15,44,89,0.65)', margin: '0 0 24px' }}>
            Akun khusus untuk peserta berbayar. Pilih paket, buat akun, lalu lanjut ke pembayaran.
          </p>

          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Pilih paket</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {PILIHAN.map((p) => {
              const active = pilihan === p.value;
              return (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => setPilihan(p.value)}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    padding: '12px 12px',
                    borderRadius: 12,
                    border: `2px solid ${active ? '#0F2C59' : 'rgba(15,44,89,0.15)'}`,
                    background: active ? 'rgba(15,44,89,0.04)' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F2C59' }}>{p.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0F2C59', margin: '2px 0' }}>{p.harga}</div>
                  <div style={{ fontSize: 11, color: 'rgba(15,44,89,0.55)' }}>{p.ket}</div>
                </button>
              );
            })}
          </div>

          {field('nama', 'Nama', 'text', nama, setNama, 'Nama panggilan Anda', 'nickname')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>Jenis kelamin</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {([['LAKI_LAKI', 'Laki-laki'], ['PEREMPUAN', 'Perempuan']] as const).map(([v, l]) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => {
                    setJk(v);
                    setErrors((p) => ({ ...p, jk: '' }));
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    fontSize: 14.5,
                    fontWeight: 700,
                    borderRadius: 10,
                    cursor: 'pointer',
                    color: '#0F2C59',
                    border: jk === v ? '2px solid #C9962E' : `1px solid ${border('jk')}`,
                    background: jk === v ? 'rgba(201,150,46,0.1)' : '#fff',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
            {errors.jk && <span style={{ fontSize: 12, color: '#C0392B' }}>{errors.jk}</span>}
          </div>
          {field('email', 'Email', 'email', email, setEmail, 'Alamat email', 'email')}
          {field('password', 'Password', 'password', password, setPassword, 'Minimal 8 karakter', 'new-password')}
          {field('konfirmasi', 'Ulangi password', 'password', konfirmasi, setKonfirmasi, 'Ketik ulang password', 'new-password')}

          {errorGeneral && <div style={{ fontSize: 12.5, color: '#C0392B', margin: '0 0 12px' }}>{errorGeneral}</div>}

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
            {submitting ? 'Memproses…' : 'Daftar dan Lanjut Bayar'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(15,44,89,0.5)', margin: '16px 0 0' }}>
            Dengan mendaftar, Anda menyetujui{' '}
            <Link to="/legal" className="link-hover" style={{ fontWeight: 700, color: '#0F2C59' }}>
              ketentuan dan kebijakan privasi
            </Link>
            .
          </p>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(15,44,89,0.55)', margin: '16px 0 0' }}>
            Ingin mencoba dulu?{' '}
            <Link to="/latihan" className="link-hover" style={{ fontWeight: 700, color: '#0F2C59' }}>
              Latihan gratis tanpa daftar
            </Link>
          </p>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(15,44,89,0.55)', margin: '8px 0 0' }}>
            Sudah punya akun?{' '}
            <Link to="/masuk" className="link-hover" style={{ fontWeight: 700, color: '#0F2C59' }}>
              Masuk
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
