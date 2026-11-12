import { Router } from 'express';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const r = Router();

r.post('/login', async (req: Request, res: Response): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    res.sendStatus(404);
    return;
  }

  try {
    const plan = (req.body as { plan?: string }).plan === 'pro' ? 'pro' : 'free';
    const email = 'dev@local.test';

    const { rows: [user] } = await query<{ id: number; email: string }>(
      `INSERT INTO users (email, password_hash, name, plan, plan_expires_at)
       VALUES ($1, 'dev', 'Dev', $2, CASE WHEN $2 = 'pro' THEN now() + interval '30 days' END)
       ON CONFLICT (email) DO UPDATE
         SET plan = EXCLUDED.plan, plan_expires_at = EXCLUDED.plan_expires_at
       RETURNING id, email`,
      [email, plan]
    );

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, {
      expiresIn: '7d',
    });
    res.json({ token });
  } catch (e) {
    console.error('[dev/login]', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro desconhecido' });
  }
});

export default r;