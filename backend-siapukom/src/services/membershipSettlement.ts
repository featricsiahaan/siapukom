import { prisma } from '../lib/prisma';

export async function applySettlement(payment: {
  id: string;
  userId: string;
  durationDays: number;
  includesMateri: boolean;
}) {
  const membership = await prisma.membership.findUnique({ where: { userId: payment.userId } });
  const now = new Date();
  const base = membership?.expiryDate && membership.expiryDate > now ? membership.expiryDate : now;
  const newExpiry = new Date(base.getTime() + payment.durationDays * 24 * 60 * 60 * 1000);

  let newMateriExpiry = membership?.materiExpiryDate ?? null;
  if (payment.includesMateri) {
    const materiBase =
      membership?.materiExpiryDate && membership.materiExpiryDate > now ? membership.materiExpiryDate : now;
    newMateriExpiry = new Date(materiBase.getTime() + payment.durationDays * 24 * 60 * 60 * 1000);
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SETTLEMENT', paidAt: new Date() },
    }),
    prisma.membership.update({
      where: { userId: payment.userId },
      data: { plan: 'Akses Penuh', expiryDate: newExpiry, materiExpiryDate: newMateriExpiry },
    }),
  ]);
}
