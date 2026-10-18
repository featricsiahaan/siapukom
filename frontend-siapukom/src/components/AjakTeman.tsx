import { useEffect, useState, type ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { ShareStatusResponse } from '../api/types';

export const IG_AKUN = 'siapukom';
const SITE = 'https://siapukom.vercel.app';
const PESAN = `Aku latihan soal UKMPPD di SiapUKOM, bisa lihat skor kesiapan per kategori. Coba 20 soal gratis tanpa daftar: ${SITE}`;

// Perkecil gambar di peramban agar ringan dikirim dan disimpan.
function perkecil(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const skala = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * skala);
      c.height = Math.round(img.height * skala);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gambar tidak bisa dibaca'));
    };
    img.src = url;
  });
}

export function AjakTeman() {
  const { token } = useAuth();
  const [st, setSt] = useState<ShareStatusResponse | null>(null);
  const [instagram, setInstagram] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [pesan, setPesan] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!token) return;
    api.getShareStatus(token).then(setSt).catch(() => {});
  };
  useEffect(load, [token]);

  if (!st || !st.eligible) return null;
  const perlu = st.jumlahTeman;

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(PESAN);
      setPesan('Teks disalin. Tempel dan bagikan ke temanmu.');
    } catch {
      setPesan('Gagal menyalin, salin teks secara manual.');
    }
  };

  const pilihFoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setPesan('');
    try {
      const baru = await Promise.all(files.map(perkecil));
      setFotos((prev) => [...prev, ...baru].slice(0, perlu));
    } catch {
      setPesan('Salah satu gambar tidak bisa dibaca. Coba pilih ulang.');
    }
  };

  const kirim = async () => {
    if (!token) return;
    if (!instagram.trim()) return setPesan(`Isi username Instagram kamu (yang sudah follow @${IG_AKUN}).`);
    if (fotos.length !== perlu) return setPesan(`Lampirkan tepat ${perlu} screenshot. Sekarang baru ${fotos.length}.`);
    setBusy(true);
    setPesan('');
    try {
      await api.submitShareClaim(token, instagram.trim(), fotos);
      setFotos([]);
      setInstagram('');
      setPesan('Terkirim. Admin akan memverifikasi, lalu masa berlakumu bertambah.');
      load();
    } catch (err) {
      setPesan(err instanceof ApiError ? err.message : 'Gagal mengirim.');
    } finally {
      setBusy(false);
    }
  };

  const input = { padding: '10px 12px', fontSize: 13.5, borderRadius: 8, border: '1px solid rgba(15,44,89,0.2)' } as const;

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 22, boxShadow: '0 4px 14px rgba(15,44,89,0.05)', marginBottom: 28, border: '1px solid rgba(201,150,46,0.35)' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#C9962E', letterSpacing: '0.04em' }}>AJAK TEMAN</div>
      <div style={{ fontSize: 16, fontWeight: 800, margin: '2px 0 8px' }}>Bagikan ke {perlu} teman, dapat +{st.bonusDays} hari masa berlaku</div>
      <ol style={{ fontSize: 13, color: 'rgba(15,44,89,0.7)', margin: '0 0 14px', paddingLeft: 18, lineHeight: 1.7 }}>
        <li>
          Follow Instagram{' '}
          <a href={`https://instagram.com/${IG_AKUN}`} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: '#C9962E' }}>
            @{IG_AKUN}
          </a>
          .
        </li>
        <li>Kirim ajakan ke {perlu} orang teman (satu per satu), lalu screenshot tiap pesan yang terkirim.</li>
        <li>Unggah {perlu} screenshot tersebut di bawah. Admin memverifikasi, lalu masa berlakumu bertambah.</li>
      </ol>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <button
          type="button"
          onClick={salin}
          style={{ background: '#0F2C59', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          Salin teks ajakan
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(PESAN)}`}
          target="_blank"
          rel="noreferrer"
          style={{ background: '#fff', color: '#0F2C59', border: '1px solid rgba(15,44,89,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 700 }}
        >
          Bagikan ke WhatsApp
        </a>
      </div>

      {st.pending ? (
        <div style={{ fontSize: 13, fontWeight: 700, color: '#B8860B' }}>Klaim terakhir sedang menunggu verifikasi admin.</div>
      ) : st.canClaim ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="Username Instagram kamu, misalnya @namakamu"
            style={input}
            maxLength={31}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {fotos.map((f, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={f} alt={`Screenshot ${i + 1}`} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(15,44,89,0.15)' }} />
                <button
                  type="button"
                  onClick={() => setFotos((prev) => prev.filter((_, j) => j !== i))}
                  aria-label="Hapus"
                  style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, border: 'none', background: '#C0392B', color: '#fff', fontSize: 12, cursor: 'pointer', lineHeight: '20px', padding: 0 }}
                >
                  ×
                </button>
              </div>
            ))}
            {fotos.length < perlu && (
              <label style={{ ...input, cursor: 'pointer', fontWeight: 700, color: '#0F2C59' }}>
                + Tambah screenshot
                <input type="file" accept="image/*" multiple onChange={pilihFoto} style={{ display: 'none' }} />
              </label>
            )}
            <span style={{ fontSize: 12.5, color: 'rgba(15,44,89,0.6)' }}>
              {fotos.length}/{perlu}
            </span>
          </div>
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={kirim}
              style={{ background: '#C9962E', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: busy ? 0.7 : 1 }}
            >
              {busy ? 'Mengirim…' : 'Kirim untuk diverifikasi'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'rgba(15,44,89,0.6)' }}>Batas bonus sudah tercapai. Terima kasih sudah membagikan!</div>
      )}
      {pesan && <div style={{ fontSize: 12.5, color: 'rgba(15,44,89,0.75)', marginTop: 8 }}>{pesan}</div>}
      <div style={{ fontSize: 11.5, color: 'rgba(15,44,89,0.45)', marginTop: 8 }}>
        Bonus disetujui {st.approved} dari maksimal {st.maxApproved}x.
      </div>
    </div>
  );
}
