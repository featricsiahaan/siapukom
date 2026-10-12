/**
 * Backup seluruh tabel database ke satu file `backups/siapukom-YYYY-MM-DD_HHmm.json.gz`.
 * Tidak butuh pg_dump. Membaca semua model lewat Prisma (kolom Bytes disimpan sebagai base64).
 * File berisi data pribadi (email, hash kata sandi): JANGAN di-commit atau dibagikan.
 *
 * Usage:  npx ts-node scripts/backupDb.ts [--keep=8]
 * Pemulihan: scripts/restoreDb.ts (ke database KOSONG, mis. branch Neon baru).
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const keepArg = process.argv.find((a) => a.startsWith('--keep='));
const keep = keepArg ? Number(keepArg.split('=')[1]) : 8;

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function replacer(_key: string, value: unknown) {
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return { __bytes: Buffer.from(value as Uint8Array).toString('base64') };
  }
  if (typeof value === 'bigint') return { __bigint: value.toString() };
  return value;
}

async function main() {
  const models = Prisma.dmmf.datamodel.models.map((m) => m.name);
  const dump: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const name of models) {
    const rows = await (prisma as any)[lowerFirst(name)].findMany();
    dump[name] = rows;
    counts[name] = rows.length;
  }

  const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '');
  const dir = path.resolve(__dirname, '..', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `siapukom-${stamp}.json.gz`);
  const payload = JSON.stringify({ createdAt: new Date().toISOString(), counts, data: dump }, replacer);
  fs.writeFileSync(file, zlib.gzipSync(payload));

  // Verifikasi: baca ulang dan cocokkan jumlah baris.
  const back = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf-8'));
  const ok = models.every((m) => back.data[m].length === counts[m]);
  console.log(`Backup: ${file} (${(fs.statSync(file).size / 1024 / 1024).toFixed(2)} MB)`);
  console.log('Jumlah baris:', JSON.stringify(counts));
  console.log(ok ? 'Verifikasi baca-ulang: OK' : 'Verifikasi baca-ulang: GAGAL');

  const files = fs.readdirSync(dir).filter((f) => f.startsWith('siapukom-') && f.endsWith('.json.gz')).sort();
  for (const old of files.slice(0, Math.max(0, files.length - keep))) {
    fs.unlinkSync(path.join(dir, old));
    console.log('Backup lama dihapus:', old);
  }
  await prisma.$disconnect();
  if (!ok) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
