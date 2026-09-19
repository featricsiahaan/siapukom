import type {
  AnswerResponse,
  Category,
  CreatePaymentResponse,
  DashboardResponse,
  FinishSessionResponse,
  FinishSimulasiResponse,
  PaymentStatusResponse,
  PublicUser,
  SimulasiStatus,
  StartSessionResponse,
} from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {}
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? 'Terjadi kesalahan, coba lagi.');
  }
  return data as T;
}

export function login(email: string, password: string) {
  return request<{ token: string; user: PublicUser }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function getCategories() {
  return request<{ categories: Category[] }>('/categories');
}

export function startSession(categoryId: string | null, jumlah: number, token?: string | null) {
  return request<StartSessionResponse>('/practice/sessions', {
    method: 'POST',
    body: { categoryId: categoryId ?? undefined, jumlah, mode: 'LATIHAN' },
    token,
  });
}

export function startSimulasi(token: string) {
  return request<StartSessionResponse>('/practice/sessions', {
    method: 'POST',
    body: { mode: 'SIMULASI' },
    token,
  });
}

export function getSimulasiStatus(token: string) {
  return request<SimulasiStatus>('/practice/simulasi/status', { token });
}

export function answerQuestion(
  sessionId: string,
  order: number,
  answerLetter: string,
  token?: string | null
) {
  return request<AnswerResponse>(`/practice/sessions/${sessionId}/answer`, {
    method: 'POST',
    body: { order, answerLetter },
    token,
  });
}

export function finishSession(sessionId: string, token?: string | null) {
  return request<FinishSessionResponse>(`/practice/sessions/${sessionId}/finish`, {
    method: 'POST',
    token,
  });
}

export function finishSimulasi(sessionId: string, token: string) {
  return request<FinishSimulasiResponse>(`/practice/sessions/${sessionId}/finish`, {
    method: 'POST',
    token,
  });
}

export function getDashboard(token: string) {
  return request<DashboardResponse>('/dashboard', { token });
}

export function createPayment(token: string) {
  return request<CreatePaymentResponse>('/payments/create', { method: 'POST', token });
}

export function getPaymentStatus(token: string, orderId: string) {
  return request<PaymentStatusResponse>(`/payments/${orderId}/status`, { token });
}
