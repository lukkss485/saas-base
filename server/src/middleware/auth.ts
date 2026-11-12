import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { query } from '../db.js';
import type { AuthRequest, AuthUser } from '../types/auth.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  let payload: AuthUser;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET) as AuthUser;
  } catch {
    res.status(401).json({ error: 'Token inválido' });
    return;
  }

  // Garante que o usuário ainda existe (token de conta apagada ou de outro banco)
  const { rows: [u] } = await query<{ id: number }>('SELECT id FROM users WHERE id = $1', [payload.id]);
  if (!u) {
    res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
    return;
  }

  (req as AuthRequest).user = payload;
  next();
}