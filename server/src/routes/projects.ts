import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/auth.js';

type Plan = 'free' | 'pro';
type ProjectRow = {
  id: number;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  total: number;
  done: number;
  next_due: string | null;
};

const FREE_PROJECT_LIMIT = 3;

const COLOR = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida');
const createSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório').max(80, 'Nome muito longo'),
  description: z.string().trim().max(300, 'Descrição muito longa').nullable().optional(),
  color: COLOR.optional(),
});
const patchSchema = createSchema.partial();

const firstIssue = (err: z.ZodError): string => err.issues[0]?.message ?? 'Dados inválidos';

// Projeto com contagens e próximo vencimento, calculados pelo banco
const PROJECT_SELECT = `
  SELECT p.id, p.name, p.description, p.color, p.created_at,
         COUNT(t.id)::int AS total,
         COUNT(t.id) FILTER (WHERE t.done)::int AS done,
         to_char(MIN(t.due_date) FILTER (WHERE NOT t.done), 'YYYY-MM-DD') AS next_due
  FROM projects p
  LEFT JOIN tasks t ON t.project_id = p.id
`;

const r = Router();

function parseId(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function getPlan(userId: number): Promise<Plan> {
  const { rows: [u] } = await query<{ plan: Plan }>(
    `SELECT CASE WHEN plan_expires_at > now() THEN plan ELSE 'free' END AS plan FROM users WHERE id = $1`,
    [userId]
  );
  return u?.plan ?? 'free';
}

async function findProject(id: number, userId: number): Promise<ProjectRow | null> {
  const { rows: [p] } = await query<ProjectRow>(
    `${PROJECT_SELECT} WHERE p.id = $1 AND p.user_id = $2 GROUP BY p.id`,
    [id, userId]
  );
  return p ?? null;
}

// Lista os projetos do usuário
r.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const plan = await getPlan(id);
  const { rows: projects } = await query<ProjectRow>(
    `${PROJECT_SELECT} WHERE p.user_id = $1 GROUP BY p.id ORDER BY p.created_at DESC`,
    [id]
  );
  res.json({ projects, plan, limit: plan === 'free' ? FREE_PROJECT_LIMIT : null });
});

// Um projeto com suas tarefas
r.get('/:projectId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const projectId = parseId(req.params.projectId);
  if (!projectId) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const project = await findProject(projectId, id);
  if (!project) {
    res.status(404).json({ error: 'Projeto não encontrado' });
    return;
  }

  const { rows: tasks } = await query(
    `SELECT id, title, done, priority, to_char(due_date, 'YYYY-MM-DD') AS due_date,
            project_id, created_at, updated_at
     FROM tasks WHERE project_id = $1 AND user_id = $2
     ORDER BY done, created_at DESC`,
    [projectId, id]
  );
  res.json({ project, tasks });
});

// Cria projeto
r.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const parsed = createSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: firstIssue(parsed.error) });
    return;
  }

  const plan = await getPlan(id);
  if (plan === 'free') {
    const { rows: [c] } = await query<{ n: number }>(
      'SELECT COUNT(*)::int AS n FROM projects WHERE user_id = $1',
      [id]
    );
    if (c.n >= FREE_PROJECT_LIMIT) {
      res.status(403).json({
        error: `Limite do plano Free atingido (${FREE_PROJECT_LIMIT} projetos). Assine o Pro.`,
      });
      return;
    }
  }

  const d = parsed.data;
  const { rows: [created] } = await query<{ id: number }>(
    'INSERT INTO projects (user_id, name, description, color) VALUES ($1, $2, $3, $4) RETURNING id',
    [id, d.name, d.description ?? null, d.color ?? '#2563eb']
  );

  const project = await findProject(created.id, id);
  res.status(201).json(project);
});

// Atualiza nome, descrição ou cor
r.patch('/:projectId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const projectId = parseId(req.params.projectId);
  if (!projectId) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const parsed = patchSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: firstIssue(parsed.error) });
    return;
  }

  const current = await findProject(projectId, id);
  if (!current) {
    res.status(404).json({ error: 'Projeto não encontrado' });
    return;
  }

  const d = parsed.data;
  await query(
    'UPDATE projects SET name = $1, description = $2, color = $3 WHERE id = $4 AND user_id = $5',
    [
      d.name ?? current.name,
      d.description !== undefined ? d.description : current.description,
      d.color ?? current.color,
      projectId,
      id,
    ]
  );

  res.json(await findProject(projectId, id));
});

// Exclui projeto (as tarefas continuam, sem projeto)
r.delete('/:projectId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const projectId = parseId(req.params.projectId);
  if (!projectId) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const { rowCount } = await query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [projectId, id]);
  if (!rowCount) {
    res.status(404).json({ error: 'Projeto não encontrado' });
    return;
  }
  res.sendStatus(204);
});

export default r;