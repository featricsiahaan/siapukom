/**
 * Terapkan keputusan dokter (CSV dari lembarTelaahToCsv.py) ke database.
 * Soal dicocokkan lewat teks `pertanyaan` persis di dalam kategori yang sama.
 *
 * Pemetaan keputusan -> status:
 *   SETUJU -> ACTIVE   (hanya bila Penelaah terisi dan kunci dokter kosong/sama dengan kunci saat ini)
 *   REVISI -> DITAHAN  (perlu ditulis ulang)
 *   TAHAN  -> DITAHAN
 *   TOLAK  -> DIARSIPKAN
 * Bila "kunci_dokter" berbeda dari kunci saat ini, soal TIDAK diaktifkan: status DITAHAN dan baris
 * dilaporkan, karena perubahan kunci memerlukan telaah ulang (Panduan Induk s12).
 * sourceVerificationStatus tidak diubah: aktifnya soal tidak berarti sitasi sudah terverifikasi.
 *
 * Usage:
 *   npx ts-node scripts/applyLembarTelaah.ts keputusan.csv           # dry-run
 *   npx ts-node scripts/applyLembarTelaah.ts keputusan.csv --apply   # tulis ke DB
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { rowsToRecords } from './csvUtil';

const prisma = new PrismaClient();

const STATUS_BY_DECISION: Record<string, 'ACTIVE' | 'DITAHAN' | 'DIARSIPKAN'> = {
  SETUJU: 'ACTIVE',
  REVISI: 'DITAHAN',
  TAHAN: 'DITAHAN',
  TOLAK: 'DIARSIPKAN',
};

function norm(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

async function main() {
  const input = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!input || input.startsWith('--')) {
    console.error('Usage: npx ts-node scripts/applyLembarTelaah.ts <keputusan.csv> [--apply]');
    process.exit(1);
  }

  const records = rowsToRecords(fs.readFileSync(path.resolve(input), 'utf-8'));
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'} | ${records.length} keputusan\n`);

  const tally: Record<string, number> = {};
  let problems = 0;

  for (const r of records) {
    const id = r.question_id;
    const decision = (r.keputusan ?? '').toUpperCase();
    const target = STATUS_BY_DECISION[decision];
    if (!target) {
      problems++;
      console.error(`${id}: keputusan "${r.keputusan}" tidak dikenal (SETUJU/REVISI/TAHAN/TOLAK).`);
      continue;
    }

    const matches = await prisma.question.findMany({
      where: { category: { name: r.kategori } },
      select: { id: true, pertanyaan: true, kunci: true, status: true },
    });
    const wanted = norm(r.soal);
    const found = matches.filter((q) => norm(q.pertanyaan) === wanted);
    if (found.length !== 1) {
      problems++;
      console.error(`${id}: ${found.length === 0 ? 'soal tidak ditemukan' : 'cocok ke lebih dari satu soal'} di kategori "${r.kategori}".`);
      continue;
    }
    const q = found[0];

    let status = target;
    const keyChanged = !!r.kunci_dokter && r.kunci_dokter !== q.kunci;
    if (decision === 'SETUJU' && keyChanged) {
      status = 'DITAHAN';
      console.warn(`${id}: dokter menyarankan kunci ${r.kunci_dokter} (saat ini ${q.kunci}); ditahan untuk penulisan ulang.`);
    } else if (decision === 'SETUJU' && !r.penelaah) {
      problems++;
      console.error(`${id}: SETUJU tanpa nama Penelaah, dilewati (akuntabilitas wajib).`);
      continue;
    }

    tally[status] = (tally[status] ?? 0) + 1;
    if (apply) {
      const date = r.tanggal ? new Date(r.tanggal) : new Date();
      await prisma.question.update({
        where: { id: q.id },
        data: {
          status,
          reviewer: r.penelaah || undefined,
          reviewDate: Number.isNaN(date.getTime()) ? new Date() : date,
        },
      });
    }
  }

  console.log(`\nRingkasan: ${JSON.stringify(tally)} | bermasalah/dilewati: ${problems}`);
  if (!apply) console.log('Jalankan ulang dengan --apply untuk menulis ke database.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
