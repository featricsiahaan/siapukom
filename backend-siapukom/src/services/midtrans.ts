import crypto from 'crypto';
import { env } from '../config/env';
import { HttpError } from '../middleware/errorHandler';

const BASE_URL = env.midtransIsProduction ? 'https://api.midtrans.com/v2' : 'https://api.sandbox.midtrans.com/v2';

function authHeader(): string {
  return `Basic ${Buffer.from(`${env.midtransServerKey}:`).toString('base64')}`;
}

interface MidtransAction {
  name: string;
  method: string;
  url: string;
}

interface MidtransChargeResponse {
  transaction_id: string;
  status_code: string;
  expiry_time?: string;
  actions?: MidtransAction[];
}

export async function createQrisCharge(params: {
  orderId: string;
  amount: number;
}): Promise<{ transactionId: string; qrUrl: string | null; expiryTime: string | undefined }> {
  const res = await fetch(`${BASE_URL}/charge`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      payment_type: 'qris',
      transaction_details: { order_id: params.orderId, gross_amount: params.amount },
      custom_expiry: { expiry_duration: 30, unit: 'minute' },
    }),
  });

  const body = (await res.json().catch(() => ({}))) as Partial<MidtransChargeResponse> & { status_message?: string };

  if (!res.ok || (body.status_code !== '201' && body.status_code !== '200')) {
    console.error('Midtrans charge gagal:', body);
    throw new HttpError(502, 'Gagal membuat pembayaran QRIS, coba lagi.');
  }

  const qrUrl = body.actions?.find((a) => a.name === 'generate-qr-code')?.url ?? null;

  return {
    transactionId: body.transaction_id!,
    qrUrl,
    expiryTime: body.expiry_time,
  };
}

export function verifySignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}): boolean {
  const expected = crypto
    .createHash('sha512')
    .update(params.orderId + params.statusCode + params.grossAmount + env.midtransServerKey)
    .digest('hex');
  return expected === params.signatureKey;
}
