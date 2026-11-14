import { api } from '@/api';
import type {
  FinanceAccount,
  FinanceCategory,
  FinanceDashboardData,
  FinanceDueItem,
  FinanceExpenseCategory,
  FinanceFlowPoint,
  FinancePeriod,
  FinanceTransaction,
  FinanceTransactionDraft,
} from './financeiro.types';
import type {
  FinanceiroDashboardFilters,
  FinanceiroPageAdapter,
} from './financeiro-page-adapter';

interface AccountResponse {
  accounts: Array<{
    id: number;
    name: string;
    institution: string | null;
    type: string;
    archivedAt: string | null;
    balanceCents: number;
  }>;
}

interface CategoryResponse {
  categories: Array<{
    id: number;
    name: string;
    type: FinanceCategory['type'];
    archivedAt: string | null;
  }>;
}

interface MetricsResponse {
  currency: string;
  periodLabel: string;
  currentBalanceCents: number;
  incomeSettledCents: number;
  expenseSettledCents: number;
  resultSettledCents: number;
  comparison: FinanceDashboardData['comparison'];
  updatedAt: string;
}

interface CashflowResponse {
  flow: FinanceFlowPoint[];
}

interface DueItemsResponse {
  dueItems: Array<{
    id: number;
    type: FinanceDueItem['type'];
    description: string;
    amountCents: number;
    dueDate: string;
    status: FinanceDueItem['status'];
    accountId: number;
    accountName: string;
  }>;
}

interface TransactionsResponse {
  transactions: Array<{
    id: number;
    type: FinanceTransaction['type'];
    description: string;
    amountCents: number;
    status: FinanceTransaction['status'] | 'upcoming';
    effectiveDate: string | null;
    dueDate: string | null;
    createdAt: string | null;
    accountId: number;
    destinationAccountId: number | null;
    accountName: string;
    categoryId: number | null;
    categoryName: string | null;
  }>;
}

interface ExpensesResponse {
  expensesByCategory: FinanceExpenseCategory[];
}

interface BudgetsResponse {
  budgets: Array<{
    id: number;
    categoryName: string;
    limitCents: number;
    spentCents: number;
    periodLabel: string;
  }>;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  wallet: 'Carteira',
  credit_card: 'Cartão de crédito',
  investment: 'Investimento',
  other: 'Outra',
};

function currentDateInSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function dateRange(filters: FinanceiroDashboardFilters): { from: string; to: string } {
  const today = currentDateInSaoPaulo();
  const currentMonthStart = `${today.slice(0, 7)}-01`;

  switch (filters.period) {
    case 'this-month':
      return { from: currentMonthStart, to: today };
    case 'previous-month': {
      const monthStart = new Date(`${currentMonthStart}T12:00:00Z`);
      monthStart.setUTCMonth(monthStart.getUTCMonth() - 1);
      const from = monthStart.toISOString().slice(0, 10);
      return { from, to: addDays(currentMonthStart, -1) };
    }
    case 'last-30-days':
      return { from: addDays(today, -29), to: today };
    case 'last-90-days':
      return { from: addDays(today, -89), to: today };
    case 'custom':
      return { from: filters.customFrom, to: filters.customTo };
  }
}

function periodQuery(filters: FinanceiroDashboardFilters): string {
  const params = new URLSearchParams({
    period: filters.period,
    accountId: filters.accountId,
  });
  if (filters.period === 'custom') {
    params.set('from', filters.customFrom);
    params.set('to', filters.customTo);
  }
  return `?${params.toString()}`;
}

function accountQuery(accountId: string): string {
  return accountId === 'all' ? '' : `&accountId=${encodeURIComponent(accountId)}`;
}

function transactionQuery(filters: FinanceiroDashboardFilters, range: { from: string; to: string }): string {
  const params = new URLSearchParams({
    limit: '100',
    from: range.from,
    to: range.to,
  });
  if (filters.accountId !== 'all') params.set('accountId', filters.accountId);
  return `?${params.toString()}`;
}

function budgetMonth(period: FinancePeriod, from: string): string {
  if (period === 'previous-month' || period === 'custom') return from.slice(0, 7);
  return currentDateInSaoPaulo().slice(0, 7);
}

function isInRange(value: string | null, range: { from: string; to: string }): boolean {
  if (!value) return false;
  const day = value.slice(0, 10);
  return day >= range.from && day <= range.to;
}

