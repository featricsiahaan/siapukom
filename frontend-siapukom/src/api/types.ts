export interface PublicUser {
  id: string;
  nama: string;
  email: string;
  role: 'PESERTA' | 'ADMIN';
}

export interface Category {
  id: string;
  name: string;
  questionCount: number;
}

export interface Opsi {
  letter: string;
  text: string;
}

export interface SessionQuestion {
  order: number;
  questionId: string;
  kategori: string;
  pertanyaan: string;
  opsi: Opsi[];
  imageUrl?: string | null;
  imageAttribution?: string | null;
}

export interface StartSessionResponse {
  sessionId: string;
  mode?: 'LATIHAN' | 'SIMULASI' | 'KATEGORI';
  expiresAt?: string | null;
  durasiMenit?: number | null;
  questions: SessionQuestion[];
}

export interface SimulasiAktif {
  sessionId: string;
  paused: boolean;
  remainingSeconds: number;
  answered: number;
  total: number;
}

export interface ResumeSimulasiResponse extends StartSessionResponse {
  answers: Record<number, string>;
}

export interface AnswerResponse {
  correct?: boolean;
  kunci?: string;
  pembahasan?: string;
  saved?: boolean;
}

export interface KategoriBreakdown {
  kategori: string;
  pct: number;
  width: string;
}

export interface FinishSessionResponse {
  resultScore: number;
  resultCorrect: number;
  resultTotal: number;
  resultByKategori: KategoriBreakdown[];
}

export interface AnalisaKategori {
  kategori: string;
  pct: number;
  level: string;
  badgeBg: string;
  badgeText: string;
}

export type ReportReason = 'KUNCI_SALAH' | 'PEMBAHASAN_SALAH' | 'SOAL_TIDAK_JELAS' | 'GAMBAR_BERMASALAH' | 'LAINNYA';

export interface AdminReportItem {
  id: string;
  reason: ReportReason;
  note: string | null;
  createdAt: string;
  anonim: boolean;
}

export interface AdminReportGroup {
  questionId: string;
  kategori: string;
  pertanyaan: string;
  opsi: Opsi[];
  kunci: string;
  pembahasan: string;
  statusSoal: string;
  reports: AdminReportItem[];
}

export interface WrongAnswer {
  order: number;
  questionId: string;
  kategori: string;
  pertanyaan: string;
  opsi: Opsi[];
  answerLetter: string | null;
  kunci: string;
  pembahasan: string;
}

export interface FinishSimulasiResponse extends FinishSessionResponse {
  analisaKategori: AnalisaKategori[];
  areasToImprove: string[];
  wrongAnswers: WrongAnswer[];
}

export interface SimulasiStatus {
  plan: string;
  isAksesPenuhActive: boolean;
  expiryDate: string | null;
  hasMateriAccess: boolean;
  materiExpiryDate: string | null;
  jumlahSoal: number;
  durasiMenit: number;
  jumlahSoalKategori: number;
}

export type PackageType = '2_MINGGU' | '1_BULAN';

export interface SimulasiRiwayatItem {
  id: string;
  score: number;
  level: string;
  correctCount: number;
  totalQuestions: number;
  finishedAt: string;
  durationMinutes: number;
}

export interface SimulasiRiwayat {
  jenisKelamin: 'LAKI_LAKI' | 'PEREMPUAN' | null;
  total: number;
  average: number;
  best: { id: string; score: number; level: string; finishedAt: string } | null;
  sessions: SimulasiRiwayatItem[];
}

export interface ShareStatusResponse {
  bonusDays: number;
  jumlahTeman: number;
  maxApproved: number;
  approved: number;
  pending: boolean;
  canClaim: boolean;
  eligible: boolean;
  claims: { id: string; platform: string; status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK'; createdAt: string }[];
}

export interface AdminShareClaim {
  id: string;
  nama: string;
  email: string;
  platform: string;
  bukti: string | null;
  instagram: string | null;
  screenshots: string[];
  bonusDays: number;
  expiryDate: string | null;
  createdAt: string;
}

export interface DashboardCategory {
  name: string;
  score: number;
  scorePercent: string;
  level: string;
  badgeBg: string;
  badgeText: string;
}

export interface DashboardMembership {
  plan: string;
  sessionsUsed: number;
  sessionsTotal: number;
  sessionsPercent: string;
}

export interface DashboardResponse {
  nama: string;
  jenisKelamin: 'LAKI_LAKI' | 'PEREMPUAN' | null;
  initial: string;
  membership: DashboardMembership | null;
  readiness: {
    hasData: boolean;
    score: number;
    label: string;
    color: string;
    dasharray: string;
  };
  categories: DashboardCategory[];
}

export interface CreatePaymentResponse {
  orderId: string;
  paymentUrl: string | null;
  amount: number;
  expiresAt: string;
}

export interface ManualTransferInfo {
  bank: { bankName: string; accountNumber: string; accountHolder: string };
  gopay: { phoneNumber: string };
}

export interface CreateManualPaymentResponse {
  orderId: string;
  amount: number;
  status: PaymentStatusValue;
  expiresAt: string;
  transferInfo: ManualTransferInfo;
}

export type PaymentStatusValue = 'PENDING' | 'WAITING_CONFIRMATION' | 'SETTLEMENT' | 'EXPIRE' | 'CANCEL' | 'DENY';

export interface LeaderboardEntry {
  rank: number;
  nama: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  me: LeaderboardEntry | null;
}

export interface AdminUserItem {
  id: string;
  nama: string;
  email: string;
  role: 'PESERTA' | 'ADMIN';
  plan: string;
  expiryDate: string | null;
  createdAt: string;
}

export interface AdminPaymentItem {
  orderId: string;
  amount: number;
  durationDays: number;
  method: 'DOKU' | 'MANUAL_TRANSFER';
  status: PaymentStatusValue;
  nama: string;
  email: string;
  createdAt: string;
}

export interface PaymentStatusResponse {
  status: PaymentStatusValue;
}

export interface SlideItem {
  id: string;
  title: string;
  kategori: string | null;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}
