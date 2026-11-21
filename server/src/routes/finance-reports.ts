import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/auth.js';
import {
  addDays, changePercent, deriveStatus, periodRange, todayInSaoPaulo, UPCOMING_DAYS,
} from '../finance/time.js';
import type { FinancePeriod } from '../finance/time.js';
import { MAX_AMOUNT_CENTS, firstIssue } from '../finance/validation.js';
import { fetchAccounts } from './finance.js';

type Handler = (req: Request, res: Response) => Promise<void>;
const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};
const userIdOf = (req: Request): number => (req as AuthRequest).user.id;
const fail = (res: Response, status: number, error: string): void => {
  res.status(status).json({ error });
};

const r = Router();

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

const PERIOD_LABEL: Record<FinancePeriod, string> = {
  'this-month': 'Este mês',
  'previous-month': 'Mês anterior',
  'last-30-days': 'Últimos 30 dias',
  'last-90-days': 'Últimos 90 dias',
  custom: 'Período personalizado',
};

const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/* ---------- Escopo: período + conta ---------- */

const DateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida');
const scopeQuery = z.object({
  period: z.enum(['this-month', 'previous-month', 'last-30-days', 'last-90-days', 'custom']).default('this-month'),
  accountId: z.string().default('all'),
  from: DateKey.optional(),
  to: DateKey.optional(),
});

type Scope = { period: FinancePeriod; from: string; to: string; accountId: number | null };

async function scopeOf(req: Request, res: Response): Promise<Scope | null> {
  const parsed = scopeQuery.safeParse(req.query);
  if (!parsed.success) {
    fail(res, 400, firstIssue(parsed.error));
    return null;
  }
  const q = parsed.data;
  if (q.period === 'custom') {
    if (!q.from || !q.to) {
      fail(res, 400, 'Período personalizado exige início e fim');
      return null;
    }
    if (q.from > q.to) {
      fail(res, 400, 'A data inicial é posterior à data final');
      return null;
    }
    if (daysBetween(q.from, q.to) > 730) {
      fail(res, 400, 'O período máximo é de 2 anos');
      return null;
    }
  }

  let accountId: number | null = null;
  if (q.accountId !== 'all') {
    if (!/^\d+$/.test(q.accountId)) {
      fail(res, 400, 'Conta inválida');
      return null;
    }
    accountId = Number(q.accountId);
    const { rows: [account] } = await query<{ id: number }>(
      'SELECT id FROM finance_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userIdOf(req)],
    );
    if (!account) {
      fail(res, 404, 'Conta não encontrada');
      return null;
    }
  }

  const range = periodRange(
    q.period,
    todayInSaoPaulo(),
    q.from && q.to ? { from: q.from, to: q.to } : undefined,
  );
  return { period: q.period, ...range, accountId };
}

// Acrescenta o filtro de conta e devolve a cláusula SQL. Mantém os índices de $n corretos.
function accountClause(accountId: number | null, params: unknown[]): string {
  if (accountId === null) return '';
  params.push(accountId);
  return ` AND account_id = $${params.length}`;
}

/* ---------- Totais ---------- */

async function totals(userId: number, from: string, to: string, accountId: number | null) {
  const params: unknown[] = [userId, from, to];
  const { rows } = await query<{ type: 'income' | 'expense'; total: string }>(
    `SELECT type, SUM(amount_cents)::bigint AS total
     FROM finance_transactions
     WHERE user_id = $1 AND state = 'settled' AND deleted_at IS NULL
       AND type IN ('income', 'expense')
       AND effective_date BETWEEN $2::date AND $3::date${accountClause(accountId, params)}
     GROUP BY type`,
    params,
  );
  const out = { income: 0, expense: 0 };
  for (const row of rows) out[row.type] = Number(row.total);
  return out;
}

// Período anterior de mesma duração, imediatamente antes do atual
function previousRange(from: string, to: string): { from: string; to: string } {
  const span = daysBetween(from, to) + 1;
  return { from: addDays(from, -span), to: addDays(from, -1) };
}