export function createFinanceiroApiAdapter(): FinanceiroPageAdapter {
  return {
    async loadDashboard(filters): Promise<FinanceDashboardData> {
      const scope = periodQuery(filters);
      const range = dateRange(filters);
      const selectedAccount = filters.accountId === 'all' ? '' : filters.accountId;
      const [metrics, cashflow, dueItems, expenses, transactions, accounts, categories, budgets] =
        await Promise.all([
          api<MetricsResponse>(`/finance/metrics${scope}`),
          api<CashflowResponse>(`/finance/cashflow${scope}`),
          api<DueItemsResponse>(`/finance/due-items?filter=urgent${accountQuery(selectedAccount)}`),
          api<ExpensesResponse>(`/finance/categories/expenses${scope}`),
          api<TransactionsResponse>(`/finance/transactions${transactionQuery(filters, range)}`),
          api<AccountResponse>('/finance/accounts'),
          api<CategoryResponse>('/finance/categories'),
          api<BudgetsResponse>(`/finance/budgets?month=${budgetMonth(filters.period, range.from)}`),
        ]);

      const visibleAccounts: FinanceAccount[] = accounts.accounts
        .filter((account) => !account.archivedAt)
        .map((account) => ({
          id: String(account.id),
          name: account.name,
          balanceCents: account.balanceCents,
          currency: 'BRL',
          institution: account.institution,
          typeLabel: ACCOUNT_TYPE_LABELS[account.type] ?? account.type,
        }));

      const visibleAccountIds = new Set(
        selectedAccount ? [Number(selectedAccount)] : visibleAccounts.map((account) => Number(account.id)),
      );
      const dueItemDtos: FinanceDueItem[] = dueItems.dueItems
        .filter((item) => visibleAccountIds.has(item.accountId))
        .map((item) => ({
          ...item,
          id: String(item.id),
          accountId: String(item.accountId),
        }));

      const transactionDtos: FinanceTransaction[] = transactions.transactions
        .filter((transaction) => {
          const transactionDate = transaction.effectiveDate ?? transaction.dueDate ?? transaction.createdAt;
          const matchesDate = isInRange(transactionDate, range);
          const matchesAccount = !selectedAccount
            || String(transaction.accountId) === selectedAccount
            || String(transaction.destinationAccountId) === selectedAccount;
          return matchesDate && matchesAccount;
        })
        .slice(0, 20)
        .map((transaction) => ({
          id: String(transaction.id),
          description: transaction.description,
          type: transaction.type,
          amountCents: transaction.amountCents,
          status: transaction.status === 'upcoming' ? 'pending' : transaction.status,
          effectiveDate: transaction.effectiveDate,
          dueDate: transaction.dueDate,
          createdAt: transaction.createdAt,
          accountName: transaction.accountName,
          categoryId: transaction.categoryId === null ? null : String(transaction.categoryId),
          categoryName: transaction.categoryName,
        }));

      return {
        currency: metrics.currency,
        periodLabel: metrics.periodLabel,
        currentBalanceCents: metrics.currentBalanceCents,
        incomeSettledCents: metrics.incomeSettledCents,
        expenseSettledCents: metrics.expenseSettledCents,
        resultSettledCents: metrics.resultSettledCents,
        comparison: metrics.comparison,
        updatedAt: metrics.updatedAt,
        flow: cashflow.flow,
        dueItems: dueItemDtos,
        transactions: transactionDtos,
        expensesByCategory: expenses.expensesByCategory,
        accounts: visibleAccounts,
        categories: categories.categories
          .filter((category) => !category.archivedAt)
          .map((category) => ({
            id: String(category.id),
            name: category.name,
            type: category.type,
          })),
        budgets: budgets.budgets.map((budget) => ({
          ...budget,
          id: String(budget.id),
        })),
      };
    },

    createTransaction(draft: FinanceTransactionDraft) {
      return api('/finance/transactions', {
        method: 'POST',
        body: {
          description: draft.description,
          type: draft.type,
          amountCents: draft.amountCents,
          date: draft.date,
          accountId: Number(draft.accountId),
          ...(draft.destinationAccountId
            ? { destinationAccountId: Number(draft.destinationAccountId) }
            : {}),
          ...(draft.categoryId ? { categoryId: Number(draft.categoryId) } : {}),
          state: draft.state,
          ...(draft.notes ? { notes: draft.notes } : {}),
        },
      });
    },
  };
}
