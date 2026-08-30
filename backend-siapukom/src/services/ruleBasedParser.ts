export interface ParsedQuestion {
  kategori: string;
  pertanyaan: string;
  opsi: { letter: string; text: string }[];
  kunci: string;
  pembahasan: string;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  warnings: string[];
}

const KATEGORI_RE = /^kategori\s*:\s*(.+)$/i;
const QUESTION_START_RE = /^(\d+)[.)]\s*(.*)$/;
const OPTION_RE = /^([A-Ea-e])[.)]\s*(.*)$/;
const KUNCI_RE = /^(?:kunci|jawaban)\s*:\s*([A-Ea-e])\b(.*)$/i;
const PEMBAHASAN_RE = /^(?:pembahasan|penjelasan)\s*:\s*(.*)$/i;

const DEFAULT_KATEGORI = 'Tidak Berkategori';

type Draft = {
  nomor: number;
  kategori: string;
  pertanyaanLines: string[];
  opsi: { letter: string; text: string }[];
  kunci: string;
  pembahasanLines: string[];
  phase: 'pertanyaan' | 'opsi' | 'pembahasan';
};

function finalizeDraft(draft: Draft | null, warnings: string[], out: ParsedQuestion[]) {
  if (!draft) return;
  const pertanyaan = draft.pertanyaanLines.join(' ').trim();
  const pembahasan = draft.pembahasanLines.join(' ').trim();

  if (!pertanyaan || draft.opsi.length < 2 || !draft.kunci) {
    warnings.push(
      `Soal nomor ${draft.nomor} dilewati: ${!pertanyaan ? 'teks soal kosong' : draft.opsi.length < 2 ? 'opsi jawaban kurang dari 2' : 'kunci jawaban tidak ditemukan'}.`
    );
    return;
  }

  const validLetters = draft.opsi.map((o) => o.letter.toUpperCase());
  if (!validLetters.includes(draft.kunci.toUpperCase())) {
    warnings.push(`Soal nomor ${draft.nomor} dilewati: kunci "${draft.kunci}" tidak cocok dengan opsi yang ada (${validLetters.join(', ')}).`);
    return;
  }

  out.push({
    kategori: draft.kategori,
    pertanyaan,
    opsi: draft.opsi,
    kunci: draft.kunci.toUpperCase(),
    pembahasan,
  });
}

export function parseQuestionsFromText(text: string): ParseResult {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim());

  const questions: ParsedQuestion[] = [];
  const warnings: string[] = [];

  let currentKategori = DEFAULT_KATEGORI;
  let draft: Draft | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const kategoriMatch = line.match(KATEGORI_RE);
    if (kategoriMatch) {
      finalizeDraft(draft, warnings, questions);
      draft = null;
      currentKategori = kategoriMatch[1].trim();
      continue;
    }

    const questionMatch = line.match(QUESTION_START_RE);
    if (questionMatch) {
      finalizeDraft(draft, warnings, questions);
      draft = {
        nomor: Number(questionMatch[1]),
        kategori: currentKategori,
        pertanyaanLines: questionMatch[2] ? [questionMatch[2]] : [],
        opsi: [],
        kunci: '',
        pembahasanLines: [],
        phase: 'pertanyaan',
      };
      continue;
    }

    if (!draft) {
      // Baris di luar konteks soal (mis. judul dokumen) — abaikan.
      continue;
    }

    const optionMatch = line.match(OPTION_RE);
    if (optionMatch && draft.phase !== 'pembahasan') {
      draft.phase = 'opsi';
      draft.opsi.push({ letter: optionMatch[1].toUpperCase(), text: optionMatch[2].trim() });
      continue;
    }

    const kunciMatch = line.match(KUNCI_RE);
    if (kunciMatch) {
      draft.kunci = kunciMatch[1].toUpperCase();
      draft.phase = 'pembahasan';
      const rest = kunciMatch[2]?.replace(/^[.\s)]+/, '').trim();
      if (rest) draft.pembahasanLines.push(rest);
      continue;
    }

    const pembahasanMatch = line.match(PEMBAHASAN_RE);
    if (pembahasanMatch) {
      draft.phase = 'pembahasan';
      if (pembahasanMatch[1]) draft.pembahasanLines.push(pembahasanMatch[1].trim());
      continue;
    }

    // Baris lanjutan — masuk ke buffer sesuai fase saat ini.
    if (draft.phase === 'pertanyaan') {
      draft.pertanyaanLines.push(line);
    } else if (draft.phase === 'opsi' && draft.opsi.length > 0) {
      draft.opsi[draft.opsi.length - 1].text += ` ${line}`;
    } else if (draft.phase === 'pembahasan') {
      draft.pembahasanLines.push(line);
    }
  }

  finalizeDraft(draft, warnings, questions);

  return { questions, warnings };
}
