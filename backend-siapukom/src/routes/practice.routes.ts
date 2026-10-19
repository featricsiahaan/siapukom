import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { attachUserIfPresent, requireAuth } from '../middleware/auth';
import { shuffle } from '../utils/shuffle';
import { levelFor, percentage } from '../utils/scoring';
import { isAksesPenuhActive, isMateriAccessActive } from '../utils/membership';

const router = Router();

const reportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak laporan dalam satu jam, coba lagi nanti' },
});

const reportSchema = z.object({
  reason: z.enum(['KUNCI_SALAH', 'PEMBAHASAN_SALAH', 'SOAL_TIDAK_JELAS', 'GAMBAR_BERMASALAH', 'LAINNYA']),
  note: z.string().trim().max(500, 'Catatan maksimal 500 karakter').optional(),
});

const SIMULASI_JUMLAH_SOAL = 150;
const SIMULASI_DURASI_MENIT = 200;
const KATEGORI_JUMLAH_SOAL = 30;
const GRATIS_MAKS_SOAL = 20;

const startSessionSchema = z.object({
  categoryId: z.string().trim().min(1).optional(),
  jumlah: z.number().int().positive().max(150).optional(),
  mode: z.enum(['LATIHAN', 'SIMULASI', 'KATEGORI']).default('LATIHAN'),
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

    const isAdmin = req.user?.role === 'ADMIN';

    if (mode === 'SIMULASI') {
      if (!req.user) {
        throw new HttpError(401, 'Simulasi ujian membutuhkan akun. Silakan masuk terlebih dahulu.');
      }
      const membership = await prisma.membership.findUnique({ where: { userId: req.user.id } });
      if (!isAdmin && !isAksesPenuhActive(membership)) {
        throw new HttpError(403, 'Simulasi Ujian adalah fitur Akses Penuh. Beli paket untuk mengakses.');
      }
    } else if (mode === 'KATEGORI') {
      if (!req.user) {
        throw new HttpError(401, 'Latihan kategori khusus membutuhkan akun. Silakan masuk terlebih dahulu.');
      }
      if (!categoryId) {
        throw new HttpError(400, 'Pilih satu kategori untuk latihan kategori khusus.');
      }
      const membership = await prisma.membership.findUnique({ where: { userId: req.user.id } });
      if (!isAdmin && !isAksesPenuhActive(membership)) {
        throw new HttpError(403, 'Latihan Kategori Khusus adalah fitur Akses Penuh. Beli paket untuk mengakses.');
      }

      const categoryQuestionCount = await prisma.question.count({ where: { categoryId, status: 'ACTIVE' } });
      if (categoryQuestionCount < KATEGORI_JUMLAH_SOAL) {
        throw new HttpError(
          409,
          `Kategori ini baru punya ${categoryQuestionCount} soal aktif, minimal ${KATEGORI_JUMLAH_SOAL} soal dibutuhkan untuk latihan kategori khusus. Pilih kategori lain.`
        );
      }
    }

    // Simulasi selalu mengambil dari seluruh bank soal (tidak difilter kategori) agar merepresentasikan format CBT penuh.
    const effectiveCategoryId = mode === 'SIMULASI' ? undefined : categoryId;
    // Latihan gratis hanya untuk tamu. Akun tanpa paket aktif diperlakukan sama seperti tamu:
    // urutan soal tetap (tidak diacak) dan maksimal GRATIS_MAKS_SOAL, supaya mengulang-ulang latihan
    // tidak memunculkan soal baru untuk "menghabiskan" bank soal gratis.
    let isGuestLatihan = mode === 'LATIHAN' && !req.user;
    if (mode === 'LATIHAN' && req.user && !isAdmin) {
      const membership = await prisma.membership.findUnique({ where: { userId: req.user.id } });
      isGuestLatihan = !isAksesPenuhActive(membership);
    }
    const isAnonymousLatihan = isGuestLatihan;

    const effectiveJumlah =
      mode === 'SIMULASI'
        ? SIMULASI_JUMLAH_SOAL
        : mode === 'KATEGORI'
          ? KATEGORI_JUMLAH_SOAL
          : Math.min(jumlah ?? 10, isGuestLatihan ? GRATIS_MAKS_SOAL : 150);

    const pool = await prisma.question.findMany({
      where: effectiveCategoryId ? { categoryId: effectiveCategoryId, status: 'ACTIVE' } : { status: 'ACTIVE' },
      include: { category: true },
      orderBy: isAnonymousLatihan ? { createdAt: 'asc' } : undefined,
    });

    const source =
      pool.length > 0
        ? pool
        : await prisma.question.findMany({
            where: { status: 'ACTIVE' },
            include: { category: true },
            orderBy: isAnonymousLatihan ? { createdAt: 'asc' } : undefined,
          });
    if (source.length === 0) {
      throw new HttpError(503, 'Bank soal belum tersedia');
    }

    const picked = isAnonymousLatihan
      ? source.slice(0, Math.min(effectiveJumlah, source.length))
      : shuffle(source).slice(0, Math.min(effectiveJumlah, source.length));
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

    if (session.pausedAt) {
      throw new HttpError(409, 'Simulasi sedang dijeda. Lanjutkan dulu untuk menjawab.');
    }

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
      .map((a) => ({
        order: a.order,
        questionId: a.questionId,
        kategori: a.question.category.name,
        pertanyaan: a.question.pertanyaan,
        opsi: a.question.opsi as Opsi[],
        answerLetter: a.answerLetter,
        kunci: a.question.kunci,
        pembahasan: a.question.pembahasan,
      }));

    res.json({
      ...baseResult,
      analisaKategori,
      areasToImprove,
      wrongAnswers,
    });
  })
);

