/**
 * Pulihkan file backup ke database KOSONG. Sengaja menolak menulis ke database yang sudah
 * berisi data, supaya tidak menimpa produksi secara tidak sengaja. Pola aman:
 *   1. Buat branch/database Neon baru, jalankan `npx prisma db push` ke sana (skema saja).
 *   2. Arahkan DATABASE_URL ke database baru itu, lalu jalankan skrip ini.
 *   3. Bila hasilnya benar, baru ganti DATABASE_URL produksi.
 *
 * Usage:
 *   npx ts-node scripts/restoreDb.ts backups/siapukom-....json.gz          # dry-run
 *   npx ts-node scripts/restoreDb.ts backups/siapukom-....json.gz --apply  # tulis
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function reviver(_key: string, value: any) {
  if (value && typeof value === 'object') {
    if ('__bytes' in value) return Buffer.from(value.__bytes, 'base64');
    if ('__bigint' in value) return BigInt(value.__bigint);
  }
  return value;
}

// Urutkan model: tabel induk (yang dirujuk foreign key) lebih dulu.
function orderedModels(): string[] {
  const models = Prisma.dmmf.datamodel.models;
  const deps = new Map<string, Set<string>>();
  for (const m of models) {
    const d = new Set<string>();
    for (const f of m.fields) {
      if (f.kind === 'object' && f.relationFromFields && f.relationFromFields.length > 0 && f.type !== m.name) d.add(f.type);
    }
    deps.set(m.name, d);
  }
  const out: string[] = [];
  while (out.length < models.length) {
    const next = models.find((m) => !out.includes(m.name) && [...deps.get(m.name)!].every((x) => out.includes(x)));
    if (!next) throw new Error('Siklus dependensi antar tabel tidak terselesaikan');
    out.push(next.name);
  }
  return out;
}

async function main() {
  const input = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!input || input.startsWith('--')) {
    console.error('Usage: npx ts-node scripts/restoreDb.ts <backup.json.gz> [--apply]');
    process.exit(1);
  }
  const backup = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.resolve(input))).toString('utf-8'), reviver);
  const order = orderedModels();
  console.log(`Backup dibuat: ${backup.createdAt}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'} | urutan tabel: ${order.join(' -> ')}\n`);

  let existing = 0;
  for (const name of order) existing += await (prisma as any)[lowerFirst(name)].count();
  if (existing > 0) {
    console.error(`Database tujuan TIDAK kosong (${existing} baris). Pemulihan dibatalkan.`);
    process.exit(1);
  }

  for (const name of order) {
    const rows: any[] = backup.data[name] ?? [];
    console.log(`${name}: ${rows.length} baris`);
    if (!apply) continue;
    for (let i = 0; i < rows.length; i += 500) {
      await (prisma as any)[lowerFirst(name)].createMany({ data: rows.slice(i, i + 500) });
    }
  }
  console.log(apply ? '\nPemulihan selesai.' : '\nDry-run selesai. Jalankan ulang dengan --apply untuk menulis.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
