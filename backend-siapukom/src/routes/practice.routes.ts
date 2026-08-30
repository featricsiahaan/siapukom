import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { attachUserIfPresent } from '../middleware/auth';
import { shuffle } from '../utils/shuffle';
import { percentage } from '../utils/scoring';

const router = Router();

const startSessionSchema = z.object({
  categoryId: z.string().trim().min(1).optional(),
  jumlah: z.number().int().positive().max(150),
});

const answerSchema = z.object({
  order: z.number().int().nonnegative(),
  answerLetter: z.string().trim().length(1),
});

type Opsi = { letter: string; text: string };

function ensureSessionAccess(
  session: { userId: string | null },
  userId: string | undefined
) {
  if (session.userId && session.userId !== userId) {
    throw new HttpError(403, 'Sesi ini bukan milik Anda');
  }
}

router.post(
  '/sessions',
  attachUserIfPresent,
  asyncHandler(async (req, res) => {
    const { categoryId, jumlah } = startSessionSchema.parse(req.body);

    const pool = await prisma.question.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: { category: true },
    });

    const source = pool.length > 0 ? pool : await prisma.question.findMany({ include: { category: true } });
    if (source.length === 0) {
      throw new HttpError(503, 'Bank soal belum tersedia');
    }

    const picked = shuffle(source).slice(0, Math.min(jumlah, source.length));

    const session = await prisma.practiceSession.create({
      data: {
        userId: req.user?.id,
        categoryFilter: categoryId ?? null,
        totalQuestions: picked.length,
        answers: {
          create: picked.map((q, index) => ({
            questionId: q.id,
            order: index,
          })),
        },
      },
    });

    res.status(201).json({
      sessionId: session.id,
      questions: picked.map((q, index) => ({
        order: index,
        questionId: q.id,
        kategori: q.category.name,
        pertanyaan: q.pertanyaan,
        opsi: q.opsi as Opsi[],
      })),
    });
  })
);

router.post(
  '/sessions/:id/answer',
  attachUserIfPresent,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { order, answerLetter } = answerSchema.parse(req.body);

    const session = await prisma.practiceSession.findUnique({ where: { id } });
    if (!session) throw new HttpError(404, 'Sesi latihan tidak ditemukan');
    if (session.status === 'FINISHED') throw new HttpError(409, 'Sesi ini sudah selesai');
    ensureSessionAccess(session, req.user?.id);

    const answerRow = await prisma.sessionAnswer.findUnique({
      where: { sessionId_order: { sessionId: id, order } },
      include: { question: true },
    });
    if (!answerRow) throw new HttpError(404, 'Soal tidak ditemukan pada sesi ini');

    const isCorrect = answerRow.question.kunci.toUpperCase() === answerLetter.toUpperCase();

    await prisma.sessionAnswer.update({
      where: { id: answerRow.id },
      data: { answerLetter: answerLetter.toUpperCase(), isCorrect, answeredAt: new Date() },
    });

    res.json({
      correct: isCorrect,
      kunci: answerRow.question.kunci,
      pembahasan: answerRow.question.pembahasan,
    });
  })
);

router.post(
  '/sessions/:id/finish',
  attachUserIfPresent,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const session = await prisma.practiceSession.findUnique({
      where: { id },
      include: { answers: { include: { question: { include: { category: true } } } } },
    });
    if (!session) throw new HttpError(404, 'Sesi latihan tidak ditemukan');
    ensureSessionAccess(session, req.user?.id);

    const total = session.answers.length;
    const correct = session.answers.filter((a) => a.isCorrect).length;

    const byCategory = new Map<string, { correct: number; total: number }>();
    for (const a of session.answers) {
      const name = a.question.category.name;
      const entry = byCategory.get(name) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (a.isCorrect) entry.correct += 1;
      byCategory.set(name, entry);
    }

    const resultByKategori = Array.from(byCategory.entries()).map(([kategori, v]) => ({
      kategori,
      pct: percentage(v.correct, v.total),
      width: `${percentage(v.correct, v.total)}%`,
    }));

    await prisma.practiceSession.update({
      where: { id },
      data: { status: 'FINISHED', correctCount: correct, finishedAt: new Date() },
    });

    if (session.userId) {
      await prisma.membership.updateMany({
        where: { userId: session.userId },
        data: { sessionsUsed: { increment: 1 } },
      });
    }

    res.json({
      resultScore: percentage(correct, total),
      resultCorrect: correct,
      resultTotal: total,
      resultByKategori,
    });
  })
);

export default router;
