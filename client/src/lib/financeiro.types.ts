/**
 * Contrato de apresentação da dashboard Financeiro do NT-life.
 * A camada de API deve mapear os modelos reais para estes tipos.
 * Valores monetários são expressos em centavos para evitar floats no domínio.
 */
export type FinancePeriod =
  | 'this-month'
  | 'previous-month'
  | 'last-30-days'
  | 'last-90-days'
  | 'custom';

export type FinanceTransactionType = 'income' | 'expense' | 'transfer';
export type FinanceTransactionStatus = 'settled' | 'pending' | 'overdue';
export type FinanceDueType = 'pay' | 'receive';
export type FinanceDueStatus = 'overdue' | 'upcoming' | 'pending';
export type FinanceWidgetKey =
  | 'metrics'
  | 'cashflow'
  | 'due-items'
  | 'transactions'
  | 'categories'
  | 'accounts'
  | 'budgets';

export interface FinanceAccount {
  id: string;
  name: string;
  /** Saldo atual da conta, em centavos. */
  balanceCents: number | null;
  currency?: string;
  institution?: string | null;
  typeLabel?: string | null;
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
}

export interface FinanceFlowPoint {
  /** Rótulo já localizado para o período, por exemplo "01 out." ou "Semana 2". */
  label: string;
  incomeCents: number;
  expenseCents: number;
}

export interface FinanceDueItem {
  id: string;
  description: string;
  type: FinanceDueType;
  amountCents: number;
  dueDate: string;
  status: FinanceDueStatus;
  accountId?: string | null;
  counterparty?: string | null;
  accountName?: string | null;
}

export interface FinanceTransaction {
  id: string;
  description: string;
  type: FinanceTransactionType;
  amountCents: number;
  status: FinanceTransactionStatus;
  /** Data em que foi efetivada; pode ser nula para lançamentos pendentes. */
  effectiveDate?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
  accountName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
}

export interface FinanceExpenseCategory {
  id: string;
  name: string;
  amountCents: number;
  /** Opcional; a interface calcula a participação se omitida. */
  sharePercent?: number | null;
}

export interface FinanceBudget {
  id: string;
  categoryName: string;
  limitCents: number;
  spentCents: number;
  periodLabel?: string | null;
}

export interface FinanceComparison {
  label: string;
  /** Percentuais só devem ser enviados quando há uma base comparável válida. */
  incomeChangePercent?: number | null;
  expenseChangePercent?: number | null;
  resultChangePercent?: number | null;
}

export interface FinanceDashboardData {
  currency: string;
  /** Exemplo: "Outubro de 2026". */
  periodLabel: string;
  /** Saldo atual das contas no escopo filtrado, sem restringir o saldo à data do relatório. */
  currentBalanceCents: number | null;
  /** Receitas efetivamente recebidas no período. */
  incomeSettledCents: number | null;
  /** Despesas efetivamente pagas no período. */
  expenseSettledCents: number | null;
  /** Resultado realizado, calculado na fonte de verdade do domínio. */
  resultSettledCents: number | null;
  flow: FinanceFlowPoint[];
  dueItems: FinanceDueItem[];
  transactions: FinanceTransaction[];
  expensesByCategory: FinanceExpenseCategory[];
  accounts: FinanceAccount[];
  categories?: FinanceCategory[];
  budgets?: FinanceBudget[] | null;
  comparison?: FinanceComparison | null;
  updatedAt?: string | null;
}

export interface FinanceWidgetState {
  loading?: boolean;
  error?: string | null;
}

export type FinanceWidgetStates = Partial<Record<FinanceWidgetKey, FinanceWidgetState>>;

/** Payload normalizado da UI; a camada de integração mapeia para a API real. */
export interface FinanceTransactionDraft {
  description: string;
  type: FinanceTransactionType;
  amountCents: number;
  date: string;
  accountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  state: 'settled' | 'pending';
  notes?: string;
}
