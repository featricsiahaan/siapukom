import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        _count: { select: { questions: { where: { status: 'ACTIVE' } } } },
      },
    });
    res.json({
      categories: categories.map((c) => ({ id: c.id, name: c.name, questionCount: c._count.questions })),
    });
  })
);

export default router;
