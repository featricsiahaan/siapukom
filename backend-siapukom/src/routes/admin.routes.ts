import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { extractTextFromDocument } from '../services/documentText';
import { parseQuestionsFromText } from '../services/ruleBasedParser';

const router = Router();
router.use(requireAuth, requireAdmin);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.post(
  '/import',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'File tidak ditemukan (field "file")');

    const text = await extractTextFromDocument(req.file.buffer, req.file.mimetype, req.file.originalname);
    const { questions: extracted, warnings } = parseQuestionsFromText(text);

    if (extracted.length === 0) {
      return res.json({ imported: 0, categoriesCreated: [], questions: [], warnings });
    }

    const categoriesCreated: string[] = [];
    const categoryIdByName = new Map<string, string>();

    const created = [];
    for (const q of extracted) {
      const kategoriName = q.kategori?.trim() || 'Tidak Berkategori';
      if (!categoryIdByName.has(kategoriName)) {
        const existing = await prisma.category.findFirst({
          where: { name: { equals: kategoriName, mode: 'insensitive' } },
        });
        if (existing) {
          categoryIdByName.set(kategoriName, existing.id);
        } else {
          const category = await prisma.category.create({ data: { name: kategoriName } });
          categoryIdByName.set(kategoriName, category.id);
          categoriesCreated.push(kategoriName);
        }
      }

      const question = await prisma.question.create({
        data: {
          categoryId: categoryIdByName.get(kategoriName)!,
          pertanyaan: q.pertanyaan,
          opsi: q.opsi,
          kunci: q.kunci,
          pembahasan: q.pembahasan,
          status: 'DRAFT',
          sourceFile: req.file.originalname,
        },
        include: { category: true },
      });
      created.push(question);
    }

    res.status(201).json({
      imported: created.length,
      categoriesCreated,
      warnings,
      questions: created.map((q) => ({
        id: q.id,
        kategori: q.category.name,
        pertanyaan: q.pertanyaan,
        opsi: q.opsi,
        kunci: q.kunci,
        pembahasan: q.pembahasan,
      })),
    });
  })
);

router.get(
  '/questions',
  asyncHandler(async (req, res) => {
    const status = req.query.status === 'ACTIVE' ? 'ACTIVE' : req.query.status === 'DRAFT' ? 'DRAFT' : undefined;
    const questions = await prisma.question.findMany({
      where: status ? { status } : undefined,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      questions: questions.map((q) => ({
        id: q.id,
        kategori: q.category.name,
        categoryId: q.categoryId,
        pertanyaan: q.pertanyaan,
        opsi: q.opsi,
        kunci: q.kunci,
        pembahasan: q.pembahasan,
        status: q.status,
        sourceFile: q.sourceFile,
        createdAt: q.createdAt,
      })),
    });
  })
);

const updateSchema = z.object({
  kategori: z.string().trim().min(1).optional(),
  pertanyaan: z.string().trim().min(1).optional(),
  opsi: z.array(z.object({ letter: z.string(), text: z.string() })).min(2).optional(),
  kunci: z.string().trim().min(1).optional(),
  pembahasan: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE']).optional(),
});

router.patch(
  '/questions/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const body = updateSchema.parse(req.body);

    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Soal tidak ditemukan');

    let categoryId: string | undefined;
    if (body.kategori) {
      const category = await prisma.category.upsert({
        where: { name: body.kategori },
        update: {},
        create: { name: body.kategori },
      });
      categoryId = category.id;
    }

    const updated = await prisma.question.update({
      where: { id },
      data: {
        categoryId,
        pertanyaan: body.pertanyaan,
        opsi: body.opsi,
        kunci: body.kunci,
        pembahasan: body.pembahasan,
        status: body.status,
      },
      include: { category: true },
    });

    res.json({
      id: updated.id,
      kategori: updated.category.name,
      pertanyaan: updated.pertanyaan,
      opsi: updated.opsi,
      kunci: updated.kunci,
      pembahasan: updated.pembahasan,
      status: updated.status,
    });
  })
);

router.post(
  '/questions/approve-batch',
  asyncHandler(async (req, res) => {
    const { ids } = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);
    const result = await prisma.question.updateMany({
      where: { id: { in: ids } },
      data: { status: 'ACTIVE' },
    });
    res.json({ approved: result.count });
  })
);

router.delete(
  '/questions/:id',
  asyncHandler(async (req, res) => {
    await prisma.question.delete({ where: { id: req.params.id } }).catch(() => {
      throw new HttpError(404, 'Soal tidak ditemukan');
    });
    res.status(204).send();
  })
);

export default router;
