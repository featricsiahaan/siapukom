import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { AdminReportGroup, ReportReason } from '../api/types';

const REASON_LABEL: Record<ReportReason, string> = {
  KUNCI_SALAH: 'Kunci salah',
  PEMBAHASAN_SALAH: 'Pembahasan salah',
  SOAL_TIDAK_JELAS: 'Soal tidak jelas',
  GAMBAR_BERMASALAH: 'Gambar bermasalah',
  LAINNYA: 'Lainnya',
};

export function AdminReports() {
  const { token, user } = useAuth();
  const [groups, setGroups] = useState<AdminReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      setGroups((await api.listAdminReports(token)).groups);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat laporan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!user || user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  const act = async (g: AdminReportGroup, action: 'TAHAN_SOAL' | 'SELESAI' | 'TOLAK') => {
    if (!token) return;
    if (action === 'TAHAN_SOAL' && !window.confirm('Tarik soal ini dari peserta? Soal tidak akan tampil sampai Anda mengaktifkannya kembali.')) return;
    setBusy(g.questionId);
    try {
      await api.resolveReports(token, g.questionId, action);
      setGroups((prev) => prev.filter((x) => x.questionId !== g.questionId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memproses laporan.');
    } finally {
      setBusy(null);
    }
  };

  const btn = (bg: string, color: string, border: string) =>
    ({ background: bg, color, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }) as const;

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
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px' }}>Laporan Soal</h1>
        <p style={{ fontSize: 13.5, color: 'rgba(15,44,89,0.6)', margin: '0 0 22px' }}>
          Soal yang dilaporkan peserta, diurutkan dari yang paling banyak dilaporkan. <strong>Tahan soal</strong> menariknya dari peserta
          dan menutup laporannya; <strong>Selesai</strong> menutup laporan tanpa menarik soal; <strong>Tolak</strong> bila laporan tidak benar.
        </p>

        {error && (
          <div style={{ background: 'rgba(192,57,43,0.08)', color: '#C0392B', padding: '12px 16px', borderRadius: 10, fontSize: 14, marginBottom: 16 }}>{error}</div>
        )}
        {loading ? (
          <p style={{ color: 'rgba(15,44,89,0.6)' }}>Memuat…</p>
        ) : groups.length === 0 ? (
          <p style={{ color: 'rgba(15,44,89,0.6)' }}>Tidak ada laporan baru.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {groups.map((g) => (
              <div key={g.questionId} style={{ border: '1px solid rgba(15,44,89,0.12)', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#8A6A2E', background: 'rgba(229,186,115,0.18)', padding: '3px 9px', borderRadius: 999 }}>{g.kategori}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#C0392B' }}>{g.reports.length} laporan</span>
                  <span style={{ fontSize: 11.5, color: 'rgba(15,44,89,0.45)' }}>status soal: {g.statusSoal}</span>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 10px' }}>{g.pertanyaan}</p>
                <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
                  {g.opsi.map((o) => (
                    <div key={o.letter} style={{ fontWeight: o.letter === g.kunci ? 800 : 400, color: o.letter === g.kunci ? '#2E8B57' : undefined }}>
                      {o.letter}. {o.text}
                      {o.letter === g.kunci && ' (kunci)'}
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12.5, color: 'rgba(15,44,89,0.65)', margin: '0 0 12px' }}>
                  <strong>Pembahasan:</strong> {g.pembahasan}
                </p>
                <div style={{ background: '#F6F8FC', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  {g.reports.map((r) => (
                    <div key={r.id} style={{ fontSize: 12.5, marginBottom: 6 }}>
                      <strong>{REASON_LABEL[r.reason]}</strong>
                      {r.anonim ? ' (tamu)' : ''}
                      {r.note ? ` — ${r.note}` : ''}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button disabled={busy === g.questionId} onClick={() => act(g, 'TAHAN_SOAL')} style={btn('#C0392B', '#fff', '#C0392B')}>Tahan Soal</button>
                  <button disabled={busy === g.questionId} onClick={() => act(g, 'SELESAI')} style={btn('#2E8B57', '#fff', '#2E8B57')}>Selesai</button>
                  <button disabled={busy === g.questionId} onClick={() => act(g, 'TOLAK')} style={btn('none', '#0F2C59', 'rgba(15,44,89,0.3)')}>Tolak</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
