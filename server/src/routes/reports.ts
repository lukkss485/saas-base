import { Router } from 'express';
import type { Request, Response } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/auth.js';

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

const r = Router();

r.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const requested = Number(req.query.range);
  const range: Range = (RANGES as readonly number[]).includes(requested) ? (requested as Range) : 30;

  // Criadas e concluídas por dia
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

  // Conclusões por dia da semana (1 = segunda, 7 = domingo)
  const { rows: byWeekday } = await query<{ dow: number; n: number }>(
    `SELECT EXTRACT(ISODOW FROM created_at)::int AS dow, COUNT(*)::int AS n
     FROM task_events
     WHERE user_id = $1 AND kind = 'completed'
       AND created_at >= now() - make_interval(days => $2::int)
     GROUP BY dow
     ORDER BY dow`,
    [id, range]
  );

  // Tempo médio entre criar e concluir (em horas)
  const { rows: [avg] } = await query<{ avg_hours: number | null }>(
    `SELECT ROUND((AVG(EXTRACT(EPOCH FROM (c.created_at - cr.created_at)) / 3600))::numeric, 1)::float8 AS avg_hours
     FROM task_events c
     JOIN LATERAL (
       SELECT e.created_at FROM task_events e
       WHERE e.task_id = c.task_id AND e.kind = 'created'
       ORDER BY e.created_at
       LIMIT 1
     ) cr ON true
     WHERE c.user_id = $1 AND c.kind = 'completed'
       AND c.created_at >= now() - make_interval(days => $2::int)`,
    [id, range]
  );

  // Progresso por prioridade (todas as tarefas)
  const { rows: byPriority } = await query<{ priority: string; total: number; done: number }>(
    `SELECT priority, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE done)::int AS done
     FROM tasks WHERE user_id = $1
     GROUP BY priority`,
    [id]
  );

  // Progresso dos projetos
  const { rows: projects } = await query<{ name: string; color: string; total: number; done: number }>(
    `SELECT p.name, p.color,
            COUNT(t.id)::int AS total,
            COUNT(t.id) FILTER (WHERE t.done)::int AS done
     FROM projects p
     LEFT JOIN tasks t ON t.project_id = p.id
     WHERE p.user_id = $1
     GROUP BY p.id
     ORDER BY p.created_at DESC
     LIMIT 8`,
    [id]
  );

  const completed = series.reduce((s, p) => s + p.completed, 0);
  const created = series.reduce((s, p) => s + p.created, 0);

  res.json({
    range,
    series,
    completed,
    created,
    rate: created ? Math.round((completed * 100) / created) : 0,
    avgHours: avg?.avg_hours ?? null,
    byWeekday,
    byPriority,
    projects,
  });
});

export default r;