import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/auth.js';

const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida');
const bodySchema = z.object({ important: z.boolean() });

const r = Router();

// Lista os dias marcados como importantes
r.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const { rows } = await query<{ day: string }>(
    `SELECT to_char(day, 'YYYY-MM-DD') AS day FROM important_days WHERE user_id = $1`,
    [id]
  );
  res.json({ days: rows.map((row) => row.day) });
});

// Marca ou desmarca um dia
r.put('/:day', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;

  const day = DAY.safeParse(String(req.params.day));
  if (!day.success) {
    res.status(400).json({ error: 'Data inválida' });
    return;
  }

  const body = bodySchema.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: 'Valor inválido' });
    return;
  }

  if (body.data.important) {
    await query(
      'INSERT INTO important_days (user_id, day) VALUES ($1, $2) ON CONFLICT (user_id, day) DO NOTHING',
      [id, day.data]
    );
  } else {
    await query('DELETE FROM important_days WHERE user_id = $1 AND day = $2', [id, day.data]);
  }

  res.json({ day: day.data, important: body.data.important });
});

export default r;