import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';

const router = Router();

export const SHARE_BONUS_DAYS = 3;
export const SHARE_MAX_APPROVED = 5;

router.get(
  '/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [membership, claims] = await Promise.all([
      prisma.membership.findUnique({ where: { userId: req.user!.id } }),
      prisma.shareClaim.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    const approved = await prisma.shareClaim.count({ where: { userId: req.user!.id, status: 'DISETUJUI' } });
    const pending = claims.some((c) => c.status === 'MENUNGGU');
    const eligible = req.user!.role === 'ADMIN' || membership?.plan === 'Akses Penuh';
    res.json({
      bonusDays: SHARE_BONUS_DAYS,
      jumlahTeman: SHARE_JUMLAH_TEMAN,
      maxApproved: SHARE_MAX_APPROVED,
      approved,
      pending,
      canClaim: eligible && !pending && approved < SHARE_MAX_APPROVED,
      eligible,
      claims: claims.map((c) => ({ id: c.id, platform: c.platform, status: c.status, createdAt: c.createdAt })),
    });
  })
);

export const SHARE_JUMLAH_TEMAN = 5;
const MAX_FOTO_CHARS = 450_000;

const claimSchema = z.object({
  instagram: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, ''))
    .pipe(z.string().regex(/^[A-Za-z0-9._]{1,30}$/, 'Username Instagram tidak valid')),
  bukti: z.string().trim().max(500).optional(),
  screenshots: z
    .array(
      z
        .string()
        .startsWith('data:image/jpeg;base64,', 'Format gambar harus JPEG')
        .max(MAX_FOTO_CHARS, 'Ukuran gambar terlalu besar')
    )
    .length(SHARE_JUMLAH_TEMAN, `Wajib melampirkan ${SHARE_JUMLAH_TEMAN} screenshot`),
});

router.post(
  '/claim',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { instagram, bukti, screenshots } = claimSchema.parse(req.body);
    const membership = await prisma.membership.findUnique({ where: { userId: req.user!.id } });
    if (req.user!.role !== 'ADMIN' && membership?.plan !== 'Akses Penuh') {
      throw new HttpError(403, 'Promo ini khusus peserta Akses Penuh');
    }
    if (await prisma.shareClaim.findFirst({ where: { userId: req.user!.id, status: 'MENUNGGU' } })) {
      throw new HttpError(409, 'Klaim sebelumnya masih menunggu verifikasi admin');
    }
    const approved = await prisma.shareClaim.count({ where: { userId: req.user!.id, status: 'DISETUJUI' } });
    if (approved >= SHARE_MAX_APPROVED) {
      throw new HttpError(400, `Batas bonus tercapai (maksimal ${SHARE_MAX_APPROVED}x)`);
    }
    await prisma.shareClaim.create({
      data: { userId: req.user!.id, platform: 'Share ke 5 teman', instagram, bukti: bukti || null, screenshots, bonusDays: SHARE_BONUS_DAYS },
    });
    res.status(201).json({ ok: true });
  })
);

export default router;
