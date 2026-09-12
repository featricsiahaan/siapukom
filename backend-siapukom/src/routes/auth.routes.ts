import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { signToken } from '../utils/jwt';

const router = Router();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan, coba lagi beberapa saat lagi' },
});

const registerSchema = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(120),
  email: z.string().trim().toLowerCase().email('Email tidak valid'),
  password: z.string().min(4, 'Password minimal 4 karakter').max(200),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

function toPublicUser(user: { id: string; nama: string; email: string; role: string }) {
  return { id: user.id, nama: user.nama, email: user.email, role: user.role };
}

router.post(
  '/register',
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { nama, email, password } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new HttpError(409, 'Email sudah terdaftar');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nama,
        email,
        password: passwordHash,
        membership: {
          create: {
            plan: 'Trial',
            sessionsUsed: 0,
            sessionsTotal: 0,
            simulationAttemptsUsed: 0,
            simulationAttemptsLimit: 2,
          },
        },
      },
    });

    const token = signToken({ sub: user.id, role: user.role });
    res.status(201).json({ token, user: toPublicUser(user) });
  })
);

router.post(
  '/login',
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new HttpError(401, 'Email atau password salah');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new HttpError(401, 'Email atau password salah');
    }

    const token = signToken({ sub: user.id, role: user.role });
    res.json({ token, user: toPublicUser(user) });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new HttpError(404, 'Pengguna tidak ditemukan');
    res.json({ user: toPublicUser(user) });
  })
);

export default router;
