<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { Info, RotateCcw } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import FinanceiroDashboard from '@/components/financeiro/FinanceiroDashboard.vue';
import type {
  FinanceDashboardData,
  FinanceDueItem,
  FinancePeriod,
  FinanceTransaction,
  FinanceTransactionDraft,
  FinanceTransactionStatus,
  FinanceWidgetKey,
  FinanceWidgetStates,
} from '@/lib/financeiro.types';
import {
  financeiroPageAdapterKey,
  type FinanceiroDashboardFilters,
} from '@/lib/financeiro-page-adapter';

/**
 * Sem adapter fornecido pelo app, a página abre em modo DEMONSTRAÇÃO para que
 * os widgets possam ser avaliados. Esses dados são fictícios, ficam só na memória
 * e nunca são apresentados como dados reais da conta.
 */
const adapter = inject(financeiroPageAdapterKey, null);
const isDemoMode = computed(() => !adapter);
const realData = ref<FinanceDashboardData | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const period = ref<FinancePeriod>('this-month');
const accountId = ref('all');
const customFrom = ref('');
const customTo = ref('');
const widgetStates = ref<FinanceWidgetStates>({});
let requestSequence = 0;

interface DemoTransaction extends FinanceTransaction {
  accountId: string;
  destinationAccountId?: string;
  createdLocally?: boolean;
  notes?: string;
}

const demoAccounts = [
  { id: 'account-main', name: 'Conta principal', balanceCents: 650000, currency: 'BRL', institution: 'Conta de demonstração', typeLabel: 'Conta corrente' },
  { id: 'account-digital', name: 'Conta digital', balanceCents: 195000, currency: 'BRL', institution: 'Carteira de demonstração', typeLabel: 'Conta digital' },
];

