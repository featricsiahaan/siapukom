import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { levelFor, percentage } from '../utils/scoring';

const router = Router();

const LAST_N_SESSIONS = 5;

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const [user, membership, recentSessions] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.membership.findUnique({ where: { userId } }),
      prisma.practiceSession.findMany({
        where: { userId, status: 'FINISHED' },
        orderBy: { finishedAt: 'desc' },
        take: LAST_N_SESSIONS,
        include: { answers: { include: { question: { include: { category: true } } } } },
      }),
    ]);

    if (!user) throw new HttpError(404, 'Pengguna tidak ditemukan');

    const byCategory = new Map<string, { correct: number; total: number }>();
    for (const session of recentSessions) {
      for (const a of session.answers) {
        const name = a.question.category.name;
        const entry = byCategory.get(name) ?? { correct: 0, total: 0 };
        entry.total += 1;
        if (a.isCorrect) entry.correct += 1;
        byCategory.set(name, entry);
      }
    }

    const categories = Array.from(byCategory.entries()).map(([name, v]) => {
      const score = percentage(v.correct, v.total);
      const info = levelFor(score);
      return { name, score, scorePercent: `${score}%`, ...info };
    });

    const hasData = categories.length > 0;
    const overall = hasData
      ? Math.round(categories.reduce((sum, c) => sum + c.score, 0) / categories.length)
      : 0;
    const overallInfo = levelFor(overall);
    const circumference = 2 * Math.PI * 60;

    res.json({
      nama: user.nama,
      initial: user.nama.trim()[0]?.toUpperCase() ?? 'P',
      membership: membership
        ? {
            plan: membership.plan,
            expiry: membership.expiryDate,
            sessionsUsed: membership.sessionsUsed,
            sessionsTotal: membership.sessionsTotal,
            sessionsPercent:
              membership.sessionsTotal > 0
                ? `${Math.round((membership.sessionsUsed / membership.sessionsTotal) * 100)}%`
                : '0%',
          }
        : null,
      readiness: {
        hasData,
        score: overall,
        label: overallInfo.level,
        color: overallInfo.badgeText,
        dasharray: `${(overall / 100) * circumference} ${circumference}`,
      },
      categories,
    });
  })
);

export default router;
