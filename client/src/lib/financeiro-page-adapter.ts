import type { InjectionKey } from 'vue';
import type {
  FinanceDashboardData,
  FinanceDueItem,
  FinancePeriod,
  FinanceTransaction,
  FinanceTransactionDraft,
} from './financeiro.types';

export interface FinanceiroDashboardFilters {
  period: FinancePeriod;
  accountId: string;
  customFrom: string;
  customTo: string;
}

/**
 * Ponte entre a página Financeiro e os serviços reais do NT-life.
 * Implemente estes métodos usando as queries/mutations já existentes no app.
 * Não crie endpoints novos sem antes verificar o backend atual.
 */
export interface FinanceiroPageAdapter {
  loadDashboard(filters: FinanceiroDashboardFilters): Promise<FinanceDashboardData>;
  createTransaction(draft: FinanceTransactionDraft): Promise<unknown>;
  onOpenTransaction?: (transaction: FinanceTransaction) => void | Promise<void>;
  onViewAllTransactions?: () => void | Promise<void>;
  onOpenDueItem?: (item: FinanceDueItem) => void | Promise<void>;
  onViewAllDueItems?: () => void | Promise<void>;
  onOpenCategory?: (categoryId: string) => void | Promise<void>;
}

export const financeiroPageAdapterKey: InjectionKey<FinanceiroPageAdapter> =
  Symbol('FinanceiroPageAdapter');