router.get(
  '/simulasi/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const isAdmin = req.user!.role === 'ADMIN';
    const membership = await prisma.membership.findUnique({ where: { userId: req.user!.id } });

    res.json({
      plan: membership?.plan ?? 'Trial',
      isAksesPenuhActive: isAdmin || isAksesPenuhActive(membership),
      expiryDate: membership?.expiryDate ?? null,
      hasMateriAccess: isAdmin || isMateriAccessActive(membership),
      materiExpiryDate: membership?.materiExpiryDate ?? null,
      jumlahSoal: SIMULASI_JUMLAH_SOAL,
      durasiMenit: SIMULASI_DURASI_MENIT,
      jumlahSoalKategori: KATEGORI_JUMLAH_SOAL,
    });
  })
);

router.post(
  '/questions/:id/report',
  reportRateLimit,
  attachUserIfPresent,
  asyncHandler(async (req, res) => {
    const { reason, note } = reportSchema.parse(req.body);
    const question = await prisma.question.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!question) throw new HttpError(404, 'Soal tidak ditemukan');

    // Satu pengguna tidak perlu melapor soal yang sama berulang kali selagi laporannya masih terbuka.
    if (req.user) {
      const dup = await prisma.questionReport.findFirst({
        where: { questionId: question.id, userId: req.user.id, reason, status: 'BARU' },
        select: { id: true },
      });
      if (dup) return res.status(200).json({ ok: true, duplicate: true });
    }

    await prisma.questionReport.create({
      data: { questionId: question.id, userId: req.user?.id ?? null, reason, note: note || null },
    });
    res.status(201).json({ ok: true });
  })
);

router.get(
  '/riwayat-simulasi',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [user, sessions] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user!.id }, select: { jenisKelamin: true } }),
      prisma.practiceSession.findMany({
        where: { userId: req.user!.id, mode: 'SIMULASI', status: 'FINISHED', finishedAt: { not: null } },
        orderBy: { finishedAt: 'asc' },
        select: { id: true, correctCount: true, totalQuestions: true, createdAt: true, finishedAt: true },
      }),
    ]);

    const items = sessions.map((s) => {
      const score = percentage(s.correctCount, s.totalQuestions);
      return {
        id: s.id,
        score,
        level: levelFor(score).level,
        correctCount: s.correctCount,
        totalQuestions: s.totalQuestions,
        finishedAt: s.finishedAt!,
        durationMinutes: Math.max(1, Math.round((s.finishedAt!.getTime() - s.createdAt.getTime()) / 60000)),
      };
    });

    let best: (typeof items)[number] | null = null;
    for (const it of items) if (!best || it.score > best.score) best = it;
    const average = items.length ? Math.round(items.reduce((a, b) => a + b.score, 0) / items.length) : 0;

    res.json({
      jenisKelamin: user?.jenisKelamin ?? null,
      total: items.length,
      average,
      best: best ? { id: best.id, score: best.score, level: best.level, finishedAt: best.finishedAt } : null,
      sessions: [...items].sort((a, b) => b.score - a.score || a.finishedAt.getTime() - b.finishedAt.getTime()).slice(0, 5),
    });
  })
);

router.get(
  '/simulasi/aktif',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = await prisma.practiceSession.findFirst({
      where: { userId: req.user!.id, mode: 'SIMULASI', status: 'IN_PROGRESS' },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { answers: { where: { answerLetter: { not: null } } } } } },
    });
    if (!session) return res.json({ aktif: null });

    const remainingMs = session.pausedAt
      ? (session.remainingMs ?? 0)
      : Math.max(0, (session.expiresAt?.getTime() ?? 0) - Date.now());
    res.json({
      aktif: {
        sessionId: session.id,
        paused: !!session.pausedAt,
        remainingSeconds: Math.round(remainingMs / 1000),
        answered: session._count.answers,
        total: session.totalQuestions,
      },
    });
  })
);

