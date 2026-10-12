/**
 * Uji asap pascadeploy (hanya membaca, tidak membuat akun atau data).
 * Usage: node scripts/smokeTest.js [API_BASE] [FRONTEND_URL]
 * Bawaan: API Hostinger dan https://siapukom.vercel.app
 */
const API = (process.argv[2] || 'https://salmon-hedgehog-277979.hostingersite.com/api').replace(/\/$/, '');
const FRONT = (process.argv[3] || 'https://siapukom.vercel.app').replace(/\/$/, '');

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'OK   ' : 'GAGAL'} ${name}${detail ? ' - ' + detail : ''}`);
  if (!ok) failed++;
};

async function get(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  const text = await res.text();
  return { res, text };
}

(async () => {
  try {
    const h = await get(`${API}/health`);
    check('API hidup', h.res.ok && h.text.includes('"ok"'));

    const db = await get(`${API}/health/db`);
    check('Database terjangkau', db.res.ok && db.text.includes('"database":"ok"'));

    const cat = await get(`${API}/categories`, { Origin: FRONT });
    let total = 0;
    try { total = JSON.parse(cat.text).categories.reduce((a, c) => a + c.questionCount, 0); } catch {}
    check('Daftar kategori & soal', cat.res.ok && total > 0, `${total} soal aktif`);
    check('CORS mengizinkan frontend', cat.res.headers.get('access-control-allow-origin') === FRONT);

    const hook = await get(`${API}/payments/notification`);
    check('Endpoint webhook DOKU terjangkau', hook.res.ok);

    const f = await get(`${FRONT}/`);
    check('Frontend hidup', f.res.ok);
    const js = (f.text.match(/assets\/index-[^"']+\.js/) || [])[0];
    if (js) {
      const b = await get(`${FRONT}/${js}`);
      const host = new URL(API).host;
      check('Frontend menunjuk ke API yang benar', b.text.includes(host), host);
    } else {
      check('Bundle frontend ditemukan', false);
    }
  } catch (e) {
    check('Tidak ada error jaringan', false, e.message);
  }
  console.log(failed === 0 ? '\nSemua pemeriksaan lolos.' : `\n${failed} pemeriksaan gagal.`);
  process.exit(failed === 0 ? 0 : 1);
})();