r.get('/metrics', requireAuth, wrap(async (req, res) => {
  const scope = await scopeOf(req, res);
  if (!scope) return;
  const userId = userIdOf(req);

  const prev = previousRange(scope.from, scope.to);
  const [current, before, accounts] = await Promise.all([
    totals(userId, scope.from, scope.to, scope.accountId),
    totals(userId, prev.from, prev.to, scope.accountId),
    fetchAccounts(userId),
  ]);

  const balanceCents = accounts
    .filter((a) => !a.archivedAt && (scope.accountId === null || a.id === scope.accountId))
    .reduce((sum, a) => sum + a.balanceCents, 0);

  const result = current.income - current.expense;
  const resultBefore = before.income - before.expense;

  res.json({
    currency: 'BRL',
    periodLabel: PERIOD_LABEL[scope.period],
    currentBalanceCents: balanceCents,
    incomeSettledCents: current.income,
    expenseSettledCents: current.expense,
    resultSettledCents: result,
    comparison: {
      label: 'período anterior',
      incomeChangePercent: changePercent(current.income, before.income),
      expenseChangePercent: changePercent(current.expense, before.expense),
      resultChangePercent: changePercent(result, resultBefore),
    },
    updatedAt: new Date().toISOString(),
  });
}));

/* ---------- Fluxo de caixa ---------- */

type Gran = 'day' | 'week' | 'month';

// Até 31 dias: diário. Até 120: semanal. Acima disso: mensal.
const granularityFor = (from: string, to: string): Gran => {
  const days = daysBetween(from, to) + 1;
  return days <= 31 ? 'day' : days <= 120 ? 'week' : 'month';
};

// Chave do balde: o próprio dia, a segunda-feira da semana ou o dia 1 do mês
const bucketStart = (date: string, g: Gran): string => {
  if (g === 'day') return date;
  if (g === 'month') return `${date.slice(0, 8)}01`;
  const dow = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7; // segunda = 0
  return addDays(date, -dow);
};

const bucketLabel = (key: string, g: Gran): string =>
  g === 'month'
    ? `${MONTHS[Number(key.slice(5, 7)) - 1]}/${key.slice(2, 4)}`
    : `${key.slice(8, 10)}/${key.slice(5, 7)}`;

r.get('/cashflow', requireAuth, wrap(async (req, res) => {
  const scope = await scopeOf(req, res);
  if (!scope) return;
  const g = granularityFor(scope.from, scope.to);

  // Cria todos os baldes do período, inclusive os sem movimento (o gráfico precisa deles)
  const buckets = new Map<string, { label: string; incomeCents: number; expenseCents: number }>();
  for (let d = scope.from; d <= scope.to; d = addDays(d, 1)) {
    const key = bucketStart(d, g);
    if (!buckets.has(key)) {
      buckets.set(key, { label: bucketLabel(key, g), incomeCents: 0, expenseCents: 0 });
    }
  }

  const params: unknown[] = [userIdOf(req), scope.from, scope.to];
  const { rows } = await query<{ day: string; type: 'income' | 'expense'; total: string }>(
    `SELECT to_char(effective_date, 'YYYY-MM-DD') AS day, type, SUM(amount_cents)::bigint AS total
     FROM finance_transactions
     WHERE user_id = $1 AND state = 'settled' AND deleted_at IS NULL
       AND type IN ('income', 'expense')
       AND effective_date BETWEEN $2::date AND $3::date${accountClause(scope.accountId, params)}
     GROUP BY 1, 2`,
    params,
  );

  for (const row of rows) {
    const bucket = buckets.get(bucketStart(row.day, g));
    if (!bucket) continue;
    if (row.type === 'income') bucket.incomeCents += Number(row.total);
    else bucket.expenseCents += Number(row.total);
  }

  res.json({ flow: [...buckets.values()] });
}));

/* ---------- Vencimentos ---------- */

r.get('/due-items', requireAuth, wrap(async (req, res) => {
  const userId = userIdOf(req);
  const today = todayInSaoPaulo();
  const urgent = req.query.filter === 'urgent';

  const params: unknown[] = [userId, today];
  let horizon = '';
  if (urgent) {
    params.push(addDays(today, UPCOMING_DAYS));
    horizon = `AND t.due_date <= $3::date`;
  }

  // Atrasados primeiro, depois por data de vencimento
  const { rows } = await query<{
    id: number; type: 'income' | 'expense'; description: string; amount_cents: number; due_date: string;
  }>(
    `SELECT t.id, t.type, t.description, t.amount_cents, to_char(t.due_date, 'YYYY-MM-DD') AS due_date
     FROM finance_transactions t
     WHERE t.user_id = $1 AND t.state = 'pending' AND t.deleted_at IS NULL
       AND t.type IN ('income', 'expense') ${horizon}
     ORDER BY (t.due_date < $2::date) DESC, t.due_date ASC, t.id ASC
     LIMIT 50`,
    params,
  );

  res.json({
    dueItems: rows.map((row) => ({
      id: row.id,
      type: row.type === 'expense' ? 'pay' : 'receive',
      description: row.description,
      amountCents: row.amount_cents,
      dueDate: row.due_date,
      status: deriveStatus('pending', row.due_date, today),
    })),
  });
}));

