import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { createQrisCheckout, verifyNotificationSignature } from '../services/doku';
import { applySettlement } from '../services/membershipSettlement';

export const MANUAL_TRANSFER_INFO = {
  bank: {
    bankName: 'BCA',
    accountNumber: '0273125440',
    accountHolder: 'Leethaream Featric Anju Siahaan',
  },
  gopay: {
    phoneNumber: '+6281254147614',
  },
} as const;

const router = Router();

const PACKAGES = {
  '2_MINGGU': { amount: 17000, days: 14, label: '2 Minggu', includesMateri: false },
  '1_BULAN': { amount: 30000, days: 30, label: '1 Bulan', includesMateri: true },
} as const;

const createPaymentSchema = z.object({
  packageType: z.enum(['2_MINGGU', '1_BULAN']),
});

router.post(
  '/create',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { packageType } = createPaymentSchema.parse(req.body);
    const pkg = PACKAGES[packageType];

    const existing = await prisma.payment.findFirst({
      where: { userId, status: 'PENDING', expiresAt: { gt: new Date() }, amount: pkg.amount },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return res.status(200).json({
        orderId: existing.orderId,
        paymentUrl: existing.paymentUrl,
        amount: existing.amount,
        expiresAt: existing.expiresAt,
      });
    }

    const orderId = `SIAPUKOM-${Date.now()}-${userId.slice(0, 6)}`;
    const checkout = await createQrisCheckout({ orderId, amount: pkg.amount });
    const parsedExpiry = checkout.expiredDate ? new Date(checkout.expiredDate) : null;
    const expiresAt =
      parsedExpiry && !Number.isNaN(parsedExpiry.getTime()) ? parsedExpiry : new Date(Date.now() + 30 * 60 * 1000);

    const payment = await prisma.payment.create({
      data: {
        userId,
        orderId,
        amount: pkg.amount,
        durationDays: pkg.days,
        includesMateri: pkg.includesMateri,
        status: 'PENDING',
        paymentUrl: checkout.paymentUrl,
        expiresAt,
      },
    });

    res.status(201).json({
      orderId: payment.orderId,
      paymentUrl: payment.paymentUrl,
      amount: payment.amount,
      expiresAt: payment.expiresAt,
    });
  })
);

router.post(
  '/create-manual',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { packageType } = createPaymentSchema.parse(req.body);
    const pkg = PACKAGES[packageType];

    const existing = await prisma.payment.findFirst({
      where: {
        userId,
        method: 'MANUAL_TRANSFER',
        status: { in: ['PENDING', 'WAITING_CONFIRMATION'] },
        expiresAt: { gt: new Date() },
        amount: pkg.amount,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return res.status(200).json({
        orderId: existing.orderId,
        amount: existing.amount,
        status: existing.status,
        expiresAt: existing.expiresAt,
        transferInfo: MANUAL_TRANSFER_INFO,
      });
    }

    const orderId = `SIAPUKOM-MANUAL-${Date.now()}-${userId.slice(0, 6)}`;
    const payment = await prisma.payment.create({
      data: {
        userId,
        orderId,
        amount: pkg.amount,
        durationDays: pkg.days,
        includesMateri: pkg.includesMateri,
        status: 'PENDING',
        method: 'MANUAL_TRANSFER',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      orderId: payment.orderId,
      amount: payment.amount,
      status: payment.status,
      expiresAt: payment.expiresAt,
      transferInfo: MANUAL_TRANSFER_INFO,
    });
  })
);

router.post(
  '/:orderId/mark-paid',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payment = await prisma.payment.findUnique({ where: { orderId: req.params.orderId } });
    if (!payment) throw new HttpError(404, 'Pembayaran tidak ditemukan');
    if (payment.userId !== req.user!.id) throw new HttpError(403, 'Pembayaran ini bukan milik Anda');
    if (payment.method !== 'MANUAL_TRANSFER') throw new HttpError(400, 'Pembayaran ini bukan transfer manual');
    if (payment.status !== 'PENDING') throw new HttpError(400, 'Pembayaran ini sudah diproses sebelumnya');

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'WAITING_CONFIRMATION' },
    });
    res.json({ status: updated.status });
  })
);

router.get(
  '/:orderId/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payment = await prisma.payment.findUnique({ where: { orderId: req.params.orderId } });
    if (!payment) throw new HttpError(404, 'Pembayaran tidak ditemukan');
    if (payment.userId !== req.user!.id) throw new HttpError(403, 'Pembayaran ini bukan milik Anda');

    if (payment.status === 'PENDING' && payment.expiresAt < new Date()) {
      const updated = await prisma.payment.update({ where: { id: payment.id }, data: { status: 'EXPIRE' } });
      return res.json({ status: updated.status });
    }

    res.json({ status: payment.status });
  })
);

// Beberapa dashboard payment gateway melakukan ping GET ke Notify URL untuk verifikasi
// keterjangkauan sebelum menyimpannya. Sediakan respons 200 sederhana untuk itu.
router.get('/notification', (_req, res) => {
  res.status(200).json({ ok: true });
});

// NOTE: body untuk rute ini adalah Buffer mentah (lihat app.ts) supaya digest signature DOKU
// dihitung dari byte persis yang dikirim, bukan hasil re-serialize express.json().
router.post(
  '/notification',
  asyncHandler(async (req, res) => {
    const rawBody = (req.body as Buffer).toString('utf-8');
    const clientId = String(req.headers['client-id'] ?? '');
    const requestId = String(req.headers['request-id'] ?? '');
    const requestTimestamp = String(req.headers['request-timestamp'] ?? '');
    const signatureHeader = String(req.headers['signature'] ?? '');

    const valid = verifyNotificationSignature({ clientId, requestId, requestTimestamp, rawBody, signatureHeader });
    if (!valid) throw new HttpError(401, 'Signature tidak valid');

    // Bentuk body notifikasi DOKU untuk status sukses/gagal belum sempat diverifikasi lewat
    // transaksi sandbox nyata — log ini membantu menyesuaikan pemetaan status di bawah kalau perlu.
    console.log('DOKU notification body:', rawBody);

    let parsed: any;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new HttpError(400, 'Body notifikasi tidak valid');
    }

    const orderId: string | undefined = parsed?.order?.invoice_number ?? parsed?.invoice_number;
    if (!orderId) {
      return res.status(200).json({ received: true });
    }

    const payment = await prisma.payment.findUnique({ where: { orderId } });
    if (!payment) {
      return res.status(200).json({ received: true });
    }
    if (payment.status === 'SETTLEMENT') {
      return res.status(200).json({ received: true });
    }

    const rawStatus: string = String(
      parsed?.transaction?.status ?? parsed?.transaction_status ?? ''
    ).toUpperCase();

    if (['SUCCESS', 'SETTLEMENT', 'PAID'].includes(rawStatus)) {
      const notifiedAmount = Number(parsed?.order?.amount ?? parsed?.amount);
      if (Number.isFinite(notifiedAmount) && Math.round(notifiedAmount) !== payment.amount) {
        throw new HttpError(400, 'Nominal pembayaran tidak sesuai');
      }
      await applySettlement(payment);
    } else if (rawStatus === 'EXPIRED') {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'EXPIRE' } });
    } else if (['CANCELLED', 'CANCEL'].includes(rawStatus)) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'CANCEL' } });
    } else if (['FAILED', 'DENY', 'DENIED'].includes(rawStatus)) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'DENY' } });
    }

    res.status(200).json({ received: true });
  })
);

export default router;
