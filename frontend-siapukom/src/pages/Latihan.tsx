import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { Category, FinishSessionResponse, SessionQuestion, SimulasiStatus } from '../api/types';

type Screen = 'menu' | 'session' | 'result';

interface Feedback {
  correct: boolean;
  kunci: string;
  pembahasan: string;
}

const SEMUA_KATEGORI = 'Semua Kategori';
const JUMLAH_OPTIONS_GUEST = [10, 20];

export function Latihan() {
  const { token, isAuthenticated } = useAuth();
  const kembaliTo = isAuthenticated ? '/dashboard' : '/';
  const jumlahOptions = JUMLAH_OPTIONS_GUEST;

  const [categories, setCategories] = useState<Category[]>([]);
  const [kategoriPilihan, setKategoriPilihan] = useState<string>(SEMUA_KATEGORI);
  const [jumlah, setJumlah] = useState(10);
  const [status, setStatus] = useState<SimulasiStatus | null>(null);
  const [kategoriKhususPilihan, setKategoriKhususPilihan] = useState<string>('');

  useEffect(() => {
    if (!token) return;
    api.getSimulasiStatus(token).then(setStatus).catch(() => {});
  }, [token]);

  const [screen, setScreen] = useState<Screen>('menu');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});
  const [result, setResult] = useState<FinishSessionResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getCategories()
      .then((res) => setCategories(res.categories))
      .catch(() => setError('Gagal memuat daftar kategori.'));
  }, []);

  const startLatihan = async () => {
    setError('');
    setLoading(true);
    try {
      const categoryId =
        kategoriPilihan === SEMUA_KATEGORI
          ? null
          : (categories.find((c) => c.name === kategoriPilihan)?.id ?? null);
      const res = await api.startSession(categoryId, jumlah, token);
      setSessionId(res.sessionId);
      setQuestions(res.questions);
      setCurrent(0);
      setAnswers({});
      setFeedback({});
      setScreen('session');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memulai sesi latihan.');
    } finally {
      setLoading(false);
    }
  };

  const startKategoriKhusus = async () => {
    if (!kategoriKhususPilihan) {
      setError('Pilih satu kategori untuk latihan kategori khusus.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const categoryId = categories.find((c) => c.name === kategoriKhususPilihan)?.id ?? null;
      const res = await api.startSession(categoryId, 30, token, 'KATEGORI');
      setSessionId(res.sessionId);
      setQuestions(res.questions);
      setCurrent(0);
      setAnswers({});
      setFeedback({});
      setScreen('session');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memulai latihan kategori khusus.');
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = async (letter: string) => {
    if (!sessionId || feedback[current]) return;
    setAnswers((prev) => ({ ...prev, [current]: letter }));
    try {
      const res = await api.answerQuestion(sessionId, current, letter, token);
      setFeedback((prev) => ({
        ...prev,
        [current]: { correct: res.correct ?? false, kunci: res.kunci ?? '', pembahasan: res.pembahasan ?? '' },
      }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengirim jawaban.');
    }
  };

  const finishLatihan = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.finishSession(sessionId, token);
      setResult(res);
      setScreen('result');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menutup sesi latihan.');
    } finally {
      setLoading(false);
    }
  };

  const resetMenu = () => {
    setScreen('menu');
    setSessionId(null);
    setQuestions([]);
    setCurrent(0);
    setAnswers({});
    setFeedback({});
    setResult(null);
  };

  const total = questions.length;
  const currentQ = questions[current];
  const currentFeedback = feedback[current];
  const answeredLetter = answers[current];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#0F2C59', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 64px', borderBottom: '1px solid rgba(15,44,89,0.08)' }}>
        <Link to={kembaliTo} className="link-hover" style={{ fontSize: 14, fontWeight: 600 }}>
          ← Kembali
        </Link>
        <div style={{ fontSize: 18, fontWeight: 800, marginLeft: 8 }}>
          <span style={{ color: '#0F2C59' }}>Siap</span>
          <span style={{ color: '#C9962E' }}>UKOM</span>
        </div>
        <span
          style={{
            marginLeft: 6,
            fontSize: 12,
            fontWeight: 700,
            color: '#8A6A2E',
            background: 'rgba(229,186,115,0.18)',
            padding: '4px 10px',
            borderRadius: 999,
          }}
        >
          {isAuthenticated ? 'Latihan Kategori Khusus' : 'Latihan Gratis'}
        </span>
        <Link to="/upgrade" className="link-hover" style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700, color: '#0F2C59' }}>
          Akses Penuh →
        </Link>
      </div>

      <div style={{ flex: 1, padding: '56px 64px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 720 }}>
          {error && (
            <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(192,57,43,0.1)', color: '#C0392B', fontSize: 13.5 }}>
              {error}
            </div>
          )}

          {screen === 'menu' && (
            <>
              {!isAuthenticated && (
                <>
                  <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 10px' }}>Latihan Gratis</h1>
                  <p style={{ fontSize: 15.5, color: 'rgba(15,44,89,0.65)', margin: '0 0 32px', maxWidth: '52ch' }}>
                    Coba beberapa soal vignette klinis contoh dengan pembahasan langsung. Pilih kategori dan jumlah soal untuk mulai.
                  </p>

                  <div style={{ marginBottom: 28 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Kategori</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {[SEMUA_KATEGORI, ...categories.map((c) => c.name)].map((k) => {
                        const active = kategoriPilihan === k;
                        return (
                          <button
                            key={k}
                            onClick={() => setKategoriPilihan(k)}
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              padding: '9px 16px',
                              borderRadius: 999,
                              border: `1px solid ${active ? '#0F2C59' : 'rgba(15,44,89,0.2)'}`,
                              background: active ? '#0F2C59' : '#fff',
                              color: active ? '#fff' : '#0F2C59',
                              cursor: 'pointer',
                            }}
                          >
                            {k}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginBottom: 36 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Jumlah Soal</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {jumlahOptions.map((v) => {
                        const active = jumlah === v;
                        return (
                          <button
                            key={v}
                            onClick={() => setJumlah(v)}
                            style={{
                              fontSize: 13.5,
                              fontWeight: 700,
                              padding: '10px 20px',
                              borderRadius: 10,
                              border: `1px solid ${active ? '#0F2C59' : 'rgba(15,44,89,0.2)'}`,
                              background: active ? '#0F2C59' : '#fff',
                              color: active ? '#fff' : '#0F2C59',
                              cursor: 'pointer',
                            }}
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={startLatihan}
                    disabled={loading}
                    className="btn-primary"
                    style={{
                      background: '#0F2C59',
                      color: '#fff',
                      fontSize: 15.5,
                      fontWeight: 700,
                      padding: '16px 32px',
                      borderRadius: 10,
                      border: 'none',
                      cursor: loading ? 'default' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                      boxShadow: '0 10px 24px rgba(15,44,89,0.22)',
                    }}
                  >
                    {loading ? 'Memuat…' : 'Mulai Latihan'}
                  </button>
                  <p style={{ fontSize: 12, color: 'rgba(15,44,89,0.45)', marginTop: 14 }}>
                    Soal diambil dari bank soal server secara acak setiap sesi.
                  </p>
                  <p style={{ fontSize: 13, color: 'rgba(15,44,89,0.55)', marginTop: 24 }}>
                    Sudah punya akun?{' '}
                    <Link to="/masuk" className="link-hover" style={{ fontWeight: 700, color: '#0F2C59' }}>
                      Masuk
                    </Link>{' '}
                    untuk latihan kategori khusus dengan kuota Akses Penuh.
                  </p>
                </>
              )}

              {isAuthenticated && (
                <div>
                  <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 8px' }}>Latihan Kategori Khusus</h1>
                  <p style={{ fontSize: 14, color: 'rgba(15,44,89,0.65)', margin: '0 0 18px', maxWidth: '52ch' }}>
                    30 soal fokus pada satu kategori untuk mempertajam satu bidang ilmu.
                  </p>

                  {!status || status.kategoriLatihanLimit === 0 ? (
                    <div>
                      <div
                        style={{
                          padding: '14px 16px',
                          borderRadius: 10,
                          background: 'rgba(229,186,115,0.12)',
                          color: '#8A6A2E',
                          fontSize: 13.5,
                          fontWeight: 600,
                          marginBottom: 14,
                        }}
                      >
                        Fitur Akses Penuh. Beli paket untuk membuka kesempatan latihan kategori khusus.
                      </div>
                      <Link
                        to="/upgrade"
                        style={{ background: '#0F2C59', color: '#fff', fontSize: 14, fontWeight: 700, padding: '12px 22px', borderRadius: 10 }}
                      >
                        Upgrade ke Akses Penuh
                      </Link>
                    </div>
                  ) : status.kategoriLatihanUsed >= status.kategoriLatihanLimit ? (
                    <div>
                      <div
                        style={{
                          padding: '14px 16px',
                          borderRadius: 10,
                          background: 'rgba(192,57,43,0.08)',
                          color: '#C0392B',
                          fontSize: 13.5,
                          fontWeight: 600,
                          marginBottom: 14,
                        }}
                      >
                        Kesempatan latihan kategori khusus Anda sudah habis ({status.kategoriLatihanUsed}/{status.kategoriLatihanLimit}).
                      </div>
                      <Link
                        to="/upgrade"
                        style={{ background: '#0F2C59', color: '#fff', fontSize: 14, fontWeight: 700, padding: '12px 22px', borderRadius: 10 }}
                      >
                        Tambah Kuota Akses Penuh
                      </Link>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(15,44,89,0.6)', marginBottom: 14 }}>
                        Sisa kesempatan: {status.kategoriLatihanLimit - status.kategoriLatihanUsed} dari {status.kategoriLatihanLimit}
                      </p>
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Pilih Kategori</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {categories.map((c) => {
                            const active = kategoriKhususPilihan === c.name;
                            return (
                              <button
                                key={c.id}
                                onClick={() => setKategoriKhususPilihan(c.name)}
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  padding: '9px 16px',
                                  borderRadius: 999,
                                  border: `1px solid ${active ? '#0F2C59' : 'rgba(15,44,89,0.2)'}`,
                                  background: active ? '#0F2C59' : '#fff',
                                  color: active ? '#fff' : '#0F2C59',
                                  cursor: 'pointer',
                                }}
                              >
                                {c.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        onClick={startKategoriKhusus}
                        disabled={loading || !kategoriKhususPilihan}
                        style={{
                          background: '#0F2C59',
                          color: '#fff',
                          fontSize: 14.5,
                          fontWeight: 700,
                          padding: '13px 26px',
                          borderRadius: 10,
                          border: 'none',
                          cursor: loading || !kategoriKhususPilihan ? 'default' : 'pointer',
                          opacity: loading || !kategoriKhususPilihan ? 0.6 : 1,
                        }}
                      >
                        {loading ? 'Memuat…' : 'Mulai Latihan Kategori'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {screen === 'session' && currentQ && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#8A6A2E',
                    background: 'rgba(229,186,115,0.18)',
                    padding: '4px 10px',
                    borderRadius: 999,
                  }}
                >
                  {currentQ.kategori}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 13, color: 'rgba(15,44,89,0.6)' }}>
                  Soal {current + 1} dari {total}
                </span>
              </div>
              <div style={{ height: 6, background: '#EEF1F6', borderRadius: 4, marginBottom: 26, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    background: '#E5BA73',
                    borderRadius: 4,
                    width: `${Math.round(((current + 1) / total) * 100)}%`,
                  }}
                />
              </div>

              <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 8px 28px rgba(15,44,89,0.08)' }}>
                <p style={{ fontSize: 16, lineHeight: 1.6, margin: '0 0 22px' }}>{currentQ.pertanyaan}</p>
                {currentQ.imageUrl && (
                  <div style={{ marginBottom: 22 }}>
                    <img
                      src={currentQ.imageUrl}
                      alt="Ilustrasi kasus"
                      style={{ maxWidth: '100%', borderRadius: 10, border: '1px solid rgba(15,44,89,0.12)' }}
                    />
                    {currentQ.imageAttribution && (
                      <p style={{ fontSize: 11, color: 'rgba(15,44,89,0.45)', margin: '6px 0 0' }}>
                        {currentQ.imageAttribution}
                      </p>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {currentQ.opsi.map((opt) => {
                    const selected = answeredLetter === opt.letter;
                    let bg = '#fff';
                    let border = 'rgba(15,44,89,0.15)';
                    let textDecoration = 'none';
                    let opacity = 1;
                    if (currentFeedback) {
                      if (opt.letter === currentFeedback.kunci) {
                        bg = 'rgba(229,186,115,0.18)';
                        border = '#E5BA73';
                      } else if (selected) {
                        bg = '#EEF1F6';
                        border = 'rgba(15,44,89,0.3)';
                        textDecoration = 'line-through';
                        opacity = 0.7;
                      }
                    } else if (selected) {
                      bg = 'rgba(15,44,89,0.06)';
                      border = '#0F2C59';
                    }
                    return (
                      <label
                        key={opt.letter}
                        className="option-row"
                        style={{ background: bg, borderColor: border, textDecoration, opacity }}
                      >
                        <input
                          type="radio"
                          name="opt-current"
                          checked={selected}
                          disabled={!!currentFeedback}
                          onChange={() => selectAnswer(opt.letter)}
                        />
                        <span>
                          <strong>{opt.letter}.</strong> {opt.text}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {currentFeedback && (
                  <div
                    style={{
                      marginTop: 20,
                      padding: 16,
                      borderRadius: 10,
                      background: currentFeedback.correct ? 'rgba(229,186,115,0.18)' : '#EEF1F6',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#0F2C59', marginBottom: 6 }}>
                      {currentFeedback.correct ? 'Benar!' : 'Kurang tepat'}
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: 'rgba(15,44,89,0.75)' }}>{currentFeedback.pembahasan}</p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button
                  onClick={() => setCurrent((c) => Math.max(c - 1, 0))}
                  disabled={current === 0}
                  style={{
                    background: '#fff',
                    color: '#0F2C59',
                    border: '1px solid rgba(15,44,89,0.2)',
                    fontSize: 14,
                    fontWeight: 700,
                    padding: '12px 22px',
                    borderRadius: 10,
                    cursor: current === 0 ? 'default' : 'pointer',
                    opacity: current === 0 ? 0.5 : 1,
                  }}
                >
                  ← Sebelumnya
                </button>
                {current === total - 1 ? (
                  <button
                    onClick={finishLatihan}
                    disabled={loading}
                    style={{
                      marginLeft: 'auto',
                      background: '#0F2C59',
                      color: '#fff',
                      border: 'none',
                      fontSize: 14,
                      fontWeight: 700,
                      padding: '12px 26px',
                      borderRadius: 10,
                      cursor: loading ? 'default' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? 'Memuat…' : 'Lihat Hasil'}
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrent((c) => Math.min(c + 1, total - 1))}
                    style={{
                      marginLeft: 'auto',
                      background: '#0F2C59',
                      color: '#fff',
                      border: 'none',
                      fontSize: 14,
                      fontWeight: 700,
                      padding: '12px 26px',
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    Selanjutnya →
                  </button>
                )}
              </div>
            </>
          )}

          {screen === 'result' && result && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 36 }}>
                <ResultGauge score={result.resultScore} />
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: '12px 0 4px' }}>Latihan Selesai!</h2>
                <p style={{ fontSize: 14.5, color: 'rgba(15,44,89,0.65)', margin: 0 }}>
                  {result.resultCorrect} dari {result.resultTotal} soal benar
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {result.resultByKategori.map((b) => (
                  <div key={b.kategori}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                      <span>{b.kategori}</span>
                      <span>{b.pct}%</span>
                    </div>
                    <div style={{ height: 7, background: '#EEF1F6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: b.width, background: '#0F2C59', borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={resetMenu}
                  style={{
                    background: '#fff',
                    color: '#0F2C59',
                    border: '1px solid rgba(15,44,89,0.2)',
                    fontSize: 14.5,
                    fontWeight: 700,
                    padding: '14px 26px',
                    borderRadius: 10,
                    cursor: 'pointer',
                  }}
                >
                  Coba Lagi
                </button>
                <Link
                  to="/upgrade"
                  style={{
                    background: '#0F2C59',
                    color: '#fff',
                    fontSize: 14.5,
                    fontWeight: 700,
                    padding: '14px 26px',
                    borderRadius: 10,
                  }}
                >
                  Daftar untuk Akses Penuh
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 60;
  const offset = circumference * (1 - score / 100);
  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      <circle cx={70} cy={70} r={60} fill="none" stroke="#EEF1F6" strokeWidth={12} />
      <circle
        cx={70}
        cy={70}
        r={60}
        fill="none"
        stroke="#E5BA73"
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
      />
      <text x={70} y={78} textAnchor="middle" fontFamily="'Plus Jakarta Sans',sans-serif" fontSize={28} fontWeight={800} fill="#0F2C59">
        {score}%
      </text>
    </svg>
  );
}
