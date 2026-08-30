import { NextFunction, Request, Response } from 'express';
import { HttpError } from './errorHandler';
import { verifyToken } from '../utils/jwt';

export interface AuthUser {
  id: string;
  role: 'PESERTA' | 'ADMIN';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return next(new HttpError(401, 'Token autentikasi tidak ditemukan'));
  }
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new HttpError(401, 'Token autentikasi tidak valid atau kedaluwarsa'));
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return next(new HttpError(403, 'Hanya admin yang boleh mengakses endpoint ini'));
  }
  next();
}

// Melekatkan user jika token valid, tapi tidak menolak request tanpa token —
// dipakai untuk sesi latihan gratis yang boleh diakses tanpa login.
export function attachUserIfPresent(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // token tidak valid diperlakukan sebagai anonim, bukan error
  }
  next();
}
