import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { extractTextFromDocument } from '../services/documentText';
import { parseQuestionsFromText } from '../services/ruleBasedParser';
import { parseQuestionsFromCsv } from '../services/csvParser';

function isCsv(mimetype: string, filename: string): boolean {
  return mimetype === 'text/csv' || mimetype === 'application/vnd.ms-excel' || filename.toLowerCase().endsWith('.csv');
}

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

    let extracted: { kategori: string; pertanyaan: string; opsi: { letter: string; text: string }[]; kunci: string; pembahasan: string }[];
    let warnings: string[];

    if (isCsv(req.file.mimetype, req.file.originalname)) {
      const result = parseQuestionsFromCsv(req.file.buffer.toString('utf-8'));
      extracted = result.questions;
      warnings = result.warnings;
    } else {
      const text = await extractTextFromDocument(req.file.buffer, req.file.mimetype, req.file.originalname);
      const result = parseQuestionsFromText(text);
      extracted = result.questions;
      warnings = result.warnings;
    }

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
    const QUESTION_STATUSES = [
      'DRAFT',
      'TELAAH_SUMBER',
      'TELAAH_KLINIS',
      'TELAAH_SOAL',
      'SIAP_UJI_COBA',
      'ACTIVE',
      'DITAHAN',
      'DIARSIPKAN',
    ] as const;
    const status = QUESTION_STATUSES.includes(req.query.status as any) ? (req.query.status as string) : undefined;
    const questions = await prisma.question.findMany({
      where: status ? { status: status as any } : undefined,
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
        imageUrl: q.imageUrl,
        imageAttribution: q.imageAttribution,
        createdAt: q.createdAt,
        moduleId: q.moduleId,
        primaryArea: q.primaryArea,
        secondaryAreas: q.secondaryAreas,
        sourceCategory: q.sourceCategory,
        decisionType: q.decisionType,
        sourceDocument: q.sourceDocument,
        sourceTable: q.sourceTable,
        sourcePage: q.sourcePage,
        sourceVerificationStatus: q.sourceVerificationStatus,
        reviewer: q.reviewer,
        reviewDate: q.reviewDate,
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
  status: z
    .enum(['DRAFT', 'TELAAH_SUMBER', 'TELAAH_KLINIS', 'TELAAH_SOAL', 'SIAP_UJI_COBA', 'ACTIVE', 'DITAHAN', 'DIARSIPKAN'])
    .optional(),
  imageUrl: z.string().trim().url().nullable().optional(),
  imageAttribution: z.string().trim().nullable().optional(),
  // Metadata taksonomi SKD 2026 — lihat prd.md §6.1 dan Panduan Induk §12.
  moduleId: z
    .enum([
      'M01_SISTEM_SARAF', 'M02_PSIKIATRI', 'M03_SISTEM_INDERA', 'M04_RESPIRASI', 'M05_KARDIOVASKULER',
      'M06_GASTROINTESTINAL_HEPATOBILIER_PANKREAS', 'M07_GINJAL_SALURAN_KEMIH', 'M08_REPRODUKSI',
      'M09_ENDOKRIN_METABOLIK_NUTRISI', 'M10_HEMATO_IMUNOLOGI', 'M11_MUSKULOSKELETAL', 'M12_KULIT_INTEGUMEN',
      'M13_FORENSIK_MEDIKOLEGAL', 'M14_ANAK',
    ])
    .nullable()
    .optional(),
  primaryArea: z
    .enum(['A1_KESELAMATAN_PASIEN', 'A2_PENATALAKSANAAN_KLINIS', 'A3_PROSEDUR_INTERVENSI_KLINIS', 'A4_PROMOTIF_PREVENTIF', 'A5_PROFESIONALISME'])
    .nullable()
    .optional(),
  secondaryAreas: z
    .array(z.enum(['A1_KESELAMATAN_PASIEN', 'A2_PENATALAKSANAAN_KLINIS', 'A3_PROSEDUR_INTERVENSI_KLINIS', 'A4_PROMOTIF_PREVENTIF', 'A5_PROFESIONALISME']))
    .optional(),
  sourceCategory: z.enum(['TUNTAS', 'AWAL_RUJUK', 'RUJUK_BALIK', 'BELUM_TERVERIFIKASI', 'PENGAYAAN']).nullable().optional(),
  decisionType: z
    .enum(['DIAGNOSIS', 'PEMERIKSAAN', 'INTERPRETASI', 'TERAPI', 'STABILISASI', 'RUJUKAN', 'PENCEGAHAN', 'KESELAMATAN', 'ETIK'])
    .nullable()
    .optional(),
  sourceDocument: z.string().trim().nullable().optional(),
  sourceTable: z.string().trim().nullable().optional(),
  sourcePage: z.string().trim().nullable().optional(),
  sourceVerificationStatus: z.string().trim().nullable().optional(),
  reviewer: z.string().trim().nullable().optional(),
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

    // Menandai reviewer/status berarti sebuah tahap telaah baru saja terjadi
    // (Panduan Induk §11) — catat tanggalnya otomatis, jangan andalkan input manual.
    const isReviewAction = body.reviewer !== undefined || body.status !== undefined;

    const updated = await prisma.question.update({
      where: { id },
      data: {
        categoryId,
        pertanyaan: body.pertanyaan,
        opsi: body.opsi,
        kunci: body.kunci,
        pembahasan: body.pembahasan,
        status: body.status,
        imageUrl: body.imageUrl,
        imageAttribution: body.imageAttribution,
        moduleId: body.moduleId,
        primaryArea: body.primaryArea,
        secondaryAreas: body.secondaryAreas,
        sourceCategory: body.sourceCategory,
        decisionType: body.decisionType,
        sourceDocument: body.sourceDocument,
        sourceTable: body.sourceTable,
        sourcePage: body.sourcePage,
        sourceVerificationStatus: body.sourceVerificationStatus,
        reviewer: body.reviewer,
        reviewDate: isReviewAction ? new Date() : undefined,
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
      imageUrl: updated.imageUrl,
      imageAttribution: updated.imageAttribution,
      moduleId: updated.moduleId,
      primaryArea: updated.primaryArea,
      secondaryAreas: updated.secondaryAreas,
      sourceCategory: updated.sourceCategory,
      decisionType: updated.decisionType,
      sourceDocument: updated.sourceDocument,
      sourceTable: updated.sourceTable,
      sourcePage: updated.sourcePage,
      sourceVerificationStatus: updated.sourceVerificationStatus,
      reviewer: updated.reviewer,
      reviewDate: updated.reviewDate,
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
