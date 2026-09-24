import crypto from 'crypto';
import { env } from '../config/env';
import { HttpError } from '../middleware/errorHandler';

const BASE_URL = env.dokuIsProduction ? 'https://api.doku.com' : 'https://api-sandbox.doku.com';
const NOTIFICATION_TARGET = '/api/payments/notification';

function isoTimestamp(): string {
  // Format ISO8601 UTC tanpa milidetik, sesuai contoh dokumentasi DOKU (mis. 2020-08-11T08:45:42Z).
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function signString(secretKey: string, stringToSign: string): string {
  return crypto.createHmac('sha256', secretKey).update(stringToSign, 'utf-8').digest('base64');
}

function digestOf(body: string): string {
  return crypto.createHash('sha256').update(body, 'utf-8').digest('base64');
}

export async function createQrisCheckout(params: {
  orderId: string;
  amount: number;
}): Promise<{ paymentUrl: string; expiredDate: string | undefined }> {
  const target = '/checkout/v1/payment';
  const requestId = crypto.randomUUID();
  const timestamp = isoTimestamp();
  const body = JSON.stringify({
    order: { amount: params.amount, invoice_number: params.orderId },
    payment: { payment_due_date: 30, payment_method_types: ['QRIS'] },
  });

  const stringToSign = [
    `Client-Id:${env.dokuClientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${target}`,
    `Digest:${digestOf(body)}`,
  ].join('\n');
  const signature = `HMACSHA256=${signString(env.dokuSecretKey, stringToSign)}`;

  const res = await fetch(`${BASE_URL}${target}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Id': env.dokuClientId,
      'Request-Id': requestId,
      'Request-Timestamp': timestamp,
      Signature: signature,
    },
    body,
  });

  const responseBody: any = await res.json().catch(() => ({}));
  const paymentUrl: string | undefined = responseBody?.response?.payment?.url;

  if (!res.ok || !paymentUrl) {
    console.error('DOKU checkout gagal:', JSON.stringify(responseBody));
    throw new HttpError(502, 'Gagal membuat pembayaran QRIS, coba lagi.');
  }

  return {
    paymentUrl,
    expiredDate: responseBody?.response?.payment?.expired_date,
  };
}

export function verifyNotificationSignature(params: {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  rawBody: string;
  signatureHeader: string;
}): boolean {
  if (!params.clientId || params.clientId !== env.dokuClientId) return false;

  const stringToSign = [
    `Client-Id:${params.clientId}`,
    `Request-Id:${params.requestId}`,
    `Request-Timestamp:${params.requestTimestamp}`,
    `Request-Target:${NOTIFICATION_TARGET}`,
    `Digest:${digestOf(params.rawBody)}`,
  ].join('\n');
  const expected = `HMACSHA256=${signString(env.dokuSecretKey, stringToSign)}`;
  return expected === params.signatureHeader;
}
