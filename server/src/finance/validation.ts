import { z } from 'zod';

export const MAX_AMOUNT_CENTS = 2_000_000_000; // limite do INTEGER no Postgres (~R$ 20 milhões)

export const firstIssue = (err: z.ZodError): string => err.issues[0]?.message ?? 'Dados inválidos';

// Rejeita datas como 2026-02-31, que passam no regex mas não existem
const isRealDate = (value: string): boolean => {
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

const DateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').refine(isRealDate, 'Data inválida');
const Id = z.number().int().positive();
const Money = z
  .number()
  .int('Valor deve estar em centavos')
  .positive('Valor deve ser maior que zero')
  .max(MAX_AMOUNT_CENTS, 'Valor muito alto');
const Name = z.string().trim().min(1, 'Nome obrigatório').max(80, 'Nome muito longo');
const Description = z.string().trim().min(1, 'Descrição obrigatória').max(120, 'Descrição muito longa');
const Notes = z.string().trim().max(1000, 'Observação muito longa');
const Institution = z.string().trim().max(80).nullable();

const ACCOUNT_TYPES = ['checking', 'savings', 'wallet', 'credit_card', 'investment', 'other'] as const;
const CATEGORY_TYPES = ['income', 'expense', 'both'] as const;
const TX_TYPES = ['income', 'expense', 'transfer'] as const;

export const accountCreate = z.object({
  name: Name,
  institution: Institution.optional(),
  type: z.enum(ACCOUNT_TYPES),
  openingBalanceCents: z.number().int().min(-MAX_AMOUNT_CENTS).max(MAX_AMOUNT_CENTS).default(0),
  openingDate: DateKey,
});

export const accountPatch = z.object({
  name: Name.optional(),
  institution: Institution.optional(),
  type: z.enum(ACCOUNT_TYPES).optional(),
  openingBalanceCents: z.number().int().min(-MAX_AMOUNT_CENTS).max(MAX_AMOUNT_CENTS).optional(),
  openingDate: DateKey.optional(),
  archived: z.boolean().optional(),
}).strict();

export const categoryCreate = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório').max(60, 'Nome muito longo'),
  type: z.enum(CATEGORY_TYPES),
});

export const categoryPatch = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório').max(60, 'Nome muito longo').optional(),
  type: z.enum(CATEGORY_TYPES).optional(),
  archived: z.boolean().optional(),
}).strict();

export const transactionCreate = z.object({
  type: z.enum(TX_TYPES),
  description: Description,
  amountCents: Money,
  date: DateKey,
  accountId: Id,
  destinationAccountId: Id.nullable().optional(),
  categoryId: Id.nullable().optional(),
  state: z.enum(['settled', 'pending']),
  notes: Notes.nullable().optional(),
});

// Tipo e situação não mudam depois de criada; use settle/unsettle para a situação
export const transactionPatch = z.object({
  description: Description.optional(),
  amountCents: Money.optional(),
  date: DateKey.optional(),
  accountId: Id.optional(),
  destinationAccountId: Id.nullable().optional(),
  categoryId: Id.nullable().optional(),
  notes: Notes.nullable().optional(),
}).strict();

export const settleBody = z.object({ effectiveDate: DateKey.optional() }).strict();