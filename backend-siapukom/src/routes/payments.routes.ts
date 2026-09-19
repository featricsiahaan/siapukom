import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { createQrisCharge, verifySignature } from '../services/midtrans';

const router = Router();

const AKSES_PENUH_PRICE = 20000;
const SIMULASI_TOP_UP = 3;
const KATEGORI_LATIHAN_TOP_UP = 5;

router.post(
  '/create',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const existing = await prisma.payment.findFirst({
      where: { userId, status: 'PENDING', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return res.status(200).json({
        orderId: existing.orderId,
        qrUrl: existing.qrUrl,
        amount: existing.amount,
        expiresAt: existing.expiresAt,
      });
    }

    const orderId = `SIAPUKOM-${Date.now()}-${userId.slice(0, 6)}`;
    const charge = await createQrisCharge({ orderId, amount: AKSES_PENUH_PRICE });
    const expiresAt = charge.expiryTime ? new Date(charge.expiryTime) : new Date(Date.now() + 30 * 60 * 1000);

    const payment = await prisma.payment.create({
      data: {
        userId,
        orderId,
        amount: AKSES_PENUH_PRICE,
        status: 'PENDING',
        midtransTransactionId: charge.transactionId,
        qrUrl: charge.qrUrl,
        expiresAt,
      },
    });

    res.status(201).json({
      orderId: payment.orderId,
      qrUrl: payment.qrUrl,
      amount: payment.amount,
      expiresAt: payment.expiresAt,
    });
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

const notificationSchema = z.object({
  order_id: z.string(),
  status_code: z.string(),
  gross_amount: z.string(),
  signature_key: z.string(),
  transaction_status: z.string(),
});

router.post(
  '/notification',
  asyncHandler(async (req, res) => {
    const body = notificationSchema.parse(req.body);

    const valid = verifySignature({
      orderId: body.order_id,
      statusCode: body.status_code,
      grossAmount: body.gross_amount,
      signatureKey: body.signature_key,
    });
    if (!valid) throw new HttpError(401, 'Signature tidak valid');

    const payment = await prisma.payment.findUnique({ where: { orderId: body.order_id } });
    if (!payment) {
      return res.status(200).json({ received: true });
    }
    if (payment.status === 'SETTLEMENT') {
      return res.status(200).json({ received: true });
    }

    if (body.transaction_status === 'settlement') {
      if (Math.round(Number(body.gross_amount)) !== payment.amount) {
        throw new HttpError(400, 'Nominal pembayaran tidak sesuai');
      }

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'SETTLEMENT', paidAt: new Date() },
        }),
        prisma.membership.update({
          where: { userId: payment.userId },
          data: {
            plan: 'Akses Penuh',
            simulationAttemptsLimit: { increment: SIMULASI_TOP_UP },
            kategoriLatihanLimit: { increment: KATEGORI_LATIHAN_TOP_UP },
            hasSlideAccess: true,
          },
        }),
      ]);
    } else if (body.transaction_status === 'expire') {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'EXPIRE' } });
    } else if (body.transaction_status === 'cancel') {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'CANCEL' } });
    } else if (body.transaction_status === 'deny') {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'DENY' } });
    }

    res.status(200).json({ received: true });
  })
);

export default router;
