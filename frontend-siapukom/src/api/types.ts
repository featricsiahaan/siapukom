export interface PublicUser {
  id: string;
  nama: string;
  email: string;
  role: 'PESERTA' | 'ADMIN';
}

export interface Category {
  id: string;
  name: string;
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
  mode?: 'LATIHAN' | 'SIMULASI';
  expiresAt?: string | null;
  durasiMenit?: number | null;
  questions: SessionQuestion[];
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

export interface WrongAnswer {
  order: number;
  kategori: string;
  pertanyaan: string;
  opsi: Opsi[];
  answerLetter: string | null;
  kunci: string;
}

export interface FinishSimulasiResponse extends FinishSessionResponse {
  analisaKategori: AnalisaKategori[];
  areasToImprove: string[];
  wrongAnswers: WrongAnswer[];
}

export interface SimulasiStatus {
  simulationAttemptsUsed: number;
  simulationAttemptsLimit: number | null;
  jumlahSoal: number;
  durasiMenit: number;
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
  expiry: string | null;
  sessionsUsed: number;
  sessionsTotal: number;
  sessionsPercent: string;
}

export interface DashboardResponse {
  nama: string;
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
