import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/auth.js';

const routePointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  time: z.number().int().nonnegative(),
});

const heartRateSampleSchema = z.object({
  bpm: z.number().int().min(1).max(250),
  time: z.number().int().nonnegative(),
});

const sessionSchema = z.object({
  clientSessionId: z.string().uuid(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  durationSeconds: z.number().int().min(0).max(86400),
  distanceMeters: z.number().min(0).max(200000),
  steps: z.number().int().min(0).max(200000),
  caloriesKcal: z.number().min(0).max(10000).nullable(),
  averageHeartRate: z.number().int().min(1).max(250).nullable(),
  maxHeartRate: z.number().int().min(1).max(250).nullable(),
  source: z.enum(['gps', 'healthkit', 'bluetooth', 'mixed']),
  route: z.array(routePointSchema).max(1000),
  heartRateSamples: z.array(heartRateSampleSchema).max(1000),
}).superRefine((session, context) => {
  if (Date.parse(session.endedAt) < Date.parse(session.startedAt)) {
    context.addIssue({
      code: 'custom',
      path: ['endedAt'],
      message: 'A caminhada não pode terminar antes de começar',
    });
  }
});

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const { rows } = await query(
    `SELECT id, client_session_id, started_at, ended_at, duration_seconds,
            distance_meters, steps, calories_kcal, average_heart_rate,
            max_heart_rate, source
       FROM activity_sessions
      WHERE user_id = $1
      ORDER BY started_at DESC
      LIMIT 30`,
    [id],
  );
  res.json({ sessions: rows });
});

router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const body = sessionSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: 'Dados da caminhada inválidos' });
    return;
  }

  const session = body.data;
  const { rows: [saved] } = await query(
    `INSERT INTO activity_sessions (
       user_id, client_session_id, started_at, ended_at, duration_seconds,
       distance_meters, steps, calories_kcal, average_heart_rate,
       max_heart_rate, source, route, heart_rate_samples
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (user_id, client_session_id) DO UPDATE SET
       ended_at = EXCLUDED.ended_at,
       duration_seconds = EXCLUDED.duration_seconds,
       distance_meters = EXCLUDED.distance_meters,
       steps = EXCLUDED.steps,
       calories_kcal = EXCLUDED.calories_kcal,
       average_heart_rate = EXCLUDED.average_heart_rate,
       max_heart_rate = EXCLUDED.max_heart_rate,
       source = EXCLUDED.source,
       route = EXCLUDED.route,
       heart_rate_samples = EXCLUDED.heart_rate_samples
     RETURNING id`,
    [
      id,
      session.clientSessionId,
      session.startedAt,
      session.endedAt,
      session.durationSeconds,
      session.distanceMeters,
      session.steps,
      session.caloriesKcal,
      session.averageHeartRate,
      session.maxHeartRate,
      session.source,
      JSON.stringify(session.route),
      JSON.stringify(session.heartRateSamples),
    ],
  );

  res.status(201).json({ id: saved.id });
});

router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id: userId } = (req as AuthRequest).user;
  const sessionId = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!sessionId.success) {
    res.status(400).json({ error: 'Caminhada inválida' });
    return;
  }

  const { rowCount } = await query(
    'DELETE FROM activity_sessions WHERE id = $1 AND user_id = $2',
    [sessionId.data, userId],
  );
  if (!rowCount) {
    res.status(404).json({ error: 'Caminhada não encontrada' });
    return;
  }

  res.status(204).end();
});

export default router;
