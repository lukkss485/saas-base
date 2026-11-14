<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import FinanceiroDashboard from '@/components/financeiro/FinanceiroDashboard.vue';
import type {
  FinanceDashboardData,
  FinanceDueItem,
  FinancePeriod,
  FinanceTransaction,
  FinanceTransactionDraft,
  FinanceWidgetKey,
} from '@/lib/financeiro.types';
import {
  financeiroPageAdapterKey,
  type FinanceiroDashboardFilters,
} from '@/lib/financeiro-page-adapter';

const adapter = inject(financeiroPageAdapterKey, null);
const realData = ref<FinanceDashboardData | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const period = ref<FinancePeriod>('this-month');
const accountId = ref('all');
const customFrom = ref('');
const customTo = ref('');

const filters = computed<FinanceiroDashboardFilters>(() => ({
  period: period.value,
  accountId: accountId.value,
  customFrom: customFrom.value,
  customTo: customTo.value,
}));
const customPeriodReady = computed(
  () => period.value !== 'custom' || (
    Boolean(customFrom.value)
    && Boolean(customTo.value)
    && customFrom.value <= customTo.value
  ),
);
const data = computed(() => realData.value);
let requestSequence = 0;

async function loadDashboard(): Promise<void> {
  if (!customPeriodReady.value) {
    error.value = 'Selecione um intervalo válido para consultar o período personalizado.';
    return;
  }
  if (!adapter) {
    error.value = 'A integração com a API financeira não está disponível.';
    loading.value = false;
    return;
  }

  const currentRequest = ++requestSequence;
  loading.value = true;
  error.value = null;
  try {
    const result = await adapter.loadDashboard(filters.value);
    if (currentRequest !== requestSequence) return;
    realData.value = result;
    if (accountId.value !== 'all' && !result.accounts.some((account) => account.id === accountId.value)) {
      accountId.value = 'all';
    }
  } catch (cause) {
    if (currentRequest !== requestSequence) return;
    error.value = cause instanceof Error && cause.message
      ? cause.message
      : 'Não foi possível carregar os dados financeiros. Tente novamente.';
  } finally {
    if (currentRequest === requestSequence) loading.value = false;
  }
}

function refreshDashboard(): void {
  void loadDashboard();
}

function retryWidget(_widget?: FinanceWidgetKey): void {
  refreshDashboard();
}

async function saveTransaction(draft: FinanceTransactionDraft): Promise<void> {
  if (!adapter) throw new Error('A integração com a API financeira não está disponível.');
  await adapter.createTransaction(draft);
}

async function handleOpenTransaction(transaction: FinanceTransaction): Promise<void> {
  if (adapter?.onOpenTransaction) return adapter.onOpenTransaction(transaction);
  toast.info(`Transação: ${transaction.description}.`);
}

async function handleViewAllTransactions(): Promise<void> {
  if (adapter?.onViewAllTransactions) return adapter.onViewAllTransactions();
  toast.info('A lista completa de transações ainda não possui uma página.');
}

async function handleOpenDueItem(item: FinanceDueItem): Promise<void> {
  if (adapter?.onOpenDueItem) return adapter.onOpenDueItem(item);
  toast.info(`Vencimento: ${item.description}.`);
}

async function handleViewAllDueItems(): Promise<void> {
  if (adapter?.onViewAllDueItems) return adapter.onViewAllDueItems();
  toast.info('A página de contas a pagar e receber ainda não está disponível.');
}

async function handleOpenCategory(categoryIdValue: string): Promise<void> {
  if (adapter?.onOpenCategory) return adapter.onOpenCategory(categoryIdValue);
  const category = realData.value?.expensesByCategory.find((item) => item.id === categoryIdValue);
  if (category) toast.info(`Categoria selecionada: ${category.name}.`);
}

watch([period, accountId, customFrom, customTo], () => {
  if (period.value === 'custom' && !customPeriodReady.value) return;
  void loadDashboard();
});

onMounted(() => {
  void loadDashboard();
});
</script>

<template>
  <div class="space-y-4">
    <FinanceiroDashboard
      :data="data"
      :loading="loading"
      :error="error"
      v-model:period="period"
      v-model:account-id="accountId"
      v-model:custom-from="customFrom"
      v-model:custom-to="customTo"
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
