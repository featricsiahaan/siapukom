import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { isAksesPenuhActive } from '../utils/membership';

const router = Router();

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

async function ensureSlideAccess(userId: string, role: string) {
  if (role === 'ADMIN') return;
  const membership = await prisma.membership.findUnique({ where: { userId } });
  if (!isAksesPenuhActive(membership)) {
    throw new HttpError(403, 'Fitur Materi Belajar khusus untuk pemegang Akses Penuh.');
  }
}

router.post(
  '/',
  requireAuth,
  requireAdmin,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'File tidak ditemukan (field "file")');
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      throw new HttpError(400, 'Format file harus PDF, JPG, atau PNG');
    }

    const { title, categoryId } = z
      .object({ title: z.string().trim().min(1), categoryId: z.string().trim().min(1).optional() })
      .parse(req.body);

    const slide = await prisma.slide.create({
      data: {
        title,
        categoryId: categoryId ?? null,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        fileData: req.file.buffer,
      },
      include: { category: true },
    });

    res.status(201).json({
      id: slide.id,
      title: slide.title,
      kategori: slide.category?.name ?? null,
      mimeType: slide.mimeType,
      fileSize: slide.fileSize,
      createdAt: slide.createdAt,
    });
  })
);

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    await ensureSlideAccess(req.user!.id, req.user!.role);

    const slides = await prisma.slide.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      slides: slides.map((s) => ({
        id: s.id,
        title: s.title,
        kategori: s.category?.name ?? null,
        mimeType: s.mimeType,
        fileSize: s.fileSize,
        createdAt: s.createdAt,
      })),
    });
  })
);

router.get(
  '/:id/file',
  requireAuth,
  asyncHandler(async (req, res) => {
    await ensureSlideAccess(req.user!.id, req.user!.role);

    const slide = await prisma.slide.findUnique({ where: { id: req.params.id } });
    if (!slide) throw new HttpError(404, 'Materi tidak ditemukan');

    res.setHeader('Content-Type', slide.mimeType);
    res.send(slide.fileData);
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.slide.delete({ where: { id: req.params.id } }).catch(() => {
      throw new HttpError(404, 'Materi tidak ditemukan');
    });
    res.status(204).send();
  })
);

export default router;