const demoCategories = [
  { id: 'cat-services', name: 'Serviços e projetos', type: 'income' as const },
  { id: 'cat-software', name: 'Software e assinaturas', type: 'expense' as const },
  { id: 'cat-operation', name: 'Operação', type: 'expense' as const },
  { id: 'cat-transport', name: 'Transporte', type: 'expense' as const },
  { id: 'cat-other', name: 'Outros', type: 'both' as const },
];

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function shiftDate(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}
function currentMonthLabel(): string {
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());
  return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1);
}
function periodLabel(filters: FinanceiroDashboardFilters): string {
  if (filters.period === 'this-month') return currentMonthLabel();
  if (filters.period === 'previous-month') {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - 1);
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
    return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1);
  }
  if (filters.period === 'last-30-days') return 'Últimos 30 dias';
  if (filters.period === 'last-90-days') return 'Últimos 90 dias';
  if (filters.customFrom && filters.customTo) return `${filters.customFrom} – ${filters.customTo}`;
  return 'Período personalizado';
}
function isDateInPeriod(value: string | null | undefined, filters: FinanceiroDashboardFilters): boolean {
  if (!value) return false;
  const key = value.slice(0, 10);
  const today = shiftDate(0);
  if (filters.period === 'this-month') return key.slice(0, 7) === today.slice(0, 7);
  if (filters.period === 'previous-month') {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - 1);
    return key.slice(0, 7) === dateKey(date).slice(0, 7);
  }
  if (filters.period === 'last-30-days') return key >= shiftDate(-29) && key <= today;
  if (filters.period === 'last-90-days') return key >= shiftDate(-89) && key <= today;
  if (filters.customFrom && filters.customTo && filters.customFrom <= filters.customTo) {
    return key >= filters.customFrom && key <= filters.customTo;
  }
  return key.slice(0, 7) === today.slice(0, 7);
}
function periodFactor(filters: FinanceiroDashboardFilters): number {
  if (filters.period === 'previous-month') return 0.89;
  if (filters.period === 'last-30-days') return 1.04;
  if (filters.period === 'last-90-days') return 3;
  if (filters.period === 'custom' && filters.customFrom && filters.customTo && filters.customFrom <= filters.customTo) {
    const days = Math.floor((new Date(`${filters.customTo}T12:00:00`).getTime() - new Date(`${filters.customFrom}T12:00:00`).getTime()) / 86_400_000) + 1;
    return Math.min(6, Math.max(0.1, days / 30));
  }
  return 1;
}
function createSeedTransactions(): DemoTransaction[] {
  const byName = (id: string) => demoAccounts.find((account) => account.id === id)?.name ?? 'Conta';
  return [
    { id: 'demo-tx-1', description: 'Projeto de site — sinal', type: 'income', amountCents: 230000, status: 'settled', effectiveDate: shiftDate(-1), createdAt: shiftDate(-1), accountId: 'account-main', accountName: byName('account-main'), categoryId: 'cat-services', categoryName: 'Serviços e projetos' },
    { id: 'demo-tx-2', description: 'Assinatura de ferramentas', type: 'expense', amountCents: 4900, status: 'settled', effectiveDate: shiftDate(-2), createdAt: shiftDate(-2), accountId: 'account-main', accountName: byName('account-main'), categoryId: 'cat-software', categoryName: 'Software e assinaturas' },
    { id: 'demo-tx-3', description: 'Projeto web — entrega', type: 'income', amountCents: 125000, status: 'settled', effectiveDate: shiftDate(-4), createdAt: shiftDate(-4), accountId: 'account-digital', accountName: byName('account-digital'), categoryId: 'cat-services', categoryName: 'Serviços e projetos' },
    { id: 'demo-tx-4', description: 'Hospedagem e domínio', type: 'expense', amountCents: 15900, status: 'settled', effectiveDate: shiftDate(-6), createdAt: shiftDate(-6), accountId: 'account-digital', accountName: byName('account-digital'), categoryId: 'cat-software', categoryName: 'Software e assinaturas' },
    { id: 'demo-tx-5', description: 'Equipamento de trabalho', type: 'expense', amountCents: 35000, status: 'settled', effectiveDate: shiftDate(-9), createdAt: shiftDate(-9), accountId: 'account-main', accountName: byName('account-main'), categoryId: 'cat-operation', categoryName: 'Operação' },
    { id: 'demo-tx-6', description: 'Consultoria de automação', type: 'income', amountCents: 85000, status: 'settled', effectiveDate: shiftDate(-13), createdAt: shiftDate(-13), accountId: 'account-digital', accountName: byName('account-digital'), categoryId: 'cat-services', categoryName: 'Serviços e projetos' },
    { id: 'demo-tx-7', description: 'Internet', type: 'expense', amountCents: 13980, status: 'pending', dueDate: shiftDate(2), createdAt: shiftDate(0), accountId: 'account-main', accountName: byName('account-main'), categoryId: 'cat-operation', categoryName: 'Operação' },
    { id: 'demo-tx-8', description: 'Serviço de nuvem', type: 'expense', amountCents: 5900, status: 'overdue', dueDate: shiftDate(-2), createdAt: shiftDate(-8), accountId: 'account-digital', accountName: byName('account-digital'), categoryId: 'cat-software', categoryName: 'Software e assinaturas' },
    { id: 'demo-tx-9', description: 'Projeto de manutenção', type: 'income', amountCents: 180000, status: 'settled', effectiveDate: shiftDate(-38), createdAt: shiftDate(-38), accountId: 'account-main', accountName: byName('account-main'), categoryId: 'cat-services', categoryName: 'Serviços e projetos' },
    { id: 'demo-tx-10', description: 'Licença anual', type: 'expense', amountCents: 12900, status: 'settled', effectiveDate: shiftDate(-43), createdAt: shiftDate(-43), accountId: 'account-digital', accountName: byName('account-digital'), categoryId: 'cat-software', categoryName: 'Software e assinaturas' },
  ];
}
const seedTransactions = createSeedTransactions();
const localDemoTransactions = ref<DemoTransaction[]>([]);