/* ---------- Despesas por categoria ---------- */

r.get('/categories/expenses', requireAuth, wrap(async (req, res) => {
  const scope = await scopeOf(req, res);
  if (!scope) return;

  const params: unknown[] = [userIdOf(req), scope.from, scope.to];
  const { rows } = await query<{ category_id: number | null; name: string | null; total: string }>(
    `SELECT t.category_id, c.name, SUM(t.amount_cents)::bigint AS total
     FROM finance_transactions t
     LEFT JOIN finance_categories c ON c.id = t.category_id
     WHERE t.user_id = $1 AND t.type = 'expense' AND t.state = 'settled' AND t.deleted_at IS NULL
       AND t.effective_date BETWEEN $2::date AND $3::date${accountClause(scope.accountId, params)}
     GROUP BY t.category_id, c.name
     ORDER BY total DESC`,
    params,
  );

  const total = rows.reduce((sum, row) => sum + Number(row.total), 0);
  res.json({
    expensesByCategory: rows.map((row) => {
      const amount = Number(row.total);
      return {
        id: row.category_id === null ? 'none' : String(row.category_id),
        name: row.name ?? 'Sem categoria',
        amountCents: amount,
        sharePercent: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
      };
    }),
  });
}));

/* ---------- Orçamentos ---------- */

// Converte "YYYY-MM" em "YYYY-MM-01". Sem valor, usa o mês atual de São Paulo.
function monthStart(raw: unknown): string | null {
  const value = typeof raw === 'string' && raw ? raw : todayInSaoPaulo().slice(0, 7);
  return MONTH_KEY.test(value) ? `${value}-01` : null;
}

const monthLabelOf = (monthKey: string): string =>
  `${MONTHS[Number(monthKey.slice(5, 7)) - 1]}/${monthKey.slice(0, 4)}`;

r.get('/budgets', requireAuth, wrap(async (req, res) => {
  const userId = userIdOf(req);
  const month = monthStart(req.query.month);
  if (!month) return fail(res, 400, 'Mês inválido');

  // Gasto = despesas efetivadas da categoria dentro do mês do orçamento
  const { rows } = await query<{
    id: number; category_name: string; limit_cents: number; spent_cents: string;
  }>(
    `SELECT b.id, c.name AS category_name, b.limit_cents,
       COALESCE((
         SELECT SUM(t.amount_cents) FROM finance_transactions t
         WHERE t.user_id = b.user_id AND t.category_id = b.category_id
           AND t.type = 'expense' AND t.state = 'settled' AND t.deleted_at IS NULL
           AND t.effective_date >= b.period_month
           AND t.effective_date < (b.period_month + interval '1 month')::date
       ), 0)::bigint AS spent_cents
     FROM finance_budgets b
     JOIN finance_categories c ON c.id = b.category_id
     WHERE b.user_id = $1 AND b.period_month = $2::date
     ORDER BY c.name`,
    [userId, month],
  );

  res.json({
    budgets: rows.map((row) => ({
      id: row.id,
      categoryName: row.category_name,
      periodLabel: monthLabelOf(month.slice(0, 7)),
      limitCents: row.limit_cents,
      spentCents: Number(row.spent_cents),
    })),
  });
}));

const budgetBody = z.object({
  categoryId: z.number().int().positive(),
  limitCents: z.number().int().positive().max(MAX_AMOUNT_CENTS, 'Valor muito alto'),
  month: z.string().regex(MONTH_KEY, 'Mês inválido').optional(),
}).strict();

// Cria ou substitui o limite da categoria no mês
r.put('/budgets', requireAuth, wrap(async (req, res) => {
  const userId = userIdOf(req);
  const parsed = budgetBody.safeParse(req.body ?? {});
  if (!parsed.success) return fail(res, 400, firstIssue(parsed.error));
  const { categoryId, limitCents } = parsed.data;

  const month = monthStart(parsed.data.month);
  if (!month) return fail(res, 400, 'Mês inválido');

  const { rows: [category] } = await query<{ id: number }>(
    'SELECT id FROM finance_categories WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
    [categoryId, userId],
  );
  if (!category) return fail(res, 404, 'Categoria não encontrada ou arquivada');

  await query(
    `INSERT INTO finance_budgets (user_id, category_id, limit_cents, period_month)
     VALUES ($1, $2, $3, $4::date)
     ON CONFLICT (user_id, category_id, period_month)
     DO UPDATE SET limit_cents = EXCLUDED.limit_cents`,
    [userId, categoryId, limitCents, month],
  );
  res.json({ ok: true });
}));

export default r;