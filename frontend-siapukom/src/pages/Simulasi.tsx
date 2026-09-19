import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { FinishSimulasiResponse, SessionQuestion, SimulasiStatus } from '../api/types';

type Screen = 'menu' | 'exam' | 'result';

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':');
}

export function Simulasi() {
  const { token, isAuthenticated } = useAuth();

  const [status, setStatus] = useState<SimulasiStatus | null>(null);
  const [screen, setScreen] = useState<Screen>('menu');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [raguRagu, setRaguRagu] = useState<Set<number>>(new Set());
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);

  const [result, setResult] = useState<FinishSimulasiResponse | null>(null);

  const finishingRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    api.getSimulasiStatus(token).then(setStatus).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (screen !== 'exam' || !expiresAt) return;
    const tick = () => {
      const remaining = Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(remaining);
      if (remaining <= 0 && !finishingRef.current) {
        finishingRef.current = true;
        void handleFinish();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, expiresAt]);

  const startSimulasi = async () => {
    if (!token) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.startSimulasi(token);
      setSessionId(res.sessionId);
      setQuestions(res.questions);
      setExpiresAt(res.expiresAt ?? null);
      setCurrent(0);
      setAnswers({});
      setRaguRagu(new Set());
      setResult(null);
      setScreen('exam');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memulai simulasi.');
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (letter: string) => {
    if (!sessionId || !token) return;
    setAnswers((prev) => ({ ...prev, [current]: letter }));
    api.answerQuestion(sessionId, current, letter, token).catch(() => {
      setError('Gagal menyimpan jawaban, periksa koneksi internet Anda.');
    });
  };

  const toggleRagu = () => {
    setRaguRagu((prev) => {
      const next = new Set(prev);
      if (next.has(current)) next.delete(current);
      else next.add(current);
      return next;
    });
  };

  async function handleFinish() {
    if (!sessionId || !token) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.finishSimulasi(sessionId, token);
      setResult(res);
      setScreen('result');
      api.getSimulasiStatus(token).then(setStatus).catch(() => {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menutup sesi simulasi.');
    } finally {
      setLoading(false);
      finishingRef.current = false;
    }
  }

  const total = questions.length;
  const currentQ = questions[current];
  const unansweredCount = total - Object.keys(answers).length;

  const kuotaHabis =
    status?.simulationAttemptsLimit != null && status.simulationAttemptsUsed >= status.simulationAttemptsLimit;

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 15, color: 'rgba(15,44,89,0.7)' }}>Simulasi ujian membutuhkan akun. Silakan masuk terlebih dahulu.</p>
        <Link to="/masuk" style={{ background: '#0F2C59', color: '#fff', fontSize: 14, fontWeight: 700, padding: '12px 24px', borderRadius: 10 }}>
          Masuk
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#0F2C59', display: 'flex', flexDirection: 'column' }}>
      {screen !== 'exam' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 64px', borderBottom: '1px solid rgba(15,44,89,0.08)' }}>
          <Link to="/dashboard" className="link-hover" style={{ fontSize: 14, fontWeight: 600 }}>
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
            Simulasi Ujian CBT
          </span>
        </div>
      )}

      {screen === 'exam' && currentQ && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '14px 32px',
            borderBottom: '1px solid rgba(15,44,89,0.1)',
            position: 'sticky',
            top: 0,
            background: '#fff',
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800 }}>
            <span style={{ color: '#0F2C59' }}>Siap</span>
            <span style={{ color: '#C9962E' }}>UKOM</span>
          </div>
          <span style={{ fontSize: 13, color: 'rgba(15,44,89,0.6)' }}>
            Soal {current + 1} dari {total}
          </span>
          <div
            style={{
              marginLeft: 'auto',
              fontSize: 15,
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              color: secondsLeft < 600 ? '#C0392B' : '#0F2C59',
              background: secondsLeft < 600 ? 'rgba(192,57,43,0.1)' : '#EEF1F6',
              padding: '6px 14px',
              borderRadius: 8,
            }}
          >
            ⏱ {formatDuration(secondsLeft)}
          </div>
          <button
            onClick={() => setShowConfirmFinish(true)}
            style={{
              background: '#0F2C59',
              color: '#fff',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              padding: '10px 18px',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Selesaikan Ujian
          </button>
        </div>
      )}

      <div style={{ flex: 1, padding: screen === 'exam' ? '24px 32px' : '56px 64px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: screen === 'exam' ? 1080 : 720 }}>
          {error && (
            <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(192,57,43,0.1)', color: '#C0392B', fontSize: 13.5 }}>
              {error}
            </div>
          )}

          {screen === 'menu' && (
            <>
              <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 10px' }}>Simulasi Ujian CBT</h1>
              <p style={{ fontSize: 15.5, color: 'rgba(15,44,89,0.65)', margin: '0 0 28px', maxWidth: '56ch' }}>
                Format dibuat semirip mungkin dengan UKMPPD sungguhan: {status?.jumlahSoal ?? 150} soal dalam{' '}
                {status?.durasiMenit ?? 200} menit, tanpa pembahasan langsung. Kunci jawaban dan pembahasan baru terbuka
                setelah ujian selesai.
              </p>

              <div style={{ background: '#F6F8FC', borderRadius: 14, padding: 24, marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(15,44,89,0.5)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Kesempatan Simulasi
                </div>
                {status?.simulationAttemptsLimit == null ? (
                  <div style={{ fontSize: 20, fontWeight: 800 }}>Tidak terbatas</div>
                ) : (
                  <div style={{ fontSize: 20, fontWeight: 800 }}>
                    {status.simulationAttemptsUsed} / {status.simulationAttemptsLimit} terpakai
                  </div>
                )}
              </div>

              {kuotaHabis ? (
                <div>
                  <div
                    style={{
                      padding: '16px 18px',
                      borderRadius: 10,
                      background: 'rgba(192,57,43,0.08)',
                      color: '#C0392B',
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 16,
                    }}
                  >
                    Kesempatan trial simulasi Anda sudah habis.
                  </div>
                  <Link
                    to="/upgrade"
                    style={{ background: '#0F2C59', color: '#fff', fontSize: 15, fontWeight: 700, padding: '14px 28px', borderRadius: 10 }}
                  >
                    Upgrade ke Akses Penuh
                  </Link>
                </div>
              ) : (
                <button
                  onClick={startSimulasi}
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
                  {loading ? 'Memuat…' : 'Mulai Simulasi'}
                </button>
              )}
              <p style={{ fontSize: 12, color: 'rgba(15,44,89,0.45)', marginTop: 16 }}>
                Setelah dimulai, timer berjalan otomatis dan tidak bisa dijeda. Pastikan Anda punya waktu luang sebelum
                memulai.
              </p>
            </>
          )}

          {screen === 'exam' && currentQ && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 24, alignItems: 'start' }}>
              <div>
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
                        <p style={{ fontSize: 11, color: 'rgba(15,44,89,0.45)', margin: '6px 0 0' }}>{currentQ.imageAttribution}</p>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {currentQ.opsi.map((opt) => {
                      const selected = answers[current] === opt.letter;
                      return (
                        <label
                          key={opt.letter}
                          className="option-row"
                          style={{
                            background: selected ? 'rgba(15,44,89,0.06)' : '#fff',
                            borderColor: selected ? '#0F2C59' : 'rgba(15,44,89,0.15)',
                          }}
                        >
                          <input type="radio" name="opt-current" checked={selected} onChange={() => selectAnswer(opt.letter)} />
                          <span>
                            <strong>{opt.letter}.</strong> {opt.text}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
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
                  <button
                    onClick={toggleRagu}
                    style={{
                      background: raguRagu.has(current) ? '#E5BA73' : '#fff',
                      color: '#0F2C59',
                      border: '1px solid #E5BA73',
                      fontSize: 14,
                      fontWeight: 700,
                      padding: '12px 22px',
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    {raguRagu.has(current) ? 'Batalkan Ragu-ragu' : 'Tandai Ragu-ragu'}
                  </button>
                  <button
                    onClick={() => setCurrent((c) => Math.min(c + 1, total - 1))}
                    disabled={current === total - 1}
                    style={{
                      marginLeft: 'auto',
                      background: '#0F2C59',
                      color: '#fff',
                      border: 'none',
                      fontSize: 14,
                      fontWeight: 700,
                      padding: '12px 26px',
                      borderRadius: 10,
                      cursor: current === total - 1 ? 'default' : 'pointer',
                      opacity: current === total - 1 ? 0.5 : 1,
                    }}
                  >
                    Selanjutnya →
                  </button>
                </div>
              </div>

              <div style={{ background: '#F6F8FC', borderRadius: 14, padding: 16, position: 'sticky', top: 90 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(15,44,89,0.6)', marginBottom: 10 }}>Navigasi Soal</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
                  {questions.map((q) => {
                    const isAnswered = answers[q.order] !== undefined;
                    const isRagu = raguRagu.has(q.order);
                    const isCurrent = q.order === current;
                    let bg = '#fff';
                    let color = '#0F2C59';
                    let border = 'rgba(15,44,89,0.2)';
                    if (isAnswered) {
                      bg = '#0F2C59';
                      color = '#fff';
                      border = '#0F2C59';
                    }
                    if (isRagu) {
                      bg = '#E5BA73';
                      color = '#0F2C59';
                      border = '#E5BA73';
                    }
                    return (
                      <button
                        key={q.order}
                        onClick={() => setCurrent(q.order)}
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 6,
                          border: isCurrent ? '2px solid #C9962E' : `1px solid ${border}`,
                          background: bg,
                          color,
                          cursor: 'pointer',
                        }}
                      >
                        {q.order + 1}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14, fontSize: 11, color: 'rgba(15,44,89,0.6)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: '#0F2C59', display: 'inline-block' }} /> Terjawab
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: '#E5BA73', display: 'inline-block' }} /> Ragu-ragu
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: '#fff', border: '1px solid rgba(15,44,89,0.2)', display: 'inline-block' }} /> Belum
                    dijawab
                  </div>
                </div>
              </div>
            </div>
          )}

          {screen === 'result' && result && (
            <SimulasiResult result={result} />
          )}
        </div>
      </div>

      {showConfirmFinish && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,44,89,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, width: '90%' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 10px' }}>Selesaikan ujian sekarang?</h3>
            <p style={{ fontSize: 14, color: 'rgba(15,44,89,0.65)', margin: '0 0 24px' }}>
              {unansweredCount > 0
                ? `Masih ada ${unansweredCount} soal yang belum dijawab. Soal yang belum dijawab akan dianggap salah.`
                : 'Semua soal sudah dijawab.'}{' '}
              Setelah disubmit, Anda tidak bisa mengubah jawaban lagi.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirmFinish(false)}
                style={{ background: '#fff', color: '#0F2C59', border: '1px solid rgba(15,44,89,0.2)', fontSize: 14, fontWeight: 700, padding: '12px 20px', borderRadius: 10, cursor: 'pointer' }}
              >
                Kembali
              </button>
              <button
                onClick={() => {
                  setShowConfirmFinish(false);
                  void handleFinish();
                }}
                disabled={loading}
                style={{ background: '#0F2C59', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, padding: '12px 20px', borderRadius: 10, cursor: 'pointer' }}
              >
                {loading ? 'Memproses…' : 'Ya, Selesaikan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SimulasiResult({ result }: { result: FinishSimulasiResponse }) {
  const circumference = 2 * Math.PI * 60;
  const offset = circumference * (1 - result.resultScore / 100);

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
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
            {result.resultScore}%
          </text>
        </svg>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: '12px 0 4px' }}>Simulasi Selesai!</h2>
        <p style={{ fontSize: 14.5, color: 'rgba(15,44,89,0.65)', margin: 0 }}>
          {result.resultCorrect} dari {result.resultTotal} soal benar
        </p>
      </div>

      {result.areasToImprove.length > 0 && (
        <div style={{ background: 'rgba(192,57,43,0.06)', borderRadius: 12, padding: 18, marginBottom: 28 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#C0392B', marginBottom: 6 }}>Aspek yang perlu diperbaiki</div>
          <p style={{ fontSize: 13, color: 'rgba(15,44,89,0.7)', margin: 0, lineHeight: 1.6 }}>
            Kategori dengan skor di bawah 60%: {result.areasToImprove.join(', ')}. Fokuskan latihan tambahan pada kategori ini.
          </p>
        </div>
      )}

      <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px' }}>Analisa per Kategori</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36 }}>
        {result.analisaKategori.map((k) => (
          <div key={k.kategori}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
              <span>
                {k.kategori} <span style={{ fontSize: 11, fontWeight: 700, color: k.badgeText, marginLeft: 6 }}>{k.level}</span>
              </span>
              <span>{k.pct}%</span>
            </div>
            <div style={{ height: 7, background: '#EEF1F6', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${k.pct}%`, background: k.badgeText, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px' }}>Soal Salah & Kunci Jawaban ({result.wrongAnswers.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
        {result.wrongAnswers.map((w) => (
          <div key={w.order} style={{ background: '#fff', border: '1px solid rgba(15,44,89,0.1)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#8A6A2E', background: 'rgba(229,186,115,0.18)', padding: '3px 9px', borderRadius: 999 }}>
                {w.kategori}
              </span>
              <span style={{ fontSize: 11.5, color: 'rgba(15,44,89,0.45)' }}>Soal #{w.order + 1}</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 10px' }}>{w.pertanyaan}</p>
            <div style={{ fontSize: 13 }}>
              <span style={{ color: '#C0392B', fontWeight: 700 }}>Jawaban Anda: {w.answerLetter ?? '(tidak dijawab)'}</span>
              {'  '}
              <span style={{ color: '#2E8B57', fontWeight: 700 }}>Kunci: {w.kunci}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link
          to="/dashboard"
          style={{ background: '#0F2C59', color: '#fff', fontSize: 14.5, fontWeight: 700, padding: '14px 26px', borderRadius: 10 }}
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </>
  );
}
