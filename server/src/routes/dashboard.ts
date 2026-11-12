import { Router } from 'express';
import type { Request, Response } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/auth.js';

const r = Router();
const FREE_LIMIT = 10;

r.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const range = Number(req.query.range) === 30 ? 30 : 7;

  const { rows: [u] } = await query<{ plan: 'free' | 'pro' }>(
    `SELECT CASE WHEN plan_expires_at > now() THEN plan ELSE 'free' END AS plan FROM users WHERE id = $1`,
    [id]
  );
  const plan = u?.plan ?? 'free';

  // Totais gerais
  const { rows: [totals] } = await query<{
    total: number; done: number; overdue: number; due_today: number; high_open: number;
  }>(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE done)::int AS done,
            COUNT(*) FILTER (WHERE NOT done AND due_date < CURRENT_DATE)::int AS overdue,
            COUNT(*) FILTER (WHERE NOT done AND due_date = CURRENT_DATE)::int AS due_today,
            COUNT(*) FILTER (WHERE NOT done AND priority = 'alta')::int AS high_open
     FROM tasks WHERE user_id = $1`,
    [id]
  );

  // Criadas e concluídas por dia no período
  const { rows: series } = await query<{ day: string; created: number; completed: number }>(
    `SELECT to_char(d::date, 'YYYY-MM-DD') AS day,
       (SELECT COUNT(*)::int FROM task_events e
          WHERE e.user_id = $1 AND e.kind = 'created' AND e.created_at::date = d::date) AS created,
       (SELECT COUNT(*)::int FROM task_events e
          WHERE e.user_id = $1 AND e.kind = 'completed' AND e.created_at::date = d::date) AS completed
     FROM generate_series(
       CURRENT_DATE::timestamp - make_interval(days => $2::int - 1),
       CURRENT_DATE::timestamp,
       interval '1 day'
     ) AS d
     ORDER BY d`,
    [id, range]
  );

  // Abertas por prioridade
  const { rows: prio } = await query<{ priority: string; n: number }>(
    `SELECT priority, COUNT(*)::int AS n FROM tasks WHERE user_id = $1 AND NOT done GROUP BY priority`,
    [id]
  );
  const priorities: Record<string, number> = { alta: 0, media: 0, baixa: 0 };
  prio.forEach((p) => { priorities[p.priority] = p.n; });

  // Próximos vencimentos
  const { rows: upcoming } = await query(
    `SELECT id, title, priority, to_char(due_date, 'YYYY-MM-DD') AS due_date
     FROM tasks
     WHERE user_id = $1 AND NOT done AND due_date IS NOT NULL
     ORDER BY due_date, id LIMIT 5`,
    [id]
  );

  // Atividade recente
  const { rows: events } = await query(
    `SELECT id, kind, title, created_at FROM task_events
     WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 15`,
    [id]
  );

  res.json({
    range,
    plan,
    limit: plan === 'free' ? FREE_LIMIT : null,
    totals,
    series,
    priorities,
    upcoming,
    events,
  });
});

export default r;
