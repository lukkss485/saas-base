import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/auth.js';
import { deriveStatus, todayInSaoPaulo } from '../finance/time.js';
import {
  accountCreate, accountPatch, categoryCreate, categoryPatch,
  firstIssue, settleBody, transactionCreate, transactionPatch,
} from '../finance/validation.js';

type TxType = 'income' | 'expense' | 'transfer';
type TxState = 'settled' | 'pending';

type AccountDto = {
  id: number; name: string; institution: string | null; type: string;
  openingBalanceCents: number; openingDate: string; archivedAt: string | null; balanceCents: number;
};

type CategoryDto = { id: number; name: string; type: string; archivedAt: string | null };

type TxRow = {
  id: number; type: TxType; description: string; amount_cents: number; state: TxState;
  due_date: string | null; effective_date: string | null;
  account_id: number; destination_account_id: number | null; category_id: number | null;
  notes: string | null; created_at: string;
  account_name: string; destination_account_name: string | null; category_name: string | null;
};

type TxFields = {
  type: TxType;
  accountId: number;
  destinationAccountId: number | null;
  categoryId: number | null;
};

const r = Router();

/* ---------- Utilitários ---------- */

type Handler = (req: Request, res: Response) => Promise<void>;
const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};

const userIdOf = (req: Request): number => (req as AuthRequest).user.id;

const parseId = (raw: unknown): number | null => {
  if (typeof raw !== 'string') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const parseDateKey = (raw: unknown): string | null => {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const timestamp = Date.parse(`${raw}T00:00:00Z`);
  return Number.isNaN(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== raw
    ? null
    : raw;
};

const fail = (res: Response, status: number, error: string): void => {
  res.status(status).json({ error });
};

const isUniqueViolation = (err: unknown): boolean =>
  (err as { code?: string })?.code === '23505';

// Confirma que o registro existe e pertence ao usuário (nunca confie no id do cliente)
async function owns(table: 'finance_accounts' | 'finance_categories', id: number, userId: number): Promise<boolean> {
  const { rows: [row] } = await query<{ id: number }>(
    `SELECT id FROM ${table} WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return !!row;
}

// Regra de transferência e compatibilidade de categoria. Retorna a mensagem de erro, ou null se estiver ok.
async function validateRefs(userId: number, f: TxFields): Promise<string | null> {
  const ids = [f.accountId, f.destinationAccountId].filter((v): v is number => v !== null);
  const { rows: accounts } = await query<{ id: number; archived_at: string | null }>(
    'SELECT id, archived_at FROM finance_accounts WHERE user_id = $1 AND id = ANY($2::int[])',
    [userId, ids],
  );
  const active = new Set(accounts.filter((a) => !a.archived_at).map((a) => a.id));

  if (!active.has(f.accountId)) return 'Conta não encontrada ou arquivada';

  if (f.type === 'transfer') {
    if (f.destinationAccountId === null) return 'Transferência exige conta de destino';
    if (!active.has(f.destinationAccountId)) return 'Conta de destino não encontrada ou arquivada';
    if (f.destinationAccountId === f.accountId) return 'Origem e destino devem ser contas diferentes';
    if (f.categoryId !== null) return 'Transferência não aceita categoria';
    return null;
  }

  if (f.destinationAccountId !== null) return 'Somente transferências têm conta de destino';

  if (f.categoryId !== null) {
    const { rows: [cat] } = await query<{ type: string; archived_at: string | null }>(
      'SELECT type, archived_at FROM finance_categories WHERE id = $1 AND user_id = $2',
      [f.categoryId, userId],
    );
    if (!cat || cat.archived_at) return 'Categoria não encontrada ou arquivada';
    if (cat.type !== 'both' && cat.type !== f.type) return 'Categoria incompatível com o tipo da transação';
  }
  return null;
}

/* ---------- Contas ---------- */

// Saldo = saldo inicial + entradas − saídas − transferências de saída + transferências de entrada.
// Só conta efetivadas com data até hoje.
const sumTx = (cond: string) => `COALESCE((
  SELECT SUM(t.amount_cents) FROM finance_transactions t
  WHERE t.user_id = a.user_id AND t.state = 'settled' AND t.deleted_at IS NULL
    AND t.effective_date <= $2::date AND ${cond}
), 0)`;

const ACCOUNT_SELECT = `
  SELECT a.id, a.name, a.institution, a.type,
    a.opening_balance_cents AS "openingBalanceCents",
    to_char(a.opening_date, 'YYYY-MM-DD') AS "openingDate",
    a.archived_at AS "archivedAt",
    (a.opening_balance_cents
      + ${sumTx("t.type = 'income' AND t.account_id = a.id")}
      - ${sumTx("t.type = 'expense' AND t.account_id = a.id")}
      - ${sumTx("t.type = 'transfer' AND t.account_id = a.id")}
      + ${sumTx("t.type = 'transfer' AND t.destination_account_id = a.id")}
    )::int AS "balanceCents"
  FROM finance_accounts a`;

export async function fetchAccounts(userId: number, id?: number): Promise<AccountDto[]> {
  const params: unknown[] = [userId, todayInSaoPaulo()];
  let where = 'WHERE a.user_id = $1';
  if (id !== undefined) {
    params.push(id);  
    where += ' AND a.id = $3';
  }
  const { rows } = await query<AccountDto>(
    `${ACCOUNT_SELECT} ${where} ORDER BY (a.archived_at IS NOT NULL), a.created_at, a.id`,
    params,
  );
  return rows;
}

r.get('/accounts', requireAuth, wrap(async (req, res) => {
  res.json({ accounts: await fetchAccounts(userIdOf(req)) });
}));

r.post('/accounts', requireAuth, wrap(async (req, res) => {
  const userId = userIdOf(req);
  const parsed = accountCreate.safeParse(req.body ?? {});
  if (!parsed.success) return fail(res, 400, firstIssue(parsed.error));
  const d = parsed.data;

  const { rows: [row] } = await query<{ id: number }>(
    `INSERT INTO finance_accounts (user_id, name, institution, type, opening_balance_cents, opening_date)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [userId, d.name, d.institution ?? null, d.type, d.openingBalanceCents, d.openingDate],
  );
  const [account] = await fetchAccounts(userId, row.id);
  res.status(201).json(account);
}));