router.post(
  '/sessions/:id/pause',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = await prisma.practiceSession.findUnique({ where: { id: String(req.params.id) } });
    if (!session) throw new HttpError(404, 'Sesi tidak ditemukan');
    ensureSessionAccess(session, req.user?.id);
    if (session.mode !== 'SIMULASI') throw new HttpError(400, 'Hanya simulasi yang bisa dijeda');
    if (session.status === 'FINISHED') throw new HttpError(409, 'Sesi ini sudah selesai');
    if (session.pausedAt) return res.json({ ok: true, remainingSeconds: Math.round((session.remainingMs ?? 0) / 1000) });
    if (!session.expiresAt || session.expiresAt.getTime() <= Date.now()) {
      throw new HttpError(409, 'Waktu ujian sudah habis, selesaikan sesi untuk melihat hasil');
    }
    const remainingMs = session.expiresAt.getTime() - Date.now();
    await prisma.practiceSession.update({
      where: { id: session.id },
      data: { pausedAt: new Date(), remainingMs, expiresAt: null },
    });
    res.json({ ok: true, remainingSeconds: Math.round(remainingMs / 1000) });
  })
);

router.post(
  '/sessions/:id/resume',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = await prisma.practiceSession.findUnique({
      where: { id: String(req.params.id) },
      include: { answers: { orderBy: { order: 'asc' }, include: { question: { include: { category: true } } } } },
    });
    if (!session) throw new HttpError(404, 'Sesi tidak ditemukan');
    ensureSessionAccess(session, req.user?.id);
    if (session.mode !== 'SIMULASI') throw new HttpError(400, 'Hanya simulasi yang bisa dilanjutkan');
    if (session.status === 'FINISHED') throw new HttpError(409, 'Sesi ini sudah selesai');

    let expiresAt = session.expiresAt;
    if (session.pausedAt) {
      expiresAt = new Date(Date.now() + (session.remainingMs ?? 0));
      await prisma.practiceSession.update({
        where: { id: session.id },
        data: { pausedAt: null, remainingMs: null, expiresAt },
      });
    }

    const answers: Record<number, string> = {};
    for (const a of session.answers) if (a.answerLetter) answers[a.order] = a.answerLetter;

    res.json({
      sessionId: session.id,
      mode: session.mode,
      expiresAt,
      durasiMenit: SIMULASI_DURASI_MENIT,
      answers,
      questions: session.answers.map((a) => ({
        order: a.order,
        questionId: a.questionId,
        kategori: a.question.category.name,
        pertanyaan: a.question.pertanyaan,
        opsi: a.question.opsi as Opsi[],
        imageUrl: a.question.imageUrl,
        imageAttribution: a.question.imageAttribution,
      })),
    });
  })
);

router.get(
  '/leaderboard',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await prisma.practiceSession.findMany({
      where: { mode: 'SIMULASI', status: 'FINISHED', userId: { not: null } },
      select: {
        userId: true,
        correctCount: true,
        totalQuestions: true,
        finishedAt: true,
        user: { select: { nama: true } },
      },
      orderBy: { finishedAt: 'asc' },
    });

    type Best = { nama: string; score: number; correctCount: number; totalQuestions: number; finishedAt: Date };
    const bestByUser = new Map<string, Best>();
    for (const s of sessions) {
      if (!s.userId || !s.finishedAt) continue;
      const score = percentage(s.correctCount, s.totalQuestions);
      const existing = bestByUser.get(s.userId);
      if (!existing || score > existing.score) {
        bestByUser.set(s.userId, {
          nama: s.user!.nama,
          score,
          correctCount: s.correctCount,
          totalQuestions: s.totalQuestions,
          finishedAt: s.finishedAt,
        });
      }
    }

    const ranked = Array.from(bestByUser.entries())
      .map(([userId, v]) => ({ userId, ...v }))
      .sort((a, b) => b.score - a.score || a.finishedAt.getTime() - b.finishedAt.getTime());

    const toEntry = (r: (typeof ranked)[number], rank: number) => ({
      rank,
      nama: r.nama,
      score: r.score,
      correctCount: r.correctCount,
      totalQuestions: r.totalQuestions,
    });

    const leaderboard = ranked.slice(0, 20).map((r, i) => toEntry(r, i + 1));
    const myIndex = ranked.findIndex((r) => r.userId === req.user!.id);
    const me = myIndex >= 0 ? toEntry(ranked[myIndex], myIndex + 1) : null;

    res.json({ leaderboard, me });
  })
);

export default router;
