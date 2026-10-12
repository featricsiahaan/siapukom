import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { ReportReason } from '../api/types';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'KUNCI_SALAH', label: 'Kunci jawaban salah' },
  { value: 'PEMBAHASAN_SALAH', label: 'Pembahasan salah atau keliru' },
  { value: 'SOAL_TIDAK_JELAS', label: 'Soal tidak jelas atau ambigu' },
  { value: 'GAMBAR_BERMASALAH', label: 'Gambar bermasalah' },
  { value: 'LAINNYA', label: 'Lainnya' },
];

export function ReportQuestion({ questionId }: { questionId: string }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('KUNCI_SALAH');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const submit = async () => {
    setState('sending');
    setError('');
    try {
      await api.reportQuestion(token, questionId, reason, note.trim() || undefined);
      setState('sent');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengirim laporan, coba lagi.');
      setState('idle');
    }
  };

  if (state === 'sent') {
    return <span style={{ fontSize: 12.5, color: '#2E8B57', fontWeight: 700 }}>Terima kasih, laporan Anda sudah kami terima.</span>;
  }

  return (
    <div style={{ marginTop: 12 }}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(15,44,89,0.55)', fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer' }}
        >
          Laporkan soal ini
        </button>
      ) : (
        <div style={{ border: '1px solid rgba(15,44,89,0.15)', borderRadius: 10, padding: 14, background: '#FAFBFD' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Apa masalahnya?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {REASONS.map((r) => (
              <label key={r.value} style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name={`reason-${questionId}`} checked={reason === r.value} onChange={() => setReason(r.value)} />
                {r.label}
              </label>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Penjelasan singkat (opsional). Sertakan alasan atau rujukan bila ada."
            style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, padding: 10, borderRadius: 8, border: '1px solid rgba(15,44,89,0.2)', resize: 'vertical' }}
          />
          {error && <div style={{ fontSize: 12, color: '#C0392B', marginTop: 6 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              type="button"
              onClick={submit}
              disabled={state === 'sending'}
              style={{ background: '#0F2C59', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: state === 'sending' ? 0.7 : 1 }}
            >
              {state === 'sending' ? 'Mengirim…' : 'Kirim Laporan'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: '1px solid rgba(15,44,89,0.2)', borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer', color: '#0F2C59' }}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