r.patch('/accounts/:id', requireAuth, wrap(async (req, res) => {
  const userId = userIdOf(req);
  const id = parseId(req.params.id);
  if (id === null) return fail(res, 400, 'ID inválido');

  const parsed = accountPatch.safeParse(req.body ?? {});
  if (!parsed.success) return fail(res, 400, firstIssue(parsed.error));

  const [cur] = await fetchAccounts(userId, id);
  if (!cur) return fail(res, 404, 'Conta não encontrada');

  const d = parsed.data;
  const archivedAt = d.archived === undefined
    ? cur.archivedAt
    : d.archived ? new Date().toISOString() : null;

  await query(
    `UPDATE finance_accounts
     SET name = $1, institution = $2, type = $3, opening_balance_cents = $4,
         opening_date = $5, archived_at = $6, updated_at = now()
     WHERE id = $7 AND user_id = $8`,
    [
      d.name ?? cur.name,
      d.institution !== undefined ? d.institution : cur.institution,
      d.type ?? cur.type,
      d.openingBalanceCents ?? cur.openingBalanceCents,
      d.openingDate ?? cur.openingDate,
      archivedAt,
      id,
      userId,
    ],
  );
  const [updated] = await fetchAccounts(userId, id);
  res.json(updated);
}));

// Conta com movimentações é arquivada; sem movimentações, é apagada de fato.
r.delete('/accounts/:id', requireAuth, wrap(async (req, res) => {
  const userId = userIdOf(req);
  const id = parseId(req.params.id);
  if (id === null) return fail(res, 400, 'ID inválido');
  if (!(await owns('finance_accounts', id, userId))) return fail(res, 404, 'Conta não encontrada');

  const { rows: [used] } = await query<{ used: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM finance_transactions WHERE account_id = $1 OR destination_account_id = $1
     ) AS used`,
    [id],
  );

  if (used.used) {
    await query('UPDATE finance_accounts SET archived_at = now() WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ archived: true });
    return;
  }
  await query('DELETE FROM finance_accounts WHERE id = $1 AND user_id = $2', [id, userId]);
  res.sendStatus(204);
}));

/* ---------- Categorias ---------- */

async function fetchCategories(userId: number): Promise<CategoryDto[]> {
  const { rows } = await query<CategoryDto>(
    `SELECT id, name, type, archived_at AS "archivedAt"
     FROM finance_categories WHERE user_id = $1
     ORDER BY (archived_at IS NOT NULL), lower(name)`,
    [userId],
  );
  return rows;
}

r.get('/categories', requireAuth, wrap(async (req, res) => {
  res.json({ categories: await fetchCategories(userIdOf(req)) });
}));

r.post('/categories', requireAuth, wrap(async (req, res) => {
  const userId = userIdOf(req);
  const parsed = categoryCreate.safeParse(req.body ?? {});
  if (!parsed.success) return fail(res, 400, firstIssue(parsed.error));

  try {
    const { rows: [row] } = await query<{ id: number }>(
      'INSERT INTO finance_categories (user_id, name, type) VALUES ($1, $2, $3) RETURNING id',
      [userId, parsed.data.name, parsed.data.type],
    );
    const category = (await fetchCategories(userId)).find((c) => c.id === row.id);
    res.status(201).json(category);
  } catch (err) {
    if (isUniqueViolation(err)) return fail(res, 409, 'Já existe uma categoria com esse nome');
    throw err;
  }
}));

r.patch('/categories/:id', requireAuth, wrap(async (req, res) => {
  const userId = userIdOf(req);
  const id = parseId(req.params.id);
  if (id === null) return fail(res, 400, 'ID inválido');

  const parsed = categoryPatch.safeParse(req.body ?? {});
  if (!parsed.success) return fail(res, 400, firstIssue(parsed.error));

  const cur = (await fetchCategories(userId)).find((c) => c.id === id);
  if (!cur) return fail(res, 404, 'Categoria não encontrada');

  const d = parsed.data;
  const archivedAt = d.archived === undefined
    ? cur.archivedAt
    : d.archived ? new Date().toISOString() : null;

  try {
    await query(
      'UPDATE finance_categories SET name = $1, type = $2, archived_at = $3 WHERE id = $4 AND user_id = $5',
      [d.name ?? cur.name, d.type ?? cur.type, archivedAt, id, userId],
    );
  } catch (err) {
    if (isUniqueViolation(err)) return fail(res, 409, 'Já existe uma categoria com esse nome');
    throw err;
  }
  res.json((await fetchCategories(userId)).find((c) => c.id === id));
}));

r.delete('/categories/:id', requireAuth, wrap(async (req, res) => {
  const userId = userIdOf(req);
  const id = parseId(req.params.id);
  if (id === null) return fail(res, 400, 'ID inválido');
  if (!(await owns('finance_categories', id, userId))) return fail(res, 404, 'Categoria não encontrada');

  const { rows: [used] } = await query<{ used: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM finance_transactions WHERE category_id = $1) AS used',
    [id],
  );

  if (used.used) {
    await query('UPDATE finance_categories SET archived_at = now() WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ archived: true });
    return;
  }
  await query('DELETE FROM finance_categories WHERE id = $1 AND user_id = $2', [id, userId]);
  res.sendStatus(204);
}));

/* ---------- Transações ---------- */

const TX_SELECT = `
  SELECT t.id, t.type, t.description, t.amount_cents, t.state,
    to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
    to_char(t.effective_date, 'YYYY-MM-DD') AS effective_date,
    t.account_id, t.destination_account_id, t.category_id, t.notes, t.created_at,
    a.name AS account_name,
    da.name AS destination_account_name,
    c.name AS category_name
  FROM finance_transactions t
  JOIN finance_accounts a ON a.id = t.account_id
  LEFT JOIN finance_accounts da ON da.id = t.destination_account_id
  LEFT JOIN finance_categories c ON c.id = t.category_id`;

async function fetchTransaction(userId: number, id: number): Promise<TxRow | null> {
  const { rows: [row] } = await query<TxRow>(
    `${TX_SELECT} WHERE t.id = $1 AND t.user_id = $2 AND t.deleted_at IS NULL`,
    [id, userId],
  );
  return row ?? null;
}

function toDto(row: TxRow, today: string) {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    amountCents: row.amount_cents,
    state: row.state,
    status: deriveStatus(row.state, row.due_date, today),
    dueDate: row.due_date,
    effectiveDate: row.effective_date,
    date: row.state === 'settled' ? row.effective_date : row.due_date,
    accountId: row.account_id,
    accountName: row.account_name,
    destinationAccountId: row.destination_account_id,
    destinationAccountName: row.destination_account_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

// Pendente usa due_date; efetivada usa effective_date e mantém due_date como histórico
function dateColumns(state: TxState, date: string, currentDue: string | null) {
  return state === 'pending'
    ? { due: date, effective: null }
    : { due: currentDue, effective: date };
}

r.get('/transactions', requireAuth, wrap(async (req, res) => {
  const userId = userIdOf(req);
  const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 100);
  const rawAccountId = req.query.accountId;
  let accountFilter = '';
  let dateFilter = '';
  const params: unknown[] = [userId];
  if (rawAccountId !== undefined && rawAccountId !== 'all') {
    const accountId = parseId(rawAccountId);
    if (accountId === null) return fail(res, 400, 'Conta inválida');
    if (!(await owns('finance_accounts', accountId, userId))) return fail(res, 404, 'Conta não encontrada');
    params.push(accountId);
    accountFilter = ` AND (t.account_id = $${params.length} OR t.destination_account_id = $${params.length})`;
  }
  const rawFrom = req.query.from;
  const rawTo = req.query.to;
  if (rawFrom !== undefined || rawTo !== undefined) {
    const from = parseDateKey(rawFrom);
    const to = parseDateKey(rawTo);
    if (!from || !to) return fail(res, 400, 'Período inválido');
    if (from > to) return fail(res, 400, 'A data inicial é posterior à data final');
    params.push(from, to);
    dateFilter = ` AND COALESCE(t.effective_date, t.due_date) BETWEEN $${params.length - 1}::date AND $${params.length}::date`;
  }
  params.push(limit);
  const { rows } = await query<TxRow>(
    `${TX_SELECT}
     WHERE t.user_id = $1 AND t.deleted_at IS NULL${accountFilter}${dateFilter}
     ORDER BY COALESCE(t.effective_date, t.due_date) DESC NULLS LAST, t.id DESC
     LIMIT $${params.length}`,
    params,
  );
  const today = todayInSaoPaulo();
  res.json({ transactions: rows.map((row) => toDto(row, today)) });
}));

/* Idempotência: a chave é reservada antes de gravar.
 * Repetição com a mesma chave devolve a resposta original, sem criar outra transação.
 */
const RESERVED = JSON.stringify({ pending: true });

type Reserve =
  | { kind: 'new' }
  | { kind: 'replay'; response: unknown }
  | { kind: 'in-progress' };

async function reserveKey(userId: number, key: string): Promise<Reserve> {
  const { rowCount } = await query(
    `INSERT INTO finance_idempotency_keys (user_id, key, response)
     VALUES ($1, $2, $3::jsonb) ON CONFLICT DO NOTHING`,
    [userId, key, RESERVED],
  );
  if (rowCount === 1) return { kind: 'new' };

  const { rows: [row] } = await query<{ response: { pending?: boolean } }>(
    'SELECT response FROM finance_idempotency_keys WHERE user_id = $1 AND key = $2',
    [userId, key],
  );
  if (!row || row.response?.pending) return { kind: 'in-progress' };
  return { kind: 'replay', response: row.response };
}

r.post('/transactions', requireAuth, wrap(async (req, res) => {
  const userId = userIdOf(req);
  const parsed = transactionCreate.safeParse(req.body ?? {});
  if (!parsed.success) return fail(res, 400, firstIssue(parsed.error));
  const b = parsed.data;

  const fields: TxFields = {
    type: b.type,
    accountId: b.accountId,
    destinationAccountId: b.destinationAccountId ?? null,
    categoryId: b.categoryId ?? null,
  };
  const refError = await validateRefs(userId, fields);
  if (refError) return fail(res, 400, refError);

  const key = req.header('Idempotency-Key')?.trim() || null;
  if (key !== null && key.length > 200) return fail(res, 400, 'Idempotency-Key muito longa');

  if (key) {
    const reserved = await reserveKey(userId, key);
    if (reserved.kind === 'replay') {
      res.status(201).json(reserved.response);
      return;
    }
    if (reserved.kind === 'in-progress') return fail(res, 409, 'Requisição já está sendo processada');
  }

  try {
    const { dueCol, effectiveCol } = { dueCol: null as string | null, effectiveCol: null as string | null };
    void dueCol; void effectiveCol; // (tratado abaixo)

    const { due, effective } = dateColumns(b.state, b.date, null);
    const { rows: [inserted] } = await query<{ id: number }>(
      `INSERT INTO finance_transactions
         (user_id, type, description, amount_cents, account_id, destination_account_id,
          category_id, state, due_date, effective_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        userId, b.type, b.description, b.amountCents, fields.accountId, fields.destinationAccountId,
        fields.categoryId, b.state, due, effective, b.notes ?? null,
      ],
    );

    const row = await fetchTransaction(userId, inserted.id);
    if (!row) throw new Error('Transação criada não encontrada');
    const dto = toDto(row, todayInSaoPaulo());

    if (key) {
      await query(
        'UPDATE finance_idempotency_keys SET response = $3::jsonb WHERE user_id = $1 AND key = $2',
        [userId, key, JSON.stringify(dto)],
      );
    }
    res.status(201).json(dto);
  } catch (err) {
    // Libera a reserva para que o cliente possa tentar de novo
    if (key) {
      await query(
        'DELETE FROM finance_idempotency_keys WHERE user_id = $1 AND key = $2 AND response = $3::jsonb',
        [userId, key, RESERVED],
      );
    }
    throw err;
  }
}));

