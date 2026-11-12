import { Router } from 'express';
import type { Request, Response } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/auth.js';

const r = Router();

r.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

  const { rows } = await query(
    `SELECT id, kind, title, created_at
     FROM task_events
     WHERE user_id = $1
     ORDER BY id DESC
     LIMIT $2`,
    [id, limit]
  );
  res.json({ events: rows });
});

export default r;