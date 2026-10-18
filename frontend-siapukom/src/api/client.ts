import type {
  AdminPaymentItem,
  AdminReportGroup,
  ReportReason,
  AdminUserItem,
  AnswerResponse,
  Category,
  CreateManualPaymentResponse,
  CreatePaymentResponse,
  DashboardResponse,
  FinishSessionResponse,
  FinishSimulasiResponse,
  LeaderboardResponse,
  PackageType,
  PaymentStatusResponse,
  PublicUser,
  SimulasiStatus,
  SlideItem,
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

export function register(nama: string, email: string, password: string, jenisKelamin: JenisKelamin) {
  return request<{ token: string; user: PublicUser }>('/auth/register', {
    method: 'POST',
    body: { nama, email, password, jenisKelamin },
  });
}

export function getCategories() {
  return request<{ categories: Category[] }>('/categories');
}

export function startSession(
  categoryId: string | null,
  jumlah: number,
  token?: string | null,
  mode: 'LATIHAN' | 'KATEGORI' = 'LATIHAN'
) {
  return request<StartSessionResponse>('/practice/sessions', {
    method: 'POST',
    body: { categoryId: categoryId ?? undefined, jumlah, mode },
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

export function getLeaderboard(token: string) {
  return request<LeaderboardResponse>('/practice/leaderboard', { token });
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

export function createPayment(token: string, packageType: PackageType) {
  return request<CreatePaymentResponse>('/payments/create', { method: 'POST', body: { packageType }, token });
}

export function getPaymentStatus(token: string, orderId: string) {
  return request<PaymentStatusResponse>(`/payments/${orderId}/status`, { token });
}

export function createManualPayment(token: string, packageType: PackageType) {
  return request<CreateManualPaymentResponse>('/payments/create-manual', {
    method: 'POST',
    body: { packageType },
    token,
  });
}

export function markPaymentPaid(token: string, orderId: string) {
  return request<{ status: string }>(`/payments/${orderId}/mark-paid`, { method: 'POST', token });
}

export function searchAdminUsers(token: string, q: string) {
  return request<{ users: AdminUserItem[] }>(`/admin/users?q=${encodeURIComponent(q)}`, { token });
}

export function resetUserPassword(token: string, userId: string) {
  return request<{ email: string; nama: string; temporaryPassword: string }>(`/admin/users/${userId}/reset-password`, {
    method: 'POST',
    token,
  });
}

export function changePassword(token: string, currentPassword: string, newPassword: string) {
  return request<{ ok: boolean }>('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword }, token });
}

export type JenisKelamin = 'LAKI_LAKI' | 'PEREMPUAN';

export function reportQuestion(token: string | null, questionId: string, reason: ReportReason, note?: string) {
  return request<{ ok: boolean }>(`/practice/questions/${questionId}/report`, { method: 'POST', body: { reason, note }, token });
}

export function listAdminReports(token: string) {
  return request<{ groups: AdminReportGroup[] }>('/admin/reports', { token });
}

export function resolveReports(token: string, questionId: string, action: 'TAHAN_SOAL' | 'SELESAI' | 'TOLAK') {
  return request<{ closed: number; held: boolean }>(`/admin/reports/question/${questionId}/resolve`, { method: 'POST', body: { action }, token });
}

export function listAdminPayments(token: string, status = 'WAITING_CONFIRMATION') {
  return request<{ payments: AdminPaymentItem[] }>(`/admin/payments?status=${status}`, { token });
}

export function confirmAdminPayment(token: string, orderId: string) {
  return request<{ status: string }>(`/admin/payments/${orderId}/confirm`, { method: 'POST', token });
}

export function rejectAdminPayment(token: string, orderId: string) {
  return request<{ status: string }>(`/admin/payments/${orderId}/reject`, { method: 'POST', token });
}

export function getMateri(token: string) {
  return request<{ slides: SlideItem[] }>('/materi', { token });
}

export async function getMateriFileBlob(token: string, id: string): Promise<Blob> {
  const res = await fetch(`${API_URL}/materi/${id}/file`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Gagal memuat file materi.');
  }
  return res.blob();
}