r.patch('/transactions/:id', requireAuth, wrap(async (req, res) => {
  const userId = userIdOf(req);
  const id = parseId(req.params.id);
  if (id === null) return fail(res, 400, 'ID inválido');

  const parsed = transactionPatch.safeParse(req.body ?? {});
  if (!parsed.success) return fail(res, 400, firstIssue(parsed.error));

  const cur = await fetchTransaction(userId, id);
  if (!cur) return fail(res, 404, 'Transação não encontrada');

  const d = parsed.data;
  const curDate = (cur.state === 'settled' ? cur.effective_date : cur.due_date) ?? todayInSaoPaulo();

  const next = {
    type: cur.type,
    state: cur.state,
    description: d.description ?? cur.description,
    amountCents: d.amountCents ?? cur.amount_cents,
    date: d.date ?? curDate,
    notes: d.notes !== undefined ? d.notes : cur.notes,
    accountId: d.accountId ?? cur.account_id,
    destinationAccountId: d.destinationAccountId !== undefined ? d.destinationAccountId : cur.destination_account_id,
    categoryId: d.categoryId !== undefined ? d.categoryId : cur.category_id,
  };

  const refError = await validateRefs(userId, next);
  if (refError) return fail(res, 400, refError);

  const { due, effective } = dateColumns(next.state, next.date, cur.due_date);
  await query(
    `UPDATE finance_transactions
     SET description = $1, amount_cents = $2, account_id = $3, destination_account_id = $4,
         category_id = $5, due_date = $6, effective_date = $7, notes = $8, updated_at = now()
     WHERE id = $9 AND user_id = $10`,
    [
      next.description, next.amountCents, next.accountId, next.destinationAccountId,
      next.categoryId, due, effective, next.notes, id, userId,
    ],
  );

  const updated = await fetchTransaction(userId, id);
  if (!updated) return fail(res, 404, 'Transação não encontrada');
  res.json(toDto(updated, todayInSaoPaulo()));
}));