const filters = computed<FinanceiroDashboardFilters>(() => ({
  period: period.value,
  accountId: accountId.value,
  customFrom: customFrom.value,
  customTo: customTo.value,
}));
const customPeriodReady = computed(
  () => period.value !== 'custom' || (Boolean(customFrom.value) && Boolean(customTo.value) && customFrom.value <= customTo.value),
);

function accountMatches(transaction: DemoTransaction, selectedAccountId: string): boolean {
  return selectedAccountId === 'all'
    || transaction.accountId === selectedAccountId
    || transaction.destinationAccountId === selectedAccountId;
}
function txDate(transaction: FinanceTransaction): string | null {
  return transaction.effectiveDate ?? transaction.dueDate ?? transaction.createdAt ?? null;
}
function settledAdjustmentForAccount(account: typeof demoAccounts[number] | undefined): number {
  return localDemoTransactions.value.reduce((total, transaction) => {
    if (transaction.status !== 'settled') return total;
    const amount = transaction.amountCents;
    if (!account) {
      if (transaction.type === 'income') return total + amount;
      if (transaction.type === 'expense') return total - amount;
      return total;
    }
    if (transaction.type === 'transfer') {
      if (transaction.accountId === account.id) return total - amount;
      if (transaction.destinationAccountId === account.id) return total + amount;
      return total;
    }
    if (transaction.accountId !== account.id) return total;
    return total + (transaction.type === 'income' ? amount : -amount);
  }, 0);
}
function addedMetricAdjustments(filtersValue: FinanceiroDashboardFilters): { income: number; expense: number } {
  return localDemoTransactions.value.reduce((totals, transaction) => {
    if (transaction.status !== 'settled' || !isDateInPeriod(txDate(transaction), filtersValue) || !accountMatches(transaction, filtersValue.accountId)) return totals;
    if (transaction.type === 'income') totals.income += transaction.amountCents;
    if (transaction.type === 'expense') totals.expense += transaction.amountCents;
    return totals;
  }, { income: 0, expense: 0 });
}
function buildDemoData(filtersValue: FinanceiroDashboardFilters): FinanceDashboardData {
  const factor = periodFactor(filtersValue);
  const selectedAccount = demoAccounts.find((account) => account.id === filtersValue.accountId);
  const allIncome = Math.round(520000 * factor);
  const allExpense = Math.round(215000 * factor);
  const incomeShare = selectedAccount?.id === 'account-main' ? 410000 / 520000 : selectedAccount?.id === 'account-digital' ? 110000 / 520000 : 1;
  const expenseShare = selectedAccount?.id === 'account-main' ? 155000 / 215000 : selectedAccount?.id === 'account-digital' ? 60000 / 215000 : 1;
  const baseIncome = Math.round(allIncome * incomeShare);
  const baseExpense = Math.round(allExpense * expenseShare);
  const adjustment = addedMetricAdjustments(filtersValue);
  const income = baseIncome + adjustment.income;
  const expense = baseExpense + adjustment.expense;
  const activeBaseAccounts = demoAccounts.map((account) => ({ ...account, balanceCents: account.balanceCents + settledAdjustmentForAccount(account) }));
  const allBalance = activeBaseAccounts.reduce((total, account) => total + (account.balanceCents ?? 0), 0);
  const visibleAccount = activeBaseAccounts.find((account) => account.id === filtersValue.accountId);

  const categoriesBase = [
    { id: 'cat-operation', name: 'Operação', base: 54000 },
    { id: 'cat-software', name: 'Software e assinaturas', base: 42000 },
    { id: 'cat-home', name: 'Estrutura e serviços', base: 89000 },
    { id: 'cat-transport', name: 'Transporte', base: 30000 },
  ];
  const categoryMap = new Map(demoCategories.map((category) => [category.id, category.name]));
  const expensesByCategory = categoriesBase.map((category) => ({
    id: category.id,
    name: category.name,
    amountCents: Math.round(category.base * factor * expenseShare),
  }));
  for (const transaction of localDemoTransactions.value) {
    if (transaction.status !== 'settled' || transaction.type !== 'expense' || !isDateInPeriod(txDate(transaction), filtersValue) || !accountMatches(transaction, filtersValue.accountId)) continue;
    const targetId = transaction.categoryId ?? 'cat-other';
    const targetName = categoryMap.get(targetId) ?? transaction.categoryName ?? 'Outros';
    const existing = expensesByCategory.find((item) => item.id === targetId);
    if (existing) existing.amountCents += transaction.amountCents;
    else expensesByCategory.push({ id: targetId, name: targetName, amountCents: transaction.amountCents });
  }

  let flow: FinanceDashboardData['flow'];
  if (filtersValue.period === 'last-90-days') {
    flow = [
      { label: 'Há 2 meses', incomeCents: 560000, expenseCents: 225000 },
      { label: 'Mês anterior', incomeCents: 480000, expenseCents: 205000 },
      { label: 'Este mês', incomeCents: 520000, expenseCents: 215000 },
    ];
  } else {
    flow = [
      { label: 'Semana 1', incomeCents: 115000, expenseCents: 42000 },
      { label: 'Semana 2', incomeCents: 130000, expenseCents: 57000 },
      { label: 'Semana 3', incomeCents: 145000, expenseCents: 65000 },
      { label: 'Semana 4', incomeCents: 130000, expenseCents: 51000 },
    ];
  }
  const selectedAccountIncomeShare = selectedAccount?.id === 'account-main' ? 410000 / 520000 : selectedAccount?.id === 'account-digital' ? 110000 / 520000 : 1;
  const selectedAccountExpenseShare = selectedAccount?.id === 'account-main' ? 155000 / 215000 : selectedAccount?.id === 'account-digital' ? 60000 / 215000 : 1;
  flow = flow.map((point) => ({
    ...point,
    incomeCents: Math.round(point.incomeCents * (filtersValue.period === 'last-90-days' ? 1 : factor) * selectedAccountIncomeShare),
    expenseCents: Math.round(point.expenseCents * (filtersValue.period === 'last-90-days' ? 1 : factor) * selectedAccountExpenseShare),
  }));
  const additionsInPeriod = localDemoTransactions.value.filter((transaction) => transaction.status === 'settled' && isDateInPeriod(txDate(transaction), filtersValue) && accountMatches(transaction, filtersValue.accountId));
  if (additionsInPeriod.length && flow.length) {
    const lastPoint = flow[flow.length - 1];
    for (const transaction of additionsInPeriod) {
      if (transaction.type === 'income') lastPoint.incomeCents += transaction.amountCents;
      if (transaction.type === 'expense') lastPoint.expenseCents += transaction.amountCents;
    }
  }

  const baseDueItems: FinanceDueItem[] = [
    { id: 'demo-due-1', description: 'Conta de internet', type: 'pay', amountCents: 13980, dueDate: shiftDate(-2), status: 'overdue', accountName: 'Conta principal' },
    { id: 'demo-due-2', description: 'Assinatura de software', type: 'pay', amountCents: 5990, dueDate: shiftDate(1), status: 'upcoming', accountName: 'Conta digital' },
    { id: 'demo-due-3', description: 'Pagamento de cliente', type: 'receive', amountCents: 85000, dueDate: shiftDate(3), status: 'upcoming', accountName: 'Conta digital' },
    { id: 'demo-due-4', description: 'Serviço de hospedagem', type: 'pay', amountCents: 4200, dueDate: shiftDate(7), status: 'pending', accountName: 'Conta principal' },
  ];
  const localDueItems: FinanceDueItem[] = localDemoTransactions.value
    .filter((transaction) => transaction.createdLocally && transaction.status === 'pending' && transaction.type !== 'transfer' && transaction.dueDate)
    .map((transaction) => ({
      id: transaction.id,
      description: transaction.description,
      type: transaction.type === 'income' ? 'receive' : 'pay',
      amountCents: transaction.amountCents,
      dueDate: transaction.dueDate as string,
      status: 'pending',
      accountName: demoAccounts.find((account) => account.id === transaction.accountId)?.name ?? null,
    }));
  const dueItems = [...baseDueItems, ...localDueItems].filter((item) => filtersValue.accountId === 'all' || item.accountName === demoAccounts.find((account) => account.id === filtersValue.accountId)?.name);

  const seedForPeriod = seedTransactions.filter((transaction) => isDateInPeriod(txDate(transaction), filtersValue));
  const allTransactions = [...seedForPeriod, ...localDemoTransactions.value.filter((transaction) => isDateInPeriod(txDate(transaction), filtersValue))]
    .filter((transaction) => accountMatches(transaction, filtersValue.accountId))
    .sort((a, b) => (txDate(b) ?? '').localeCompare(txDate(a) ?? ''))
    .slice(0, 20)
    .map(({ accountId: _accountId, destinationAccountId: _destinationAccountId, createdLocally: _createdLocally, notes: _notes, ...transaction }) => transaction);

  const budgets = [
    { id: 'budget-operation', categoryName: 'Operação', limitCents: 120000, spentCents: Math.round(54000 * factor), periodLabel: periodLabel(filtersValue) },
    { id: 'budget-software', categoryName: 'Software e assinaturas', limitCents: 60000, spentCents: Math.round(42000 * factor), periodLabel: periodLabel(filtersValue) },
    { id: 'budget-transport', categoryName: 'Transporte', limitCents: 50000, spentCents: Math.round(30000 * factor), periodLabel: periodLabel(filtersValue) },
  ];
  const balanceCents = (visibleAccount?.balanceCents ?? allBalance);
  return {
    currency: 'BRL',
    periodLabel: periodLabel(filtersValue),
    currentBalanceCents: balanceCents,
    incomeSettledCents: income,
    expenseSettledCents: expense,
    resultSettledCents: income - expense,
    flow,
    dueItems,
    transactions: allTransactions,
    expensesByCategory,
    accounts: activeBaseAccounts.map(({ id, name, balanceCents: accountBalance, currency, institution, typeLabel }) => ({ id, name, balanceCents: accountBalance, currency, institution, typeLabel })),
    categories: demoCategories,
    budgets: filtersValue.accountId === 'account-digital' ? budgets.map((budget) => ({ ...budget, spentCents: Math.round(budget.spentCents * 0.28) })) : budgets,
    comparison: { label: 'período anterior', incomeChangePercent: 8.4, expenseChangePercent: -3.2, resultChangePercent: 15.1 },
    updatedAt: new Date().toISOString(),
  };
}

