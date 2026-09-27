/**
 * Fase 2 (prd.md §9): ekspor soal ke CSV untuk ditelaah manual (oleh Featric atau dosen
 * penelaah) — mengisi area kompetensi, kategori sumber, aspek keputusan, dan rujukan sumber
 * per soal, sesuai kamus data Panduan Induk §12. Hasilnya diimpor balik lewat importTelaah.ts.
 *
 * Kolom baca-saja (jangan diedit, hanya konteks): id, kategori, moduleId_saat_ini, pertanyaan,
 * opsi, kunci, pembahasan, status_saat_ini.
 * Kolom yang DIISI penelaah: primaryArea, secondaryAreas (pisahkan dengan ";" jika lebih dari
 * satu, contoh "A1_KESELAMATAN_PASIEN;A3_PROSEDUR_INTERVENSI_KLINIS"), sourceCategory,
 * decisionType, sourceDocument, sourceTable, sourcePage, sourceVerificationStatus, reviewer,
 * status_baru (kosongkan jika belum mau mengubah status).
 *
 * Nilai enum yang valid ada di README.md bagian "Telaah taksonomi SKD 2026".
 *
 * Usage:
 *   npx ts-node scripts/exportTelaah.ts --out soal-neurologi.csv --moduleId M01_SISTEM_SARAF
 *   npx ts-node scripts/exportTelaah.ts --out belum-ditelaah.csv --untelaah
 *   npx ts-node scripts/exportTelaah.ts --out kategori-bedah.csv --category Bedah
 *   npx ts-node scripts/exportTelaah.ts --out semua.csv --limit 500
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { toCsv } from './csvUtil';

const prisma = new PrismaClient();

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

const HEADERS = [
  'id',
  'kategori',
  'moduleId_saat_ini',
  'pertanyaan',
  'opsi',
  'kunci',
  'pembahasan',
  'status_saat_ini',
  'primaryArea',
  'secondaryAreas',
  'sourceCategory',
  'decisionType',
  'sourceDocument',
  'sourceTable',
  'sourcePage',
  'sourceVerificationStatus',
  'reviewer',
  'status_baru',
];

async function main() {
  const outArg = argValue('--out');
  if (!outArg) {
    console.error('Wajib isi --out <nama-file.csv>');
    process.exit(1);
  }

  const category = argValue('--category');
  const moduleId = argValue('--moduleId');
  const status = argValue('--status');
  const untelaah = process.argv.includes('--untelaah');
  const limit = Number(argValue('--limit') ?? '1000');

  const where: any = {};
  if (category) {
    const cat = await prisma.category.findFirst({ where: { name: { equals: category, mode: 'insensitive' } } });
    if (!cat) {
      console.error(`Kategori "${category}" tidak ditemukan.`);
      process.exit(1);
    }
    where.categoryId = cat.id;
  }
  if (moduleId) where.moduleId = moduleId;
  if (status) where.status = status;
  if (untelaah) where.primaryArea = null;

  const questions = await prisma.question.findMany({
    where,
    include: { category: true },
    orderBy: [{ categoryId: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  });

  const rows = questions.map((q) => {
    const opsi = (q.opsi as { letter: string; text: string }[])
      .map((o) => `${o.letter}) ${o.text}`)
      .join(' | ');
    return [
      q.id,
      q.category.name,
      q.moduleId ?? '',
      q.pertanyaan,
      opsi,
      q.kunci,
      q.pembahasan,
      q.status,
      q.primaryArea ?? '',
      (q.secondaryAreas ?? []).join(';'),
      q.sourceCategory ?? '',
      q.decisionType ?? '',
      q.sourceDocument ?? '',
      q.sourceTable ?? '',
      q.sourcePage ?? '',
      q.sourceVerificationStatus ?? '',
      q.reviewer ?? '',
      '',
    ];
  });

  const csv = toCsv(HEADERS, rows);
  const outPath = path.resolve(outArg);
  fs.writeFileSync(outPath, csv, 'utf-8');

  console.log(`${questions.length} soal diekspor ke ${outPath}`);
  console.log('Isi kolom primaryArea, secondaryAreas, sourceCategory, decisionType, sourceDocument, sourceTable,');
  console.log('sourcePage, sourceVerificationStatus, reviewer, dan status_baru (opsional) lalu jalankan importTelaah.ts.');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
