export interface CsvQuestion {
  kategori: string;
  pertanyaan: string;
  opsi: { letter: string; text: string }[];
  kunci: string;
  pembahasan: string;
}

export interface CsvParseResult {
  questions: CsvQuestion[];
  warnings: string[];
  ignoredColumns: string[];
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

function detectDelimiter(sampleLine: string): string {
  const semicolons = (sampleLine.match(/;/g) ?? []).length;
  const commas = (sampleLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ';' : ',';
}

// Parser CSV sesuai RFC4180 (mendukung field berkutip yang berisi delimiter/baris baru).
function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char === '\r') {
      // dilewati, baris baru ditangani oleh \n
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function findColumn(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex((h) => h === candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseQuestionsFromCsv(text: string): CsvParseResult {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);
  const rows = parseCsvRows(text.trim(), delimiter);

  const warnings: string[] = [];
  if (rows.length === 0) {
    return { questions: [], warnings: ['File CSV kosong'], ignoredColumns: [] };
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());

  const kategoriIdx = findColumn(headers, ['materi', 'kategori']);
  const pertanyaanIdx = findColumn(headers, ['pertanyaan', 'soal', 'vignette']);
  const kunciIdx = findColumn(headers, ['kunci', 'jawaban', 'kunci_jawaban', 'jawaban_benar']);
  const pembahasanIdx = findColumn(headers, ['pembahasan', 'penjelasan']);
  const optionIdx = OPTION_LETTERS.map((letter) =>
    findColumn(headers, [`opsi_${letter.toLowerCase()}`, `opsi ${letter.toLowerCase()}`, letter.toLowerCase()])
  );

  const missing: string[] = [];
  if (kategoriIdx === -1) missing.push('materi/kategori');
  if (pertanyaanIdx === -1) missing.push('pertanyaan');
  if (kunciIdx === -1) missing.push('kunci');
  if (optionIdx.filter((i) => i !== -1).length < 2) missing.push('opsi_a..opsi_e (minimal 2)');

  if (missing.length > 0) {
    return {
      questions: [],
      warnings: [`Kolom wajib tidak ditemukan di header CSV: ${missing.join(', ')}`],
      ignoredColumns: [],
    };
  }

  const usedIdx = new Set([kategoriIdx, pertanyaanIdx, kunciIdx, pembahasanIdx, ...optionIdx].filter((i) => i !== -1));
  const ignoredColumns = headers.filter((_, idx) => !usedIdx.has(idx));

  const questions: CsvQuestion[] = [];

  for (let r = 1; r < rows.length; r++) {
    let row = rows[r];
    const rowNumber = r + 1; // termasuk baris header, sesuai nomor baris asli di file

    // Jika kolom teks bebas (biasanya pembahasan, kolom terakhir) mengandung karakter
    // delimiter tanpa dibungkus tanda kutip, baris akan terpecah jadi lebih banyak
    // kolom dari yang diharapkan. Gabungkan kembali kolom-kolom berlebih ke kolom
    // terakhir supaya teksnya tidak terpotong.
    if (row.length > headers.length) {
      const merged = row.slice(0, headers.length - 1);
      merged.push(row.slice(headers.length - 1).join(delimiter));
      row = merged;
    }

    const kategori = (row[kategoriIdx] ?? '').trim() || 'Tidak Berkategori';
    const pertanyaan = (row[pertanyaanIdx] ?? '').trim();
    const kunci = (row[kunciIdx] ?? '').trim().toUpperCase();
    const pembahasan = pembahasanIdx !== -1 ? (row[pembahasanIdx] ?? '').trim() : '';

    const opsi = OPTION_LETTERS.map((letter, i) => ({
      letter,
      text: optionIdx[i] !== -1 ? (row[optionIdx[i]] ?? '').trim() : '',
    })).filter((o) => o.text !== '');

    if (!pertanyaan || opsi.length < 2) {
      warnings.push(`Baris ${rowNumber} dilewati: teks soal kosong atau opsi kurang dari 2.`);
      continue;
    }
    if (!kunci || !opsi.some((o) => o.letter === kunci)) {
      warnings.push(`Baris ${rowNumber} dilewati: kunci "${kunci}" tidak cocok dengan opsi yang ada (${opsi.map((o) => o.letter).join(', ')}).`);
      continue;
    }

    questions.push({ kategori, pertanyaan, opsi, kunci, pembahasan });
  }

  return { questions, warnings, ignoredColumns };
}
