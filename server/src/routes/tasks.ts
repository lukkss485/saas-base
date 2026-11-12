import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/auth.js';

type Plan = 'free' | 'pro';
type TaskRow = {
  id: number;
  title: string;
  done: boolean;
  priority: 'alta' | 'media' | 'baixa';
  due_date: string | null;
  project_id: number | null;
  created_at: string;
  updated_at: string;
};

const FREE_LIMIT = 10;
const COLS = `id, title, done, priority, to_char(due_date, 'YYYY-MM-DD') AS due_date, project_id, created_at, updated_at`;

// Validação
const PRIORITY = z.enum(['alta', 'media', 'baixa']);
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').nullable();
const TITLE = z.string().trim().min(1, 'Título obrigatório').max(200, 'Título muito longo');

const createSchema = z.object({
  title: TITLE,
  priority: PRIORITY.default('media'),
  due_date: DATE.optional(),
  project_id: z.number().int().positive().nullable().optional(),
});

const patchSchema = z.object({
  title: TITLE.optional(),
  done: z.boolean().optional(),
  priority: PRIORITY.optional(),
  due_date: DATE.optional(),
  project_id: z.number().int().positive().nullable().optional(),
});

const firstIssue = (err: z.ZodError): string => err.issues[0]?.message ?? 'Dados inválidos';

async function ownProject(projectId: number | null | undefined, userId: number): Promise<boolean> {
  if (projectId == null) return true;
  const { rows: [p] } = await query<{ id: number }>(
    'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return !!p;
}

const r = Router();

async function getPlan(userId: number): Promise<Plan> {
  const { rows: [u] } = await query<{ plan: Plan }>(
    `SELECT CASE WHEN plan_expires_at > now() THEN plan ELSE 'free' END AS plan FROM users WHERE id = $1`,
    [userId]
  );
  return u?.plan ?? 'free';
}

async function logEvent(userId: number, taskId: number | null, title: string, kind: string): Promise<void> {
  await query(
    'INSERT INTO task_events (user_id, task_id, title, kind) VALUES ($1, $2, $3, $4)',
    [userId, taskId, title, kind]
  );
}

// Lista todas as tarefas do usuário (inclusive as que pertencem a projetos)
r.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const plan = await getPlan(id);
  const { rows: tasks } = await query<TaskRow>(
    `SELECT ${COLS} FROM tasks WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 500`,
    [id]
  );
  res.json({ tasks, plan, limit: plan === 'free' ? FREE_LIMIT : null });
});

// Rotas fixas ficam ANTES das rotas com parâmetro (/:taskId),
// senão o Express trata "completed" e "export" como se fossem um id.

// Exporta todas as tarefas em CSV
r.get('/export', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const { rows } = await query<{
    title: string; done: boolean; priority: string; due_date: string | null; created_at: string;
  }>(
    `SELECT title, done, priority, to_char(due_date, 'YYYY-MM-DD') AS due_date, created_at
     FROM tasks WHERE user_id = $1 ORDER BY created_at`,
    [id]
  );

  const esc = (v: unknown): string => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    'titulo,concluida,prioridade,vencimento,criada_em',
    ...rows.map((t) =>
      [esc(t.title), t.done ? 'sim' : 'não', esc(t.priority), esc(t.due_date), esc(t.created_at)].join(',')
    ),
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="tarefas.csv"');
  res.send('\uFEFF' + lines.join('\n'));
});

// Apaga todas as tarefas concluídas
r.delete('/completed', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const { rowCount } = await query(
    'DELETE FROM tasks WHERE user_id = $1 AND done = true',
    [id]
  );
  res.json({ deleted: rowCount ?? 0 });
});

r.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const parsed = createSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: firstIssue(parsed.error) });
    return;
  }
  const { title, priority, due_date, project_id } = parsed.data;

  if (!(await ownProject(project_id, id))) {
    res.status(400).json({ error: 'Projeto não encontrado' });
    return;
  }

  const plan = await getPlan(id);
  if (plan === 'free') {
    const { rows: [c] } = await query<{ n: number }>(
      'SELECT COUNT(*)::int AS n FROM tasks WHERE user_id = $1',
      [id]
    );
    if (c.n >= FREE_LIMIT) {
      res.status(403).json({ error: `Limite do plano Free atingido (${FREE_LIMIT} tarefas). Assine o Pro.` });
      return;
    }
  }

  const { rows: [task] } = await query<TaskRow>(
    `INSERT INTO tasks (user_id, title, priority, due_date, project_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${COLS}`,
    [id, title, priority, due_date ?? null, project_id ?? null]
  );
  await logEvent(id, task.id, task.title, 'created');
  res.status(201).json(task);
});

r.patch('/:taskId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const taskId = Number(req.params.taskId);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const parsed = patchSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: firstIssue(parsed.error) });
    return;
  }

  const { rows: [cur] } = await query<TaskRow>(
    `SELECT ${COLS} FROM tasks WHERE id = $1 AND user_id = $2`,
    [taskId, id]
  );
  if (!cur) {
    res.status(404).json({ error: 'Tarefa não encontrada' });
    return;
  }

  const d = parsed.data;
  if (d.project_id !== undefined && !(await ownProject(d.project_id, id))) {
    res.status(400).json({ error: 'Projeto não encontrado' });
    return;
  }

  const title = d.title ?? cur.title;
  const done = d.done ?? cur.done;
  const priority = d.priority ?? cur.priority;
  const due = d.due_date !== undefined ? d.due_date : cur.due_date;
  const project = d.project_id !== undefined ? d.project_id : cur.project_id;

  const { rows: [task] } = await query<TaskRow>(
    `UPDATE tasks SET title = $1, done = $2, priority = $3, due_date = $4, project_id = $5, updated_at = now()
     WHERE id = $6 AND user_id = $7 RETURNING ${COLS}`,
    [title, done, priority, due, project, taskId, id]
  );

  if (done !== cur.done) {
    await logEvent(id, taskId, task.title, done ? 'completed' : 'reopened');
  } else if (title !== cur.title || priority !== cur.priority || due !== cur.due_date || project !== cur.project_id) {
    await logEvent(id, taskId, task.title, 'edited');
  }

  res.json(task);
});

r.delete('/:taskId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const taskId = Number(req.params.taskId);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const { rows: [cur] } = await query<{ title: string }>(
    'SELECT title FROM tasks WHERE id = $1 AND user_id = $2',
    [taskId, id]
  );
  if (!cur) {
    res.status(404).json({ error: 'Tarefa não encontrada' });
    return;
  }

  await query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [taskId, id]);
  await logEvent(id, taskId, cur.title, 'deleted');
  res.sendStatus(204);
});

export default r;