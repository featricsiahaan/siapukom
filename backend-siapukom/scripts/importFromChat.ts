/**
 * Importer for questions extracted manually (by Claude, in chat) from files the
 * user uploads that the rule-based parser can't handle (scans/images, messy
 * layouts, etc). Takes a JSON file of already-structured questions and inserts
 * them the same way POST /api/admin/import does: dedupe category by name
 * (case-insensitive, auto-create if missing), status DRAFT, sourceFile tag.
 *
 * Usage: npx ts-node scripts/importFromChat.ts <path-to-questions.json>
 *
 * JSON shape:
 * {
 *   "sourceFile": "nama-file-asli.pdf",
 *   "questions": [
 *     {
 *       "kategori": "Kardiovaskular",
 *       "pertanyaan": "...",
 *       "opsi": [{ "letter": "A", "text": "..." }, ...],
 *       "kunci": "B",
 *       "pembahasan": "...",
 *       "imageUrl": "https://upload.wikimedia.org/... (optional)",
 *       "imageAttribution": "Sumber, lisensi (optional)"
 *     }
 *   ]
 * }
 */
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const questionSchema = z.object({
  kategori: z.string().trim().min(1),
  pertanyaan: z.string().trim().min(1),
  opsi: z.array(z.object({ letter: z.string().trim().min(1), text: z.string().trim().min(1) })).min(2),
  kunci: z.string().trim().min(1),
  pembahasan: z.string().trim().default(''),
  imageUrl: z.string().trim().url().optional(),
  imageAttribution: z.string().trim().optional(),
});

const fileSchema = z.object({
  sourceFile: z.string().trim().min(1),
  questions: z.array(questionSchema).min(1),
});

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: npx ts-node scripts/importFromChat.ts <path-to-questions.json>');
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(inputPath), 'utf-8');
  const parsed = fileSchema.parse(JSON.parse(raw));

  const categoryIdByName = new Map<string, string>();
  const categoriesCreated: string[] = [];
  const created: { id: string; kategori: string; pertanyaan: string }[] = [];

  for (const q of parsed.questions) {
    const kategoriKey = q.kategori.toLowerCase();
    if (!categoryIdByName.has(kategoriKey)) {
      const existing = await prisma.category.findFirst({
        where: { name: { equals: q.kategori, mode: 'insensitive' } },
      });
      if (existing) {
        categoryIdByName.set(kategoriKey, existing.id);
      } else {
        const category = await prisma.category.create({ data: { name: q.kategori } });
        categoryIdByName.set(kategoriKey, category.id);
        categoriesCreated.push(q.kategori);
      }
    }

    const question = await prisma.question.create({
      data: {
        categoryId: categoryIdByName.get(kategoriKey)!,
        pertanyaan: q.pertanyaan,
        opsi: q.opsi,
        kunci: q.kunci,
        pembahasan: q.pembahasan,
        status: 'DRAFT',
        sourceFile: parsed.sourceFile,
        imageUrl: q.imageUrl,
        imageAttribution: q.imageAttribution,
      },
    });
    created.push({ id: question.id, kategori: q.kategori, pertanyaan: q.pertanyaan.slice(0, 60) });
  }

  console.log(JSON.stringify({ imported: created.length, categoriesCreated, questions: created }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
