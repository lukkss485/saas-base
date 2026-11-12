import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/auth.js';

type PageRow = {
  id: number;
  project_id: number;
  title: string;
  icon: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};
type PageFull = PageRow & { content: Record<string, unknown> };

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };
const r = Router();

const createSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  title: z.string().trim().max(200).optional(),
});

const patchSchema = z.object({
  title: z.string().trim().min(1, 'Título obrigatório').max(200, 'Título muito longo').optional(),
  icon: z.string().max(8).nullable().optional(),
  content: z.object({ type: z.literal('doc') }).passthrough().optional(),
});

const firstIssue = (err: z.ZodError): string => err.issues[0]?.message ?? 'Dados inválidos';

function parseId(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function ownsProject(projectId: number, userId: number): Promise<boolean> {
  const { rows: [p] } = await query<{ id: number }>(
    'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return !!p;
}

// Lista as páginas de um projeto (sem o conteúdo, para ficar leve)
r.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const projectId = parseId(req.query.projectId);
  if (!projectId) {
    res.status(400).json({ error: 'projectId inválido' });
    return;
  }
  if (!(await ownsProject(projectId, id))) {
    res.status(404).json({ error: 'Projeto não encontrado' });
    return;
  }

  const { rows } = await query<PageRow>(
    `SELECT id, project_id, title, icon, position, created_at, updated_at
     FROM project_pages WHERE project_id = $1 AND user_id = $2
     ORDER BY position, id`,
    [projectId, id]
  );
  res.json({ pages: rows });
});

// Abre uma página com o conteúdo completo
r.get('/:pageId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const pageId = parseId(req.params.pageId);
  if (!pageId) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const { rows: [page] } = await query<PageFull>(
    `SELECT id, project_id, title, icon, position, content, created_at, updated_at
     FROM project_pages WHERE id = $1 AND user_id = $2`,
    [pageId, id]
  );
  if (!page) {
    res.status(404).json({ error: 'Página não encontrada' });
    return;
  }
  res.json(page);
});

// Cria uma página vazia no fim da lista
r.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const parsed = createSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: firstIssue(parsed.error) });
    return;
  }
  const { projectId, title } = parsed.data;

  if (!(await ownsProject(projectId, id))) {
    res.status(404).json({ error: 'Projeto não encontrado' });
    return;
  }

  const { rows: [page] } = await query<PageFull>(
    `INSERT INTO project_pages (project_id, user_id, title, content, position)
     VALUES ($1, $2, $3, $4::jsonb,
       (SELECT COALESCE(MAX(position), 0) + 1 FROM project_pages WHERE project_id = $1))
     RETURNING id, project_id, title, icon, position, content, created_at, updated_at`,
    [projectId, id, title || 'Sem título', JSON.stringify(EMPTY_DOC)]
  );
  res.status(201).json(page);
});

// Salva título, ícone e/ou conteúdo
r.patch('/:pageId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const pageId = parseId(req.params.pageId);
  if (!pageId) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const parsed = patchSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: firstIssue(parsed.error) });
    return;
  }
  const d = parsed.data;

  const { rows: [page] } = await query<PageFull>(
    `UPDATE project_pages SET
       title = COALESCE($1::text, title),
       icon = CASE WHEN $2::boolean THEN $3::text ELSE icon END,
       content = COALESCE($4::jsonb, content),
       updated_at = now()
     WHERE id = $5 AND user_id = $6
     RETURNING id, project_id, title, icon, position, content, created_at, updated_at`,
    [
      d.title ?? null,
      d.icon !== undefined,
      d.icon ?? null,
      d.content ? JSON.stringify(d.content) : null,
      pageId,
      id,
    ]
  );
  if (!page) {
    res.status(404).json({ error: 'Página não encontrada' });
    return;
  }
  res.json(page);
});

// Exclui a página
r.delete('/:pageId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const pageId = parseId(req.params.pageId);
  if (!pageId) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const { rowCount } = await query('DELETE FROM project_pages WHERE id = $1 AND user_id = $2', [pageId, id]);
  if (!rowCount) {
    res.status(404).json({ error: 'Página não encontrada' });
    return;
  }
  res.sendStatus(204);
});

export default r;