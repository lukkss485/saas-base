import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { sendMail } from '../mail.js';
import type { AuthRequest } from '../types/auth.js';

const ROLES = ['admin', 'membro', 'visualizador'] as const;

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(200),
  role: z.enum(ROLES).default('membro'),
});
const roleSchema = z.object({ role: z.enum(ROLES) });

const firstIssue = (err: z.ZodError): string => err.issues[0]?.message ?? 'Dados inválidos';
function parseId(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

type Member = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  status: string;
  invited_at: string;
};

const MEMBER_COLS = 'id, email, name, role, status, invited_at';
const r = Router();

r.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const { rows } = await query<Member>(
    `SELECT ${MEMBER_COLS} FROM team_members WHERE owner_id = $1 ORDER BY invited_at DESC`,
    [id]
  );
  res.json({ members: rows });
});

r.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id, email: ownerEmail } = (req as AuthRequest).user;
  const parsed = inviteSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: firstIssue(parsed.error) });
    return;
  }

  const { email, role } = parsed.data;
  if (email === ownerEmail.toLowerCase()) {
    res.status(400).json({ error: 'Você já faz parte da equipe' });
    return;
  }

  try {
    const { rows: [member] } = await query<Member>(
      `INSERT INTO team_members (owner_id, email, role) VALUES ($1, $2, $3) RETURNING ${MEMBER_COLS}`,
      [id, email, role]
    );

    // Envio em segundo plano: o convite já está salvo mesmo se o e-mail falhar
    void sendMail({
      to: email,
      subject: 'Você foi convidado para a NovaTech',
      text: `${ownerEmail} convidou você para a equipe NovaTech como ${role}.\nSe você já tem conta com este e-mail, entre em ${process.env.APP_URL}/login.\nSe ainda não tem, crie a conta em ${process.env.APP_URL}/register.`,
    }).catch((e) => console.error('Falha ao enviar convite:', e));

    res.status(201).json(member);
  } catch (e) {
    if ((e as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'Este e-mail já foi convidado' });
      return;
    }
    throw e;
  }
});

r.patch('/:memberId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const memberId = parseId(req.params.memberId);
  if (!memberId) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const parsed = roleSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: firstIssue(parsed.error) });
    return;
  }

  const { rows: [member] } = await query<Member>(
    `UPDATE team_members SET role = $1 WHERE id = $2 AND owner_id = $3 RETURNING ${MEMBER_COLS}`,
    [parsed.data.role, memberId, id]
  );
  if (!member) {
    res.status(404).json({ error: 'Membro não encontrado' });
    return;
  }
  res.json(member);
});

r.delete('/:memberId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = (req as AuthRequest).user;
  const memberId = parseId(req.params.memberId);
  if (!memberId) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const { rowCount } = await query('DELETE FROM team_members WHERE id = $1 AND owner_id = $2', [memberId, id]);
  if (!rowCount) {
    res.status(404).json({ error: 'Membro não encontrado' });
    return;
  }
  res.sendStatus(204);
});

export default r;