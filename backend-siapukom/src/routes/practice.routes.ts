import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { attachUserIfPresent, requireAuth } from '../middleware/auth';
import { shuffle } from '../utils/shuffle';
import { levelFor, percentage } from '../utils/scoring';

const router = Router();

const SIMULASI_JUMLAH_SOAL = 150;
const SIMULASI_DURASI_MENIT = 200;
const SIMULASI_PEMBAHASAN_TERBUKA = 5;

const startSessionSchema = z.object({
  categoryId: z.string().trim().min(1).optional(),
  jumlah: z.number().int().positive().max(150).optional(),
  mode: z.enum(['LATIHAN', 'SIMULASI']).default('LATIHAN'),
});

const answerSchema = z.object({
  order: z.number().int().nonnegative(),
  answerLetter: z.string().trim().length(1),
});

type Opsi = { letter: string; text: string };

function ensureSessionAccess(session: { userId: string | null }, userId: string | undefined) {
  if (session.userId && session.userId !== userId) {
    throw new HttpError(403, 'Sesi ini bukan milik Anda');
  }
}

router.post(
  '/sessions',
  attachUserIfPresent,
  asyncHandler(async (req, res) => {
    const { categoryId, jumlah, mode } = startSessionSchema.parse(req.body);

    let membership: { simulationAttemptsUsed: number; simulationAttemptsLimit: number | null } | null = null;

    if (mode === 'SIMULASI') {
      if (!req.user) {
        throw new HttpError(401, 'Simulasi ujian membutuhkan akun. Silakan masuk terlebih dahulu.');
      }
      membership = await prisma.membership.findUnique({ where: { userId: req.user.id } });
      if (
        membership &&
        membership.simulationAttemptsLimit !== null &&
        membership.simulationAttemptsUsed >= membership.simulationAttemptsLimit
      ) {
        throw new HttpError(
          403,
          'Kesempatan trial simulasi Anda sudah habis. Upgrade ke Akses Penuh untuk simulasi tanpa batas.'
        );
      }
    }

    // Simulasi selalu mengambil dari seluruh bank soal (tidak difilter kategori) agar merepresentasikan format CBT penuh.
    const effectiveCategoryId = mode === 'SIMULASI' ? undefined : categoryId;
    const effectiveJumlah = mode === 'SIMULASI' ? SIMULASI_JUMLAH_SOAL : (jumlah ?? 5);

    const pool = await prisma.question.findMany({
      where: effectiveCategoryId ? { categoryId: effectiveCategoryId, status: 'ACTIVE' } : { status: 'ACTIVE' },
      include: { category: true },
    });

    const source =
      pool.length > 0 ? pool : await prisma.question.findMany({ where: { status: 'ACTIVE' }, include: { category: true } });
    if (source.length === 0) {
      throw new HttpError(503, 'Bank soal belum tersedia');
    }

    const picked = shuffle(source).slice(0, Math.min(effectiveJumlah, source.length));
    const expiresAt = mode === 'SIMULASI' ? new Date(Date.now() + SIMULASI_DURASI_MENIT * 60 * 1000) : null;

    const session = await prisma.practiceSession.create({
      data: {
        userId: req.user?.id,
        categoryFilter: effectiveCategoryId ?? null,
        totalQuestions: picked.length,
        mode,
        expiresAt,
        answers: {
          create: picked.map((q, index) => ({
            questionId: q.id,
            order: index,
          })),
        },
      },
    });

    if (mode === 'SIMULASI' && req.user) {
      await prisma.membership.updateMany({
        where: { userId: req.user.id },
        data: { simulationAttemptsUsed: { increment: 1 } },
      });
    }

    res.status(201).json({
      sessionId: session.id,
      mode: session.mode,
      expiresAt: session.expiresAt,
      durasiMenit: mode === 'SIMULASI' ? SIMULASI_DURASI_MENIT : null,
      questions: picked.map((q, index) => ({
        order: index,
        questionId: q.id,
        kategori: q.category.name,
        pertanyaan: q.pertanyaan,
        opsi: q.opsi as Opsi[],
        imageUrl: q.imageUrl,
        imageAttribution: q.imageAttribution,
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

    if (session.mode === 'SIMULASI' && session.expiresAt && new Date() > session.expiresAt) {
      throw new HttpError(409, 'Waktu ujian sudah habis. Silakan selesaikan sesi untuk melihat hasil.');
    }

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

    if (session.mode === 'SIMULASI') {
      // Ujian sungguhan: kunci & pembahasan tidak dibocorkan sebelum sesi selesai.
      return res.json({ saved: true });
    }

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
      include: { answers: { include: { question: { include: { category: true } } }, orderBy: { order: 'asc' } } },
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

    if (session.status !== 'FINISHED') {
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
    }

    const baseResult = {
      resultScore: percentage(correct, total),
      resultCorrect: correct,
      resultTotal: total,
      resultByKategori,
    };

    if (session.mode !== 'SIMULASI') {
      return res.json(baseResult);
    }

    // Analisa kekuatan/kelemahan per kategori untuk mode Simulasi.
    const analisaKategori = Array.from(byCategory.entries()).map(([kategori, v]) => {
      const pct = percentage(v.correct, v.total);
      const info = levelFor(pct);
      return { kategori, pct, ...info };
    });
    const areasToImprove = analisaKategori.filter((k) => k.pct < 60).map((k) => k.kategori);

    const wrongAnswers = session.answers
      .filter((a) => a.isCorrect !== true)
      .map((a, idx) => {
        const locked = idx >= SIMULASI_PEMBAHASAN_TERBUKA;
        return {
          order: a.order,
          kategori: a.question.category.name,
          pertanyaan: a.question.pertanyaan,
          opsi: a.question.opsi as Opsi[],
          answerLetter: a.answerLetter,
          kunci: a.question.kunci,
          pembahasan: locked ? null : a.question.pembahasan,
          pembahasanLocked: locked,
        };
      });

    res.json({
      ...baseResult,
      analisaKategori,
      areasToImprove,
      wrongAnswers,
      pembahasanTerbukaCount: Math.min(wrongAnswers.length, SIMULASI_PEMBAHASAN_TERBUKA),
      pembahasanTerkunciCount: Math.max(0, wrongAnswers.length - SIMULASI_PEMBAHASAN_TERBUKA),
    });
  })
);

router.get(
  '/simulasi/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const membership = await prisma.membership.findUnique({ where: { userId: req.user!.id } });
    res.json({
      simulationAttemptsUsed: membership?.simulationAttemptsUsed ?? 0,
      simulationAttemptsLimit: membership?.simulationAttemptsLimit ?? null,
      jumlahSoal: SIMULASI_JUMLAH_SOAL,
      durasiMenit: SIMULASI_DURASI_MENIT,
    });
  })
);

export default router;
