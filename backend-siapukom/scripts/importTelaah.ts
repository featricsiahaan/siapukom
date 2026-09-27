/**
 * Pasangan exportTelaah.ts: membaca kembali CSV yang sudah diisi kolom telaah, validasi tiap
 * baris, lalu menulis ke database. Baris yang semua kolom editable-nya kosong dilewati (tidak
 * dianggap error) — biar reviewer bisa mengekspor batch besar dan hanya mengisi sebagian.
 *
 * Usage:
 *   npx ts-node scripts/importTelaah.ts soal-neurologi.csv            # dry-run, validasi saja
 *   npx ts-node scripts/importTelaah.ts soal-neurologi.csv --apply     # tulis ke DB
 */
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { rowsToRecords } from './csvUtil';

const prisma = new PrismaClient();

const AREA_VALUES = [
  'A1_KESELAMATAN_PASIEN',
  'A2_PENATALAKSANAAN_KLINIS',
  'A3_PROSEDUR_INTERVENSI_KLINIS',
  'A4_PROMOTIF_PREVENTIF',
  'A5_PROFESIONALISME',
] as const;

const STATUS_VALUES = [
  'DRAFT',
  'TELAAH_SUMBER',
  'TELAAH_KLINIS',
  'TELAAH_SOAL',
  'SIAP_UJI_COBA',
  'ACTIVE',
  'DITAHAN',
  'DIARSIPKAN',
] as const;

const rowSchema = z.object({
  id: z.string().trim().min(1),
  primaryArea: z.enum(AREA_VALUES).optional().or(z.literal('')),
  secondaryAreas: z.string().optional().or(z.literal('')),
  sourceCategory: z.enum(['TUNTAS', 'AWAL_RUJUK', 'RUJUK_BALIK', 'BELUM_TERVERIFIKASI', 'PENGAYAAN']).optional().or(z.literal('')),
  decisionType: z
    .enum(['DIAGNOSIS', 'PEMERIKSAAN', 'INTERPRETASI', 'TERAPI', 'STABILISASI', 'RUJUKAN', 'PENCEGAHAN', 'KESELAMATAN', 'ETIK'])
    .optional()
    .or(z.literal('')),
  sourceDocument: z.string().optional(),
  sourceTable: z.string().optional(),
  sourcePage: z.string().optional(),
  sourceVerificationStatus: z.string().optional(),
  reviewer: z.string().optional(),
  status_baru: z.enum(STATUS_VALUES).optional().or(z.literal('')),
});

async function main() {
  const inputArg = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!inputArg || inputArg.startsWith('--')) {
    console.error('Usage: npx ts-node scripts/importTelaah.ts <file.csv> [--apply]');
    process.exit(1);
  }

  const text = fs.readFileSync(path.resolve(inputArg), 'utf-8');
  const records = rowsToRecords(text);

  console.log(`Mode: ${apply ? 'APPLY (menulis ke DB)' : 'DRY-RUN (tidak menulis apa pun)'}`);
  console.log(`${records.length} baris ditemukan di CSV.\n`);

  let skipped = 0;
  let invalid = 0;
  let applied = 0;

  for (const [i, raw] of records.entries()) {
    const rowNumber = i + 2; // +1 header, +1 index 0-based

    const editableTouched = [
      raw.primaryArea,
      raw.secondaryAreas,
      raw.sourceCategory,
      raw.decisionType,
      raw.sourceDocument,
      raw.sourceTable,
      raw.sourcePage,
      raw.sourceVerificationStatus,
      raw.reviewer,
      raw.status_baru,
    ].some((v) => (v ?? '').trim() !== '');

    if (!editableTouched) {
      skipped++;
      continue;
    }

    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) {
      invalid++;
      console.error(`Baris ${rowNumber} (id=${raw.id}) tidak valid:`, parsed.error.issues.map((iss) => iss.message).join('; '));
      continue;
    }

    const secondaryAreas = (parsed.data.secondaryAreas ?? '')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s !== '');
    const invalidSecondary = secondaryAreas.filter((s) => !(AREA_VALUES as readonly string[]).includes(s));
    if (invalidSecondary.length > 0) {
      invalid++;
      console.error(`Baris ${rowNumber} (id=${raw.id}): secondaryAreas tidak dikenal: ${invalidSecondary.join(', ')}`);
      continue;
    }

    const existing = await prisma.question.findUnique({ where: { id: parsed.data.id } });
    if (!existing) {
      invalid++;
      console.error(`Baris ${rowNumber}: soal id=${parsed.data.id} tidak ditemukan di database.`);
      continue;
    }

    if (apply) {
      await prisma.question.update({
        where: { id: parsed.data.id },
        data: {
          primaryArea: parsed.data.primaryArea || undefined,
          secondaryAreas: secondaryAreas.length > 0 ? (secondaryAreas as any) : undefined,
          sourceCategory: parsed.data.sourceCategory || undefined,
          decisionType: parsed.data.decisionType || undefined,
          sourceDocument: parsed.data.sourceDocument || undefined,
          sourceTable: parsed.data.sourceTable || undefined,
          sourcePage: parsed.data.sourcePage || undefined,
          sourceVerificationStatus: parsed.data.sourceVerificationStatus || undefined,
          reviewer: parsed.data.reviewer || undefined,
          status: parsed.data.status_baru || undefined,
          reviewDate: new Date(),
        },
      });
    }
    applied++;
  }

  console.log(`\nRingkasan: ${applied} baris ${apply ? 'diperbarui' : 'valid dan siap diperbarui'}, ${skipped} baris dilewati (kosong), ${invalid} baris tidak valid.`);
  if (!apply && applied > 0) {
    console.log('Jalankan ulang dengan --apply untuk benar-benar menulis ke database.');
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