const data = computed<FinanceDashboardData | null>(() => adapter ? realData.value : buildDemoData(filters.value));

async function loadDashboard(): Promise<void> {
  if (!adapter) return;
  if (!customPeriodReady.value) {
    error.value = 'Selecione um intervalo válido para consultar o período personalizado.';
    return;
  }
  const currentRequest = ++requestSequence;
  loading.value = true;
  error.value = null;
  try {
    const result = await adapter.loadDashboard(filters.value);
    if (currentRequest !== requestSequence) return;
    realData.value = result;
    if (accountId.value !== 'all' && !result.accounts.some((account) => account.id === accountId.value)) accountId.value = 'all';
  } catch (cause) {
    if (currentRequest !== requestSequence) return;
    error.value = cause instanceof Error && cause.message ? cause.message : 'Não foi possível carregar os dados financeiros. Tente novamente.';
  } finally {
    if (currentRequest === requestSequence) loading.value = false;
  }
}
function refreshDashboard(): void {
  if (!adapter) {
    toast.info('Modo demonstração: os dados são fictícios e nenhuma consulta ao backend foi executada.');
    return;
  }
  void loadDashboard();
}
function retryWidget(_widget?: FinanceWidgetKey): void { refreshDashboard(); }
async function saveTransaction(draft: FinanceTransactionDraft): Promise<void> {
  if (adapter) {
    await adapter.createTransaction(draft);
    return;
  }
  const account = demoAccounts.find((item) => item.id === draft.accountId);
  const category = demoCategories.find((item) => item.id === draft.categoryId);
  const status: FinanceTransactionStatus = draft.state;
  localDemoTransactions.value.unshift({
    id: `demo-local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: draft.description,
    type: draft.type,
    amountCents: draft.amountCents,
    status,
    effectiveDate: status === 'settled' ? draft.date : null,
    dueDate: status === 'pending' ? draft.date : null,
    createdAt: shiftDate(0),
    accountId: draft.accountId,
    destinationAccountId: draft.destinationAccountId,
    accountName: account?.name ?? null,
    categoryId: draft.categoryId ?? null,
    categoryName: category?.name ?? null,
    createdLocally: true,
    notes: draft.notes,
  });
  toast.success('Transação adicionada à demonstração. Nada foi enviado ao backend.');
}
async function handleOpenTransaction(transaction: FinanceTransaction): Promise<void> {
  if (adapter?.onOpenTransaction) return adapter.onOpenTransaction(transaction);
  toast.info(`Transação: ${transaction.description}. Detalhes completos ainda não estão conectados.`);
}
async function handleViewAllTransactions(): Promise<void> {
  if (adapter?.onViewAllTransactions) return adapter.onViewAllTransactions();
  toast.info('A lista completa de transações ainda não possui uma rota configurada.');
}
async function handleOpenDueItem(item: FinanceDueItem): Promise<void> {
  if (adapter?.onOpenDueItem) return adapter.onOpenDueItem(item);
  toast.info(`Vencimento: ${item.description}. Detalhes completos ainda não estão conectados.`);
}
async function handleViewAllDueItems(): Promise<void> {
  if (adapter?.onViewAllDueItems) return adapter.onViewAllDueItems();
  toast.info('A página de contas a pagar e receber ainda não possui uma rota configurada.');
}
async function handleOpenCategory(categoryIdValue: string): Promise<void> {
  if (adapter?.onOpenCategory) return adapter.onOpenCategory(categoryIdValue);
  const category = data.value?.expensesByCategory.find((item) => item.id === categoryIdValue);
  toast.info(category ? `Categoria selecionada: ${category.name}. A página de transações filtradas ainda não está conectada.` : 'Filtro de categoria ainda não conectado.');
}
function resetDemo(): void {
  localDemoTransactions.value = [];
  period.value = 'this-month';
  accountId.value = 'all';
  customFrom.value = '';
  customTo.value = '';
  toast.success('Demonstração restaurada. Os dados reais não foram alterados.');
}

watch([period, accountId, customFrom, customTo], () => {
  if (!adapter) return;
  if (period.value === 'custom' && (!customFrom.value || !customTo.value || customFrom.value > customTo.value)) return;
  void loadDashboard();
});
onMounted(() => { if (adapter) void loadDashboard(); });
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="isDemoMode"
      role="status"
      class="flex flex-col gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-3.5 text-amber-950 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-start gap-3">
        <Info class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div class="space-y-1">
          <p class="font-semibold">Modo demonstração — dados fictícios</p>
          <p class="text-sm opacity-90">Os widgets estão liberados para visualização e teste. Novas transações ficam somente nesta sessão do navegador e não são enviadas ao banco do NT-life.</p>
        </div>
      </div>
      <Button type="button" variant="outline" class="shrink-0 rounded-xl border-amber-400/70 bg-transparent" @click="resetDemo">
        <RotateCcw class="mr-2 h-4 w-4" aria-hidden="true" /> Restaurar demonstração
      </Button>
    </div>

    <FinanceiroDashboard
      :data="data"
      :loading="loading"
      :error="error"
      v-model:period="period"
      v-model:account-id="accountId"
      v-model:custom-from="customFrom"
      v-model:custom-to="customTo"
      :widget-states="widgetStates"
      :save-transaction="saveTransaction"
      @refresh="refreshDashboard"
      @retry="retryWidget"
      @open-transaction="handleOpenTransaction"
      @view-all-transactions="handleViewAllTransactions"
      @open-due-item="handleOpenDueItem"
      @view-all-due-items="handleViewAllDueItems"
      @open-category="handleOpenCategory"
    />
  </div>
</template>