// Efetiva uma pendente. O WHERE garante que dois cliques não efetivem duas vezes.
r.post('/transactions/:id/settle', requireAuth, wrap(async (req, res) => {
  const userId = userIdOf(req);
  const id = parseId(req.params.id);
  if (id === null) return fail(res, 400, 'ID inválido');

  const parsed = settleBody.safeParse(req.body ?? {});
  if (!parsed.success) return fail(res, 400, firstIssue(parsed.error));
  const date = parsed.data.effectiveDate ?? todayInSaoPaulo();

  const { rowCount } = await query(
    `UPDATE finance_transactions
     SET state = 'settled', effective_date = $1::date, updated_at = now()
     WHERE id = $2 AND user_id = $3 AND state = 'pending' AND deleted_at IS NULL`,
    [date, id, userId],
  );

  if (!rowCount) {
    const cur = await fetchTransaction(userId, id);
    return cur
      ? fail(res, 409, 'Transação já está efetivada')
      : fail(res, 404, 'Transação não encontrada');
  }
  const row = await fetchTransaction(userId, id);
  if (!row) return fail(res, 404, 'Transação não encontrada');
  res.json(toDto(row, todayInSaoPaulo()));
}));

// Volta uma efetivada para pendente. due_date recebe a data efetiva se não existir.
r.post('/transactions/:id/unsettle', requireAuth, wrap(async (req, res) => {
  const userId = userIdOf(req);
  const id = parseId(req.params.id);
  if (id === null) return fail(res, 400, 'ID inválido');

  const { rowCount } = await query(
    `UPDATE finance_transactions
     SET state = 'pending', due_date = COALESCE(due_date, effective_date), effective_date = NULL, updated_at = now()
     WHERE id = $1 AND user_id = $2 AND state = 'settled' AND deleted_at IS NULL`,
    [id, userId],
  );

  if (!rowCount) {
    const cur = await fetchTransaction(userId, id);
    return cur
      ? fail(res, 409, 'Transação já está pendente')
      : fail(res, 404, 'Transação não encontrada');
  }
  const row = await fetchTransaction(userId, id);
  if (!row) return fail(res, 404, 'Transação não encontrada');
  res.json(toDto(row, todayInSaoPaulo()));
}));

// Soft delete: some das listas e dos saldos, mas fica no banco para auditoria
r.delete('/transactions/:id', requireAuth, wrap(async (req, res) => {
  const userId = userIdOf(req);
  const id = parseId(req.params.id);
  if (id === null) return fail(res, 400, 'ID inválido');

  const { rowCount } = await query(
    'UPDATE finance_transactions SET deleted_at = now() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
    [id, userId],
  );
  if (!rowCount) return fail(res, 404, 'Transação não encontrada');
  res.sendStatus(204);
}));

export default r;