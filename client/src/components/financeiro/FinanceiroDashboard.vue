<script setup lang="ts">
// Dashboard NT-life com primitivas shadcn-vue; mantém o contrato de dados atual.
import { computed, nextTick, ref, watch } from 'vue';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Landmark,
  ListFilter,
  Plus,
  RefreshCw,
  ReceiptText,
  RotateCcw,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from '@lucide/vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type {
  FinanceDashboardData,
  FinanceDueItem,
  FinancePeriod,
  FinanceTransaction,
  FinanceTransactionDraft,
  FinanceTransactionType,
  FinanceWidgetKey,
  FinanceWidgetStates,
} from '@/lib/financeiro.types';

interface Props {
  data: FinanceDashboardData | null;
  loading?: boolean;
  error?: string | null;
  period?: FinancePeriod;
  accountId?: string;
  customFrom?: string;
  customTo?: string;
  widgetStates?: FinanceWidgetStates;
  /** Callback da página pai; deve resolver só após a mutation real concluir. */
  saveTransaction?: (draft: FinanceTransactionDraft) => Promise<unknown>;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  period: 'this-month',
  accountId: 'all',
  customFrom: '',
  customTo: '',
  widgetStates: () => ({}),
});

const emit = defineEmits<{
  (event: 'update:period', value: FinancePeriod): void;
  (event: 'update:account-id', value: string): void;
  (event: 'update:custom-from', value: string): void;
  (event: 'update:custom-to', value: string): void;
  (event: 'refresh'): void;
  (event: 'retry', widget?: FinanceWidgetKey): void;
  (event: 'open-transaction', transaction: FinanceTransaction): void;
  (event: 'view-all-transactions'): void;
  (event: 'open-due-item', item: FinanceDueItem): void;
  (event: 'open-category', categoryId: string): void;
  (event: 'view-all-due-items'): void;
}>();

const transactionTypeOptions: { value: FinanceTransactionType; label: string }[] = [
  { value: 'income', label: 'Receita' },
  { value: 'expense', label: 'Despesa' },
  { value: 'transfer', label: 'Transferir' },
];

const periodOptions: { value: FinancePeriod; label: string }[] = [
  { value: 'this-month', label: 'Este mês' },
  { value: 'previous-month', label: 'Mês anterior' },
  { value: 'last-30-days', label: 'Últimos 30 dias' },
  { value: 'last-90-days', label: 'Últimos 90 dias' },
  { value: 'custom', label: 'Período personalizado' },
];

const showTransactionDialog = ref(false);
let previouslyFocusedElement: HTMLElement | null = null;
const transactionType = ref<FinanceTransactionType>('expense');
const description = ref('');
const amountInput = ref('');
const transactionDate = ref(todayLocal());
const sourceAccountId = ref('');
const destinationAccountId = ref('');
const categoryId = ref('');
const transactionState = ref<'settled' | 'pending'>('settled');
const notes = ref('');
const formError = ref('');
const isSavingTransaction = ref(false);
const showNotes = ref(false);
const dueFilter = ref<'all' | 'urgent'>('all');
const categoryQuery = ref('');

watch(
  () => props.data?.accounts,
  (accounts) => {
    if (!accounts?.length) return;
    if (!sourceAccountId.value || !accounts.some((account) => account.id === sourceAccountId.value)) {
      sourceAccountId.value = accounts[0]?.id ?? '';
    }
    if (!destinationAccountId.value || !accounts.some((account) => account.id === destinationAccountId.value)) {
      destinationAccountId.value = accounts.find((account) => account.id !== sourceAccountId.value)?.id ?? '';
    }
  },
  { immediate: true },
);

watch(transactionType, (type) => {
  formError.value = '';
  if (type === 'transfer') {
    categoryId.value = '';
    transactionState.value = transactionState.value === 'settled' ? 'settled' : 'pending';
  }
});

const currentCurrency = computed(() => props.data?.currency || 'BRL');
const formatter = computed(
  () => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currentCurrency.value }),
);
const compactFormatter = computed(
  () => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currentCurrency.value,
    notation: 'compact',
    maximumFractionDigits: 1,
  }),
);
const visibleDueItems = computed(() => {
  const items = [...(props.data?.dueItems ?? [])].sort((a, b) => {
    const rank = (status: string) => status === 'overdue' ? 0 : status === 'upcoming' ? 1 : 2;
    const priority = rank(a.status) - rank(b.status);
    if (priority !== 0) return priority;
    return toTimestamp(a.dueDate) - toTimestamp(b.dueDate);
  });
  return (dueFilter.value === 'urgent' ? items.filter((item) => item.status === 'overdue' || item.status === 'upcoming') : items).slice(0, 5);
});
const categoriesTotal = computed(() => (props.data?.expensesByCategory ?? []).reduce((sum, item) => sum + Math.max(0, item.amountCents), 0));
const visibleCategories = computed(() => {
  const query = categoryQuery.value.trim().toLocaleLowerCase('pt-BR');
  return [...(props.data?.expensesByCategory ?? [])]
    .filter((item) => !query || item.name.toLocaleLowerCase('pt-BR').includes(query))
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 6);
});
const chartLayout = computed(() => {
  const points = props.data?.flow ?? [];
  const width = 720;
  const height = 230;
  const left = 50;
  const right = 20;
  const top = 16;
  const baseline = 174;
  const plotHeight = baseline - top;
  const plotWidth = width - left - right;
  const maximum = Math.max(1, ...points.flatMap((point) => [point.incomeCents, point.expenseCents]));
  const slotWidth = points.length ? plotWidth / points.length : plotWidth;
  const barWidth = Math.min(18, Math.max(5, slotWidth * 0.24));
  const bars = points.map((point, index) => {
    const groupX = left + index * slotWidth + slotWidth / 2;
    const incomeHeight = (Math.max(0, point.incomeCents) / maximum) * (plotHeight - 8);
    const expenseHeight = (Math.max(0, point.expenseCents) / maximum) * (plotHeight - 8);
    return {
      ...point,
      xIncome: groupX - barWidth - 1,
      yIncome: baseline - incomeHeight,
      width: barWidth,
      heightIncome: incomeHeight,
      xExpense: groupX + 1,
      yExpense: baseline - expenseHeight,
      heightExpense: expenseHeight,
      labelX: groupX,
    };
  });
  const gridLines = [0, 1, 2, 3].map((step) => {
    const ratio = step / 3;
    return {
      y: top + plotHeight * ratio,
      cents: Math.round(maximum * (1 - ratio)),
    };
  });
  return { width, height, left, right, top, baseline, plotWidth, plotHeight, bars, gridLines };
});
const filteredFormCategories = computed(() => {
  const categories = props.data?.categories ?? [];
  return categories.filter((category) => category.type === 'both' || category.type === transactionType.value);
});
const canCreateTransfer = computed(() => {
  return transactionType.value !== 'transfer' || (!!sourceAccountId.value && !!destinationAccountId.value && sourceAccountId.value !== destinationAccountId.value);
});
const parsedAmountCents = computed(() => {
  const raw = amountInput.value.trim().replace(',', '.');
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
});

function money(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return '—';
  return formatter.value.format(cents / 100);
}
function compactMoney(cents: number): string {
  return compactFormatter.value.format(cents / 100);
}
function signedMoney(transaction: FinanceTransaction): string {
  const sign = transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '−' : '';
  return `${sign}${money(Math.abs(transaction.amountCents))}`;
}
function todayLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}
function toTimestamp(value: string | null | undefined): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const timestamp = new Date(value.length === 10 ? `${value}T12:00:00` : value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}
function dateLabel(value: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return 'Data não informada';
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return 'Data inválida';
  return new Intl.DateTimeFormat('pt-BR', options ?? { day: '2-digit', month: 'short' }).format(date);
}
function periodText(): string {
  if (props.period === 'custom' && props.customFrom && props.customTo) {
    return `${dateLabel(props.customFrom)} – ${dateLabel(props.customTo)}`;
  }
  return props.data?.periodLabel || periodOptions.find((item) => item.value === props.period)?.label || 'Período selecionado';
}
function percentLabel(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(rounded)}%`;
}
function statusLabel(status: FinanceTransaction['status']): string {
  if (status === 'settled') return 'Efetivada';
  if (status === 'overdue') return 'Atrasada';
  return 'Pendente';
}
function statusClass(status: FinanceTransaction['status'] | FinanceDueItem['status']): string {
  if (status === 'overdue') return 'finance-status finance-status--danger';
  if (status === 'upcoming') return 'finance-status finance-status--warning';
  if (status === 'settled') return 'finance-status finance-status--success';
  return 'finance-status finance-status--neutral';
}
function dueStatusLabel(status: FinanceDueItem['status']): string {
  if (status === 'overdue') return 'Atrasado';
  if (status === 'upcoming') return 'Em breve';
  return 'Pendente';
}
function typeLabel(type: FinanceTransactionType): string {
  if (type === 'income') return 'Receita';
  if (type === 'expense') return 'Despesa';
  return 'Transferência';
}
function typeIcon(type: FinanceTransactionType) {
  if (type === 'income') return ArrowDownRight;
  if (type === 'expense') return ArrowUpRight;
  return ArrowLeftRight;
}
function categoryPercent(amountCents: number, provided?: number | null): number {
  if (provided !== null && provided !== undefined && Number.isFinite(provided)) return Math.max(0, Math.min(100, provided));
  return categoriesTotal.value > 0 ? Math.max(0, Math.min(100, (amountCents / categoriesTotal.value) * 100)) : 0;
}
function updatePeriod(value: unknown): void {
  const selected = String(value ?? '');
  const option = periodOptions.find((item) => item.value === selected);
  if (option) emit('update:period', option.value);
}
function updateAccount(value: unknown): void {
  emit('update:account-id', String(value ?? 'all'));
}
function setCustomFromValue(value: unknown): void {
  emit('update:custom-from', String(value ?? ''));
}
function setCustomToValue(value: unknown): void {
  emit('update:custom-to', String(value ?? ''));
}
function updateSourceAccount(value: unknown): void {
  const selected = String(value ?? '');
  sourceAccountId.value = selected === '__none__' ? '' : selected;
  if (destinationAccountId.value === sourceAccountId.value) {
    destinationAccountId.value = props.data?.accounts.find((account) => account.id !== sourceAccountId.value)?.id ?? '';
  }
}
function updateDestinationAccount(value: unknown): void {
  const selected = String(value ?? '');
  destinationAccountId.value = selected === '__none__' ? '' : selected;
}
function updateCategory(value: unknown): void {
  const selected = String(value ?? '');
  categoryId.value = selected === '__none__' ? '' : selected;
}
function updateTransactionState(value: unknown): void {
  // O RadioGroup do shadcn-vue tipa o payload como AcceptableValue;
  // valida o valor em runtime antes de gravá-lo no estado tipado.
  if (value === 'settled' || value === 'pending') transactionState.value = value;
}
function setDialogOpen(open: boolean): void {
  if (open) showTransactionDialog.value = true;
  else closeCreate();
}
function openCreate(type: FinanceTransactionType = 'expense') {
  previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  transactionType.value = type;
  description.value = '';
  amountInput.value = '';
  transactionDate.value = todayLocal();
  categoryId.value = '';
  notes.value = '';
  transactionState.value = 'settled';
  formError.value = '';
  showNotes.value = false;
  showTransactionDialog.value = true;
}
function closeCreate() {
  if (isSavingTransaction.value) return;
  showTransactionDialog.value = false;
  formError.value = '';
  void nextTick(() => previouslyFocusedElement?.focus());
}
watch(showTransactionDialog, async (open) => {
  if (!open) return;
  await nextTick();
  document.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
});
async function submitTransaction() {
  formError.value = '';
  if (!description.value.trim()) {
    formError.value = 'Informe uma descrição para a transação.';
    return;
  }
  if (!parsedAmountCents.value) {
    formError.value = 'Informe um valor maior que zero.';
    return;
  }
  if (!transactionDate.value) {
    formError.value = 'Selecione a data da transação.';
    return;
  }
  if (!sourceAccountId.value) {
    formError.value = 'Selecione a conta da movimentação.';
    return;
  }
  if (!canCreateTransfer.value) {
    formError.value = 'Escolha contas de origem e destino diferentes.';
    return;
  }
  const saveTransaction = props.saveTransaction;
  if (!saveTransaction) {
    formError.value = 'A criação ainda não está conectada à mutation financeira do NT-life. Conecte a prop save-transaction antes de usar este formulário.';
    return;
  }

  const draft: FinanceTransactionDraft = {
    description: description.value.trim(),
    type: transactionType.value,
    amountCents: parsedAmountCents.value,
    date: transactionDate.value,
    accountId: sourceAccountId.value,
    ...(transactionType.value === 'transfer' ? { destinationAccountId: destinationAccountId.value } : {}),
    ...(transactionType.value !== 'transfer' && categoryId.value ? { categoryId: categoryId.value } : {}),
    state: transactionState.value,
    ...(notes.value.trim() ? { notes: notes.value.trim() } : {}),
  };
  isSavingTransaction.value = true;
  try {
    await saveTransaction(draft);
    showTransactionDialog.value = false;
    formError.value = '';
    emit('refresh');
    void nextTick(() => previouslyFocusedElement?.focus());
  } catch (cause) {
    formError.value = cause instanceof Error && cause.message
      ? cause.message
      : 'Não foi possível salvar a transação. Confira sua conexão e tente novamente.';
  } finally {
    isSavingTransaction.value = false;
  }
}
function widgetLoading(key: FinanceWidgetKey): boolean {
  return props.widgetStates?.[key]?.loading ?? props.loading;
}
function widgetError(key: FinanceWidgetKey): string | null {
  return props.widgetStates?.[key]?.error ?? null;
}
function retryWidget(key: FinanceWidgetKey) {
  emit('retry', key);
}
function transactionDateLabel(transaction: FinanceTransaction): string {
  return dateLabel(transaction.effectiveDate ?? transaction.dueDate ?? transaction.createdAt);
}
</script>

<template>
  <main class="finance-page space-y-5 sm:space-y-6" aria-labelledby="finance-title">
    <!-- Cabeçalho e filtros globais -->
    <header class="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
      <div class="min-w-0 space-y-1">
        <div class="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Wallet class="h-4 w-4" aria-hidden="true" />
          <span>Gestão financeira</span>
        </div>
        <h1 id="finance-title" class="text-2xl font-semibold tracking-tight sm:text-3xl">Financeiro</h1>
        <p class="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Entenda seu saldo, acompanhe o fluxo de caixa e veja o que precisa de atenção.
        </p>
      </div>

      <div class="flex w-full flex-wrap items-center gap-2 2xl:w-auto 2xl:flex-nowrap">
        <Select :model-value="period" @update:model-value="updatePeriod">
          <SelectTrigger class="w-[190px] shrink-0 rounded-xl" aria-label="Filtrar por período">
            <CalendarDays class="mr-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in periodOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select v-if="data?.accounts.length" :model-value="accountId" @update:model-value="updateAccount">
          <SelectTrigger class="w-[190px] shrink-0 rounded-xl" aria-label="Filtrar por conta">
            <Landmark class="mr-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <SelectValue placeholder="Todas as contas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            <SelectItem v-for="account in data.accounts" :key="account.id" :value="account.id">
              {{ account.name }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Button type="button" variant="outline" class="shrink-0 whitespace-nowrap rounded-xl" :disabled="loading"
          aria-label="Atualizar dashboard" @click="emit('refresh')">
          <RefreshCw class="mr-2 h-4 w-4" :class="loading ? 'animate-spin' : ''" aria-hidden="true" />
          <span class="hidden sm:inline">Atualizar</span>
        </Button>
        <Button type="button" class="shrink-0 whitespace-nowrap rounded-xl" :disabled="!data?.accounts.length"
          @click="openCreate('expense')">
          <Plus class="mr-2 h-4 w-4" aria-hidden="true" /> Nova transação
        </Button>
      </div>
    </header>

    <Card v-if="period === 'custom'" class="rounded-2xl border-border/70 shadow-sm">
      <CardContent class="flex flex-wrap items-end gap-3 p-4 sm:p-5">
        <div class="grid gap-2">
          <Label for="finance-custom-from">De</Label>
          <Input id="finance-custom-from" type="date" class="w-[170px] rounded-xl" :model-value="customFrom"
            @update:model-value="setCustomFromValue" />
        </div>
        <div class="grid gap-2">
          <Label for="finance-custom-to">Até</Label>
          <Input id="finance-custom-to" type="date" class="w-[170px] rounded-xl" :model-value="customTo"
            :min="customFrom || undefined" @update:model-value="setCustomToValue" />
        </div>
        <p class="max-w-xl pb-2 text-xs text-muted-foreground">Os widgets históricos usam este intervalo; o saldo
          continua representando o saldo atual.</p>
      </CardContent>
    </Card>

    <Card v-if="error" class="rounded-2xl border-destructive/30 bg-destructive/[0.035] shadow-sm" role="alert">
      <CardContent class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-3">
          <AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div class="space-y-1">
            <p class="font-medium">Não foi possível atualizar todos os dados</p>
            <p class="text-sm text-muted-foreground">{{ error }}</p>
            <p v-if="data" class="text-xs text-muted-foreground">Os últimos dados disponíveis continuam visíveis, se
              houver.</p>
          </div>
        </div>
        <Button type="button" variant="outline" class="shrink-0 rounded-xl" @click="emit('retry')">
          <RotateCcw class="mr-2 h-4 w-4" aria-hidden="true" /> Tentar novamente
        </Button>
      </CardContent>
    </Card>

    <template v-if="data">
      <!-- P0: indicadores financeiros. Os valores consolidados vêm do backend. -->
      <section aria-label="Indicadores financeiros" class="space-y-3">
        <div v-if="widgetError('metrics')" class="finance-inline-error" role="alert">
          <AlertCircle class="h-4 w-4" aria-hidden="true" />
          <span>{{ widgetError('metrics') }}</span>
          <Button type="button" variant="link" class="h-auto p-0" @click="retryWidget('metrics')">Tentar
            novamente</Button>
        </div>
        <div v-if="widgetLoading('metrics')" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Carregando indicadores" aria-busy="true">
          <Skeleton v-for="index in 4" :key="index" class="h-36 rounded-2xl" />
        </div>
        <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card class="rounded-2xl border-primary/20 shadow-sm">
            <CardHeader class="flex flex-row items-start justify-between space-y-0 pb-2">
              <div class="space-y-1">
                <CardDescription>Saldo atual</CardDescription>
                <CardTitle class="break-words text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{{
                  money(data.currentBalanceCents) }}</CardTitle>
              </div>
              <div class="rounded-xl bg-primary/10 p-2.5 text-primary">
                <Wallet class="h-5 w-5" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent class="pt-0">
              <p class="text-xs text-muted-foreground">Saldo das contas incluídas · valor de agora</p>
            </CardContent>
          </Card>

          <Card class="rounded-2xl border-border/70 shadow-sm">
            <CardHeader class="flex flex-row items-start justify-between space-y-0 pb-2">
              <div class="space-y-1">
                <CardDescription>Receitas recebidas</CardDescription>
                <CardTitle
                  class="break-words text-2xl font-semibold tracking-tight tabular-nums text-emerald-700 dark:text-emerald-400">
                  {{ money(data.incomeSettledCents) }}</CardTitle>
              </div>
              <div class="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-700 dark:text-emerald-400">
                <TrendingUp class="h-5 w-5" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent class="space-y-2 pt-0">
              <p class="text-xs text-muted-foreground">{{ periodText() }} · entradas efetivadas</p>
              <Badge v-if="percentLabel(data.comparison?.incomeChangePercent)" variant="secondary" class="font-normal">
                {{ percentLabel(data.comparison?.incomeChangePercent) }} em relação a {{ data.comparison?.label }}
              </Badge>
            </CardContent>
          </Card>

          <Card class="rounded-2xl border-border/70 shadow-sm">
            <CardHeader class="flex flex-row items-start justify-between space-y-0 pb-2">
              <div class="space-y-1">
                <CardDescription>Despesas pagas</CardDescription>
                <CardTitle class="break-words text-2xl font-semibold tracking-tight tabular-nums">{{
                  money(data.expenseSettledCents) }}</CardTitle>
              </div>
              <div class="rounded-xl bg-destructive/10 p-2.5 text-destructive">
                <TrendingDown class="h-5 w-5" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent class="space-y-2 pt-0">
              <p class="text-xs text-muted-foreground">{{ periodText() }} · saídas efetivadas</p>
              <Badge v-if="percentLabel(data.comparison?.expenseChangePercent)" variant="secondary" class="font-normal">
                {{ percentLabel(data.comparison?.expenseChangePercent) }} em relação a {{ data.comparison?.label }}
              </Badge>
            </CardContent>
          </Card>

          <Card class="rounded-2xl border-border/70 shadow-sm">
            <CardHeader class="flex flex-row items-start justify-between space-y-0 pb-2">
              <div class="space-y-1">
                <CardDescription>Resultado realizado</CardDescription>
                <CardTitle class="break-words text-2xl font-semibold tracking-tight tabular-nums">{{
                  money(data.resultSettledCents) }}</CardTitle>
              </div>
              <div class="rounded-xl bg-primary/10 p-2.5 text-primary">
                <ArrowLeftRight class="h-5 w-5" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent class="space-y-2 pt-0">
              <p class="text-xs text-muted-foreground">Recebido menos pago · {{ periodText() }}</p>
              <Badge v-if="percentLabel(data.comparison?.resultChangePercent)" variant="secondary" class="font-normal">
                {{ percentLabel(data.comparison?.resultChangePercent) }} em relação a {{ data.comparison?.label }}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </section>

      <!-- P0: fluxo de caixa e vencimentos -->
      <section class="grid min-w-0 gap-4 xl:grid-cols-3">
        <Card class="min-w-0 rounded-2xl border-border/70 shadow-sm xl:col-span-2">
          <CardHeader class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="space-y-1">
              <CardTitle class="text-base">Fluxo de caixa</CardTitle>
              <CardDescription>Entradas e saídas efetivadas · {{ periodText() }}</CardDescription>
            </div>
            <div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span class="inline-flex items-center gap-1.5"><span
                  class="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Receitas</span>
              <span class="inline-flex items-center gap-1.5"><span
                  class="h-2.5 w-2.5 rounded-sm bg-destructive" />Despesas</span>
            </div>
          </CardHeader>
          <CardContent>
            <div v-if="widgetError('cashflow')" class="finance-inline-error" role="alert">
              <AlertCircle class="h-4 w-4" aria-hidden="true" /><span>{{ widgetError('cashflow') }}</span>
              <Button type="button" variant="link" class="h-auto p-0" @click="retryWidget('cashflow')">Tentar
                novamente</Button>
            </div>
            <div v-else-if="widgetLoading('cashflow')" class="space-y-3" aria-label="Carregando fluxo de caixa"
              aria-busy="true">
              <Skeleton class="h-56 rounded-xl" />
              <Skeleton class="h-4 w-2/3" />
            </div>
            <div v-else-if="!data.flow.length"
              class="flex min-h-48 flex-col items-center justify-center py-8 text-center">
              <div class="rounded-2xl bg-muted p-3 text-muted-foreground">
                <TrendingUp class="h-6 w-6" aria-hidden="true" />
              </div>
              <p class="mt-3 font-medium">Ainda não há movimentações neste período</p>
              <p class="mt-1 max-w-sm text-sm text-muted-foreground">Quando receitas e despesas forem efetivadas, a
                evolução do caixa aparecerá aqui.</p>
              <Button type="button" variant="outline" class="mt-4 rounded-xl" @click="openCreate('income')">
                <Plus class="mr-2 h-4 w-4" aria-hidden="true" />Registrar receita
              </Button>
            </div>
            <div v-else class="space-y-3">
              <div class="w-full overflow-x-auto" tabindex="0"
                aria-label="Gráfico de fluxo de caixa; consulte a tabela abaixo para os valores exatos">
                <svg class="finance-chart min-w-[520px]" :viewBox="`0 0 ${chartLayout.width} ${chartLayout.height}`"
                  role="img" aria-labelledby="cashflow-chart-title cashflow-chart-desc">
                  <title id="cashflow-chart-title">Entradas e saídas por período</title>
                  <desc id="cashflow-chart-desc">Gráfico de barras comparando receitas efetivadas e despesas pagas. Uma
                    tabela com os valores exatos está disponível abaixo.</desc>
                  <g v-for="line in chartLayout.gridLines" :key="line.y">
                    <line :x1="chartLayout.left" :x2="chartLayout.width - chartLayout.right" :y1="line.y" :y2="line.y"
                      class="finance-chart__grid" />
                    <text x="4" :y="line.y + 4" class="finance-chart__axis">{{ compactMoney(line.cents) }}</text>
                  </g>
                  <line :x1="chartLayout.left" :x2="chartLayout.width - chartLayout.right" :y1="chartLayout.baseline"
                    :y2="chartLayout.baseline" class="finance-chart__base" />
                  <g v-for="(bar, index) in chartLayout.bars" :key="bar.label">
                    <rect :x="bar.xIncome" :y="bar.yIncome" :width="bar.width" :height="Math.max(0, bar.heightIncome)"
                      rx="3" class="finance-chart__income">
                      <title>{{ bar.label }} · Receitas: {{ money(bar.incomeCents) }}</title>
                    </rect>
                    <rect :x="bar.xExpense" :y="bar.yExpense" :width="bar.width"
                      :height="Math.max(0, bar.heightExpense)" rx="3" class="finance-chart__expense">
                      <title>{{ bar.label }} · Despesas: {{ money(bar.expenseCents) }}</title>
                    </rect>
                    <text
                      v-if="index % Math.max(1, Math.ceil(chartLayout.bars.length / 8)) === 0 || index === chartLayout.bars.length - 1"
                      :x="bar.labelX" y="199" text-anchor="middle" class="finance-chart__label">{{ bar.label }}</text>
                  </g>
                </svg>
              </div>
              <details class="finance-chart-table rounded-xl border border-border/70 p-3">
                <summary class="cursor-pointer text-sm font-medium">Consultar valores em tabela</summary>
                <div class="mt-3 overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr>
                        <th>Período</th>
                        <th class="text-right">Receitas</th>
                        <th class="text-right">Despesas</th>
                        <th class="text-right">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="point in data.flow" :key="point.label">
                        <td>{{ point.label }}</td>
                        <td class="text-right">{{ money(point.incomeCents) }}</td>
                        <td class="text-right">{{ money(point.expenseCents) }}</td>
                        <td class="text-right">{{ money(point.incomeCents - point.expenseCents) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          </CardContent>
        </Card>

        <Card class="min-w-0 rounded-2xl border-border/70 shadow-sm">
          <CardHeader class="flex flex-row items-start justify-between space-y-0">
            <div class="space-y-1">
              <CardTitle class="text-base">Vencimentos</CardTitle>
              <CardDescription>O que precisa da sua atenção</CardDescription>
            </div>
            <div class="rounded-xl bg-muted p-2 text-muted-foreground">
              <Clock3 class="h-5 w-5" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex gap-1 rounded-xl bg-muted p-1">
              <Button type="button" size="sm" class="flex-1 rounded-lg"
                :variant="dueFilter === 'all' ? 'secondary' : 'ghost'" @click="dueFilter = 'all'">Todos</Button>
              <Button type="button" size="sm" class="flex-1 rounded-lg"
                :variant="dueFilter === 'urgent' ? 'secondary' : 'ghost'"
                @click="dueFilter = 'urgent'">Urgentes</Button>
            </div>
            <div v-if="widgetError('due-items')" class="finance-inline-error" role="alert">
              <AlertCircle class="h-4 w-4" aria-hidden="true" /><span>{{ widgetError('due-items') }}</span>
              <Button type="button" variant="link" class="h-auto p-0" @click="retryWidget('due-items')">Tentar
                novamente</Button>
            </div>
            <div v-else-if="widgetLoading('due-items')" class="space-y-3" aria-label="Carregando vencimentos"
              aria-busy="true">
              <Skeleton v-for="index in 3" :key="index" class="h-14 rounded-xl" />
            </div>
            <div v-else-if="!visibleDueItems.length" class="flex flex-col items-center py-8 text-center">
              <CheckCircle2 class="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <p class="mt-2 font-medium">Tudo em dia por aqui</p>
              <p class="mt-1 text-sm text-muted-foreground">Não há vencimentos neste filtro.</p>
            </div>
            <ul v-else class="divide-y divide-border/60">
              <li v-for="item in visibleDueItems" :key="item.id">
                <Button type="button" variant="ghost"
                  class="h-auto w-full justify-start gap-3 whitespace-normal rounded-xl px-2 py-3 text-left"
                  @click="emit('open-due-item', item)">
                  <span class="finance-due-icon shrink-0"
                    :class="item.type === 'pay' ? 'finance-due-icon--pay' : 'finance-due-icon--receive'">
                    <ArrowUpRight v-if="item.type === 'pay'" class="h-4 w-4" aria-hidden="true" />
                    <ArrowDownRight v-else class="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium">{{ item.description }}</span>
                    <span class="mt-1 block truncate text-xs text-muted-foreground">{{ item.type === 'pay' ? 'A pagar' :
                      'A receber' }} · {{ dateLabel(item.dueDate, { day: '2-digit', month: 'short' }) }}</span>
                    <span class="mt-1.5 block">
                      <Badge
                        :variant="item.status === 'overdue' ? 'destructive' : item.status === 'upcoming' ? 'secondary' : 'outline'"
                        :class="statusClass(item.status)">{{ dueStatusLabel(item.status) }}</Badge>
                    </span>
                  </span>
                  <span class="shrink-0 text-right text-sm font-semibold tabular-nums">{{ money(item.amountCents)
                    }}</span>
                </Button>
              </li>
            </ul>
            <div v-if="data.dueItems.length" class="border-t border-border/60 pt-3">
              <Button type="button" variant="link" class="h-auto p-0" @click="emit('view-all-due-items')">Ver todos os
                vencimentos
                <ArrowRight class="ml-1 h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <!-- P0: transações recentes e categorias -->
      <section class="grid min-w-0 gap-4 xl:grid-cols-12">
        <Card class="min-w-0 rounded-2xl border-border/70 shadow-sm xl:col-span-7">
          <CardHeader class="flex flex-row items-start justify-between gap-3 space-y-0">
            <div class="space-y-1">
              <CardTitle class="text-base">Transações recentes</CardTitle>
              <CardDescription>As últimas movimentações registradas</CardDescription>
            </div>
            <Button type="button" variant="link" class="h-auto shrink-0 p-0" @click="emit('view-all-transactions')">Ver
              todas
              <ArrowRight class="ml-1 h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent class="p-0">
            <div v-if="widgetError('transactions')" class="finance-inline-error mx-4 mb-4 sm:mx-6" role="alert">
              <AlertCircle class="h-4 w-4" aria-hidden="true" /><span>{{ widgetError('transactions') }}</span><Button
                type="button" variant="link" class="h-auto p-0" @click="retryWidget('transactions')">Tentar
                novamente</Button>
            </div>
            <div v-else-if="widgetLoading('transactions')" class="space-y-3 px-4 pb-4 sm:px-6"
              aria-label="Carregando transações" aria-busy="true">
              <Skeleton v-for="index in 4" :key="index" class="h-12 rounded-lg" />
            </div>
            <div v-else-if="!data.transactions.length" class="flex flex-col items-center px-5 py-10 text-center">
              <div class="rounded-2xl bg-muted p-3 text-muted-foreground">
                <ReceiptText class="h-6 w-6" aria-hidden="true" />
              </div>
              <p class="mt-3 font-medium">Suas movimentações aparecerão aqui</p>
              <p class="mt-1 max-w-sm text-sm text-muted-foreground">Registre a primeira receita ou despesa para começar
                a acompanhar o financeiro.</p>
              <Button type="button" class="mt-4 rounded-xl" @click="openCreate('income')">
                <Plus class="mr-2 h-4 w-4" aria-hidden="true" />Adicionar movimentação
              </Button>
            </div>
            <div v-else>
              <div class="hidden overflow-x-auto md:block">
                <table class="finance-table w-full">
                  <thead>
                    <tr>
                      <th>Movimentação</th>
                      <th>Data</th>
                      <th>Conta</th>
                      <th>Status</th>
                      <th class="text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="transaction in data.transactions.slice(0, 8)" :key="transaction.id">
                      <td>
                        <button type="button" class="group flex min-w-0 items-center gap-2.5 text-left"
                          @click="emit('open-transaction', transaction)">
                          <span class="finance-transaction-icon"
                            :class="`finance-transaction-icon--${transaction.type}`">
                            <component :is="typeIcon(transaction.type)" class="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span class="min-w-0"><span
                              class="block max-w-48 truncate font-medium text-foreground group-hover:text-primary">{{
                              transaction.description }}</span><span
                              class="mt-0.5 block text-xs text-muted-foreground">{{ transaction.categoryName ||
                              typeLabel(transaction.type) }}</span></span>
                        </button>
                      </td>
                      <td class="whitespace-nowrap text-muted-foreground">{{ transactionDateLabel(transaction) }}</td>
                      <td class="max-w-28 truncate text-muted-foreground">{{ transaction.accountName || '—' }}</td>
                      <td>
                        <Badge
                          :variant="transaction.status === 'overdue' ? 'destructive' : transaction.status === 'settled' ? 'secondary' : 'outline'"
                          :class="statusClass(transaction.status)">{{ statusLabel(transaction.status) }}</Badge>
                      </td>
                      <td class="whitespace-nowrap text-right font-medium tabular-nums"
                        :class="transaction.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : transaction.type === 'expense' ? 'text-foreground' : 'text-muted-foreground'">
                        {{ signedMoney(transaction) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <ul class="divide-y divide-border/60 px-4 md:hidden">
                <li v-for="transaction in data.transactions.slice(0, 8)" :key="transaction.id">
                  <Button type="button" variant="ghost"
                    class="h-auto w-full justify-start gap-3 whitespace-normal rounded-xl px-1 py-3 text-left"
                    @click="emit('open-transaction', transaction)">
                    <span class="finance-transaction-icon" :class="`finance-transaction-icon--${transaction.type}`">
                      <component :is="typeIcon(transaction.type)" class="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium">{{
                        transaction.description }}</span><span
                        class="mt-1 block truncate text-xs text-muted-foreground">{{ transactionDateLabel(transaction)
                        }} · {{ transaction.accountName || typeLabel(transaction.type) }}</span><span
                        class="mt-1.5 block">
                        <Badge
                          :variant="transaction.status === 'overdue' ? 'destructive' : transaction.status === 'settled' ? 'secondary' : 'outline'"
                          :class="statusClass(transaction.status)">{{ statusLabel(transaction.status) }}</Badge>
                      </span></span>
                    <span class="shrink-0 text-sm font-semibold tabular-nums"
                      :class="transaction.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'">{{
                      signedMoney(transaction) }}</span>
                  </Button>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card class="min-w-0 rounded-2xl border-border/70 shadow-sm xl:col-span-5">
          <CardHeader class="flex flex-row items-start justify-between gap-3 space-y-0">
            <div class="space-y-1">
              <CardTitle class="text-base">Despesas por categoria</CardTitle>
              <CardDescription>Onde as despesas efetivadas se concentram</CardDescription>
            </div>
            <div class="rounded-xl bg-muted p-2 text-muted-foreground">
              <TrendingDown class="h-5 w-5" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent class="space-y-4">
            <div v-if="widgetError('categories')" class="finance-inline-error" role="alert">
              <AlertCircle class="h-4 w-4" aria-hidden="true" /><span>{{ widgetError('categories') }}</span><Button
                type="button" variant="link" class="h-auto p-0" @click="retryWidget('categories')">Tentar
                novamente</Button>
            </div>
            <div v-else-if="widgetLoading('categories')" class="space-y-4" aria-label="Carregando categorias"
              aria-busy="true">
              <Skeleton v-for="index in 5" :key="index" class="h-9 rounded-lg" />
            </div>
            <div v-else-if="!data.expensesByCategory.length" class="flex flex-col items-center py-8 text-center">
              <TrendingDown class="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <p class="mt-2 font-medium">Sem despesas categorizadas</p>
              <p class="mt-1 text-sm text-muted-foreground">Quando houver despesas realizadas, a distribuição aparecerá
                aqui.</p>
            </div>
            <template v-else>
              <div class="relative">
                <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true" />
                <Input v-model="categoryQuery" type="search" class="rounded-xl pl-9" aria-label="Buscar categoria"
                  placeholder="Buscar categoria" />
              </div>
              <button v-for="category in visibleCategories" :key="category.id" type="button" class="finance-category"
                @click="emit('open-category', category.id)">
                <span class="flex min-w-0 items-center justify-between gap-3"><span
                    class="truncate text-sm font-medium">{{ category.name }}</span><span
                    class="shrink-0 text-sm tabular-nums">{{ money(category.amountCents) }}</span></span>
                <span class="mt-2 flex items-center gap-3"><span class="finance-progress"><span
                      :style="{ width: `${categoryPercent(category.amountCents, category.sharePercent)}%` }" /></span><span
                    class="w-10 shrink-0 text-right text-xs text-muted-foreground">{{
                      Math.round(categoryPercent(category.amountCents, category.sharePercent)) }}%</span></span>
              </button>
              <p v-if="!visibleCategories.length" class="py-4 text-center text-sm text-muted-foreground">Nenhuma
                categoria corresponde à busca.</p>
              <p class="border-t border-border/60 pt-3 text-xs text-muted-foreground">Total categorizado: <strong
                  class="font-medium text-foreground">{{ money(categoriesTotal) }}</strong></p>
            </template>
          </CardContent>
        </Card>
      </section>

      <!-- P1: widgets opcionais aparecem apenas quando existem dados. -->
      <section v-if="data.accounts.length || data.budgets?.length" class="grid gap-4 xl:grid-cols-2">
        <Card v-if="data.accounts.length" class="min-w-0 rounded-2xl border-border/70 shadow-sm">
          <CardHeader class="flex flex-row items-start justify-between space-y-0">
            <div class="space-y-1">
              <CardTitle class="text-base">Saldos por conta</CardTitle>
              <CardDescription>Saldo atual de cada conta</CardDescription>
            </div>
            <div class="rounded-xl bg-muted p-2 text-muted-foreground">
              <Landmark class="h-5 w-5" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent class="divide-y divide-border/60">
            <div v-for="account in data.accounts" :key="account.id"
              class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span class="finance-account-icon">
                <Landmark class="h-4 w-4" aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium">{{ account.name
                  }}</span><span class="mt-0.5 block truncate text-xs text-muted-foreground">{{ account.institution ||
                    account.typeLabel ||
                  'Conta' }}</span></span>
              <span class="text-sm font-semibold tabular-nums">{{ money(account.balanceCents) }}</span>
            </div>
          </CardContent>
        </Card>

        <Card v-if="data.budgets?.length" class="min-w-0 rounded-2xl border-border/70 shadow-sm">
          <CardHeader class="flex flex-row items-start justify-between space-y-0">
            <div class="space-y-1">
              <CardTitle class="text-base">Orçamentos</CardTitle>
              <CardDescription>Acompanhamento dos limites definidos</CardDescription>
            </div>
            <div class="rounded-xl bg-muted p-2 text-muted-foreground">
              <ListFilter class="h-5 w-5" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent class="space-y-5">
            <div v-if="widgetError('budgets')" class="finance-inline-error" role="alert">
              <AlertCircle class="h-4 w-4" aria-hidden="true" /><span>{{ widgetError('budgets') }}</span><Button
                type="button" variant="link" class="h-auto p-0" @click="retryWidget('budgets')">Tentar
                novamente</Button>
            </div>
            <div v-else v-for="budget in data.budgets" :key="budget.id" class="space-y-2">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ budget.categoryName }}</p>
                  <p v-if="budget.periodLabel" class="mt-0.5 text-xs text-muted-foreground">{{ budget.periodLabel }}</p>
                </div>
                <p class="shrink-0 text-right text-sm tabular-nums"><strong>{{ money(budget.spentCents) }}</strong><span
                    class="text-muted-foreground"> / {{ money(budget.limitCents) }}</span></p>
              </div>
              <Progress
                :model-value="budget.limitCents > 0 ? Math.min(100, (budget.spentCents / budget.limitCents) * 100) : 0"
                class="h-2" :aria-label="`Orçamento de ${budget.categoryName}`" />
              <p class="text-xs"
                :class="budget.limitCents > 0 && budget.spentCents > budget.limitCents ? 'text-destructive' : 'text-muted-foreground'">
                {{ budget.limitCents > 0 && budget.spentCents > budget.limitCents ? `Acima do limite em
                ${money(budget.spentCents - budget.limitCents)}` : `Restam ${money(Math.max(0, budget.limitCents -
                budget.spentCents))}` }}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <footer
        class="flex flex-col gap-1 border-t border-border/50 pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Os valores realizados consideram apenas movimentações efetivadas. Pendências aparecem
          separadamente.</span>
        <span v-if="data.updatedAt">Atualizado em {{ dateLabel(data.updatedAt, {
          day: '2-digit', month: 'short', hour:
            '2-digit', minute: '2-digit' }) }}</span>
      </footer>
    </template>

    <section v-else-if="loading" class="space-y-4" aria-label="Carregando dashboard financeira" aria-busy="true">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton v-for="index in 4" :key="index" class="h-36 rounded-2xl" />
      </div>
      <div class="grid gap-4 xl:grid-cols-3">
        <Skeleton class="h-80 rounded-2xl xl:col-span-2" />
        <Skeleton class="h-80 rounded-2xl" />
      </div>
      <div class="grid gap-4 xl:grid-cols-2">
        <Skeleton class="h-64 rounded-2xl" />
        <Skeleton class="h-64 rounded-2xl" />
      </div>
    </section>
    <Card v-else-if="!error" class="rounded-2xl border-dashed shadow-sm">
      <CardContent class="flex flex-col items-center px-5 py-12 text-center">
        <div class="rounded-2xl bg-muted p-3 text-muted-foreground">
          <Wallet class="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 class="mt-3 text-lg font-semibold">Nenhum dado financeiro disponível</h2>
        <p class="mt-1 max-w-lg text-sm text-muted-foreground">
          Os dados das suas contas e transações aparecerão aqui após serem registrados.
        </p>
        <Button type="button" variant="outline" class="mt-4 rounded-xl" @click="emit('retry')">
          <RefreshCw class="mr-2 h-4 w-4" aria-hidden="true" />Tentar carregar novamente
        </Button>
      </CardContent>
    </Card>

    <!-- Dialog shadcn-vue: o pai persiste pelo callback real. -->
    <Dialog :open="showTransactionDialog" @update:open="setDialogOpen">
      <DialogContent class="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle id="new-transaction-title">Nova transação</DialogTitle>
          <DialogDescription id="new-transaction-description">Registre uma movimentação financeira.</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="submitTransaction">
          <div class="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            <Button v-for="option in transactionTypeOptions" :key="option.value" type="button" size="sm"
              class="rounded-lg" :variant="transactionType === option.value ? 'secondary' : 'ghost'"
              @click="transactionType = option.value">{{
              option.label }}</Button>
          </div>

          <div class="grid gap-2">
            <Label for="transaction-description">Descrição *</Label>
            <Input id="transaction-description" v-model="description" data-initial-focus required maxlength="120"
              class="rounded-xl" placeholder="Ex.: Pagamento de cliente" />
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="grid gap-2"><Label for="transaction-amount">Valor ({{ currentCurrency }}) *</Label><Input
                id="transaction-amount" v-model="amountInput" required inputmode="decimal" type="number" min="0.01"
                step="0.01" class="rounded-xl" placeholder="0,00" /></div>
            <div class="grid gap-2"><Label for="transaction-date">Data *</Label><Input id="transaction-date"
                v-model="transactionDate" required type="date" class="rounded-xl" /></div>
          </div>

          <div class="grid gap-2">
            <Label for="transaction-source-account">{{ transactionType === 'transfer' ? 'Conta de origem *' : 'Conta *'
              }}</Label>
            <Select :model-value="sourceAccountId || '__none__'" @update:model-value="updateSourceAccount">
              <SelectTrigger id="transaction-source-account" class="rounded-xl">
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" disabled>Selecione uma conta</SelectItem>
                <SelectItem v-for="account in data?.accounts ?? []" :key="account.id" :value="account.id">{{
                  account.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div v-if="transactionType === 'transfer'" class="grid gap-2">
            <Label for="transaction-destination-account">Conta de destino *</Label>
            <Select :model-value="destinationAccountId || '__none__'" @update:model-value="updateDestinationAccount">
              <SelectTrigger id="transaction-destination-account" class="rounded-xl">
                <SelectValue placeholder="Selecione a conta de destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" disabled>Selecione a conta de destino</SelectItem>
                <SelectItem v-for="account in data?.accounts ?? []" :key="account.id" :value="account.id"
                  :disabled="account.id === sourceAccountId">{{ account.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div v-else-if="filteredFormCategories.length" class="grid gap-2">
            <Label for="transaction-category">Categoria</Label>
            <Select :model-value="categoryId || '__none__'" @update:model-value="updateCategory">
              <SelectTrigger id="transaction-category" class="rounded-xl">
                <SelectValue placeholder="Sem categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem categoria</SelectItem>
                <SelectItem v-for="category in filteredFormCategories" :key="category.id" :value="category.id">{{
                  category.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <fieldset class="space-y-2">
            <legend class="text-sm font-medium">Situação inicial</legend>
            <RadioGroup :model-value="transactionState" class="grid grid-cols-2 gap-2"
              @update:model-value="updateTransactionState">
              <div class="flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2"
                :class="transactionState === 'settled' ? 'border-primary/50 bg-primary/5' : 'border-border'">
                <RadioGroupItem id="transaction-state-settled" value="settled" />
                <Label for="transaction-state-settled" class="cursor-pointer font-normal">{{ transactionType ===
                  'income' ?
                  'Já recebida' : transactionType === 'expense' ? 'Já paga' : 'Já concluída' }}</Label>
              </div>
              <div class="flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2"
                :class="transactionState === 'pending' ? 'border-primary/50 bg-primary/5' : 'border-border'">
                <RadioGroupItem id="transaction-state-pending" value="pending" />
                <Label for="transaction-state-pending" class="cursor-pointer font-normal">Pendente</Label>
              </div>
            </RadioGroup>
          </fieldset>

          <div>
            <Button type="button" variant="link" class="h-auto p-0" @click="showNotes = !showNotes">
              {{ showNotes ? 'Ocultar observação' : 'Adicionar observação (opcional)' }}
              <ChevronDown class="ml-1 h-3.5 w-3.5 transition-transform" :class="showNotes ? 'rotate-180' : ''"
                aria-hidden="true" />
            </Button>
            <div v-if="showNotes" class="mt-2 grid gap-2"><Label for="transaction-notes">Observação</Label><Textarea
                id="transaction-notes" v-model="notes" rows="3" maxlength="1000" class="rounded-xl"
                placeholder="Detalhes adicionais..." /></div>
          </div>

          <p v-if="formError"
            class="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
            role="alert">
            <AlertCircle class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{{ formError }}
          </p>

          <DialogFooter class="gap-2 sm:gap-2">
            <Button type="button" variant="outline" class="rounded-xl" :disabled="isSavingTransaction"
              @click="closeCreate">Cancelar</Button>
            <Button type="submit" class="rounded-xl"
              :disabled="!data?.accounts.length || isSavingTransaction || !canCreateTransfer">
              <RefreshCw v-if="isSavingTransaction" class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              <Check v-else class="mr-2 h-4 w-4" aria-hidden="true" />
              {{ isSavingTransaction ? 'Salvando...' : 'Salvar transação' }}
            </Button>
          </DialogFooter>
          <p class="text-xs text-muted-foreground">A gravação, validação definitiva e atualização dos saldos são feitas
            pela
            API do NT-life.</p>
        </form>
      </DialogContent>
    </Dialog>
  </main>
</template>
<style scoped>
.finance-page {
  color: var(--color-foreground, var(--foreground, #111827));
}

.finance-filter {
  display: inline-flex;
  align-items: center;
  gap: .5rem;
  min-height: 2.5rem;
  max-width: 100%;
  padding: 0 .75rem;
  border: 1px solid var(--color-border, var(--border, #e5e7eb));
  border-radius: .8rem;
  background: var(--color-background, var(--background, #ffffff));
  color: var(--color-foreground, var(--foreground, #111827));
}

.finance-filter select {
  max-width: 12rem;
  min-width: 0;
  appearance: none;
  border: 0;
  outline: 0;
  padding: .55rem 0;
  background: transparent;
  font-size: .875rem;
}

.finance-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  min-height: 2.5rem;
  padding: .55rem .85rem;
  border-radius: .8rem;
  border: 1px solid transparent;
  font-size: .875rem;
  font-weight: 550;
  line-height: 1.2;
  transition: background-color .18s ease, color .18s ease, border-color .18s ease, transform .18s ease;
}

.finance-button:active {
  transform: scale(.98);
}

.finance-button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.finance-button--outline {
  border-color: var(--color-border, var(--border, #e5e7eb));
  background: var(--color-background, var(--background, #ffffff));
  color: var(--color-foreground, var(--foreground, #111827));
}

.finance-button--outline:hover:not(:disabled) {
  background: var(--color-muted, var(--muted, #f5f5f5));
}

.finance-button--primary {
  color: white;
  background: var(--color-primary, var(--primary, #2563eb));
  border-color: var(--color-primary, var(--primary, #2563eb));
}

.finance-button--primary:hover:not(:disabled) {
  filter: brightness(.96);
}

.finance-card,
.finance-panel {
  min-width: 0;
  border: 1px solid color-mix(in srgb, var(--color-border, var(--border, #e5e7eb)) 75%, transparent);
  border-radius: 1.15rem;
  background: var(--color-card, var(--card, #ffffff));
  box-shadow: 0 1px 2px hsl(222 30% 10% / .025);
}

.finance-card {
  padding: 1rem;
}

.finance-card--balance {
  border-color: color-mix(in srgb, var(--color-primary, var(--primary, #2563eb)) 28%, transparent);
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-primary, var(--primary, #2563eb)) 7.5%, transparent), var(--color-card, var(--card, #ffffff)) 72%);
}

@media (min-width:640px) {
  .finance-card {
    padding: 1.15rem;
  }
}

.finance-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 auto;
  border-radius: .9rem;
}

.finance-icon--blue {
  background: color-mix(in srgb, var(--color-primary, var(--primary, #2563eb)) 11%, transparent);
  color: var(--color-primary, var(--primary, #2563eb));
}

.finance-icon--green {
  background: hsl(145 55% 42% / .12);
  color: hsl(145 55% 34%);
}

.finance-icon--red {
  background: hsl(0 67% 52% / .1);
  color: hsl(0 62% 47%);
}

.finance-icon--violet {
  background: hsl(262 74% 58% / .11);
  color: hsl(262 65% 53%);
}

.dark .finance-icon--green {
  color: hsl(145 60% 65%);
}

.dark .finance-icon--red {
  color: hsl(0 75% 70%);
}

.dark .finance-icon--violet {
  color: hsl(262 75% 76%);
}

.finance-panel {
  overflow: hidden;
}

.finance-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1rem .9rem;
}

@media (min-width:640px) {
  .finance-panel__header {
    padding: 1.2rem 1.25rem 1rem;
  }
}

.finance-legend {
  width: .55rem;
  height: .55rem;
  display: inline-block;
  border-radius: 2px;
}

.finance-legend--income {
  background: hsl(145 55% 42%);
}

.finance-legend--expense {
  background: var(--color-primary, var(--primary, #2563eb));
}

.finance-chart {
  display: block;
  width: 100%;
  min-width: 480px;
  max-height: 275px;
  overflow: visible;
}

.finance-chart__grid {
  stroke: var(--color-border, var(--border, #e5e7eb));
  stroke-dasharray: 3 5;
  stroke-width: 1;
}

.finance-chart__base {
  stroke: var(--color-border, var(--border, #e5e7eb));
  stroke-width: 1;
}

.finance-chart__axis {
  fill: var(--color-muted-foreground, var(--muted-foreground, #737373));
  font-size: 10px;
}

.finance-chart__label {
  fill: var(--color-muted-foreground, var(--muted-foreground, #737373));
  font-size: 11px;
}

.finance-chart__income {
  fill: hsl(145 55% 42%);
  transition: opacity .18s ease;
}

.finance-chart__expense {
  fill: var(--color-primary, var(--primary, #2563eb));
  transition: opacity .18s ease;
}

.finance-chart__income:hover,
.finance-chart__expense:hover {
  opacity: .75;
}

.finance-chart-table summary {
  cursor: pointer;
  color: var(--color-muted-foreground, var(--muted-foreground, #737373));
  font-size: .75rem;
}

.finance-chart-table summary:hover {
  color: var(--color-foreground, var(--foreground, #111827));
}

.finance-chart-table th,
.finance-chart-table td {
  padding: .5rem .4rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border, var(--border, #e5e7eb)) 70%, transparent);
}

.finance-chart-table th {
  color: var(--color-muted-foreground, var(--muted-foreground, #737373));
  font-weight: 500;
  text-align: left;
}

.finance-inline-error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
  border: 1px solid color-mix(in srgb, var(--color-destructive, var(--destructive, #dc2626)) 25%, transparent);
  border-radius: .75rem;
  padding: .7rem .8rem;
  color: var(--color-destructive, var(--destructive, #dc2626));
  font-size: .8rem;
}

.finance-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.75rem 1.25rem;
  text-align: center;
}

.finance-empty--compact {
  min-height: 12rem;
  padding: 2rem 1rem;
}

.finance-empty--page {
  min-height: 20rem;
  border: 1px dashed var(--color-border, var(--border, #e5e7eb));
  border-radius: 1.25rem;
  background: color-mix(in srgb, var(--color-card, var(--card, #ffffff)) 65%, transparent);
}

.finance-empty__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 1rem;
  background: var(--color-muted, var(--muted, #f5f5f5));
  color: var(--color-muted-foreground, var(--muted-foreground, #737373));
}

.finance-chip {
  padding: .4rem .7rem;
  border: 1px solid transparent;
  border-radius: .65rem;
  color: var(--color-muted-foreground, var(--muted-foreground, #737373));
  font-size: .75rem;
  font-weight: 550;
}

.finance-chip:hover {
  background: color-mix(in srgb, var(--color-muted, var(--muted, #f5f5f5)) 70%, transparent);
}

.finance-chip--active {
  border-color: var(--color-border, var(--border, #e5e7eb));
  background: var(--color-background, var(--background, #ffffff));
  color: var(--color-foreground, var(--foreground, #111827));
  box-shadow: 0 1px 2px hsl(222 30% 10% / .04);
}

.finance-status {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  border-radius: 999px;
  padding: .22rem .48rem;
  font-size: .68rem;
  font-weight: 600;
  white-space: nowrap;
}

.finance-status--success {
  background: hsl(145 55% 42% / .12);
  color: hsl(145 55% 30%);
}

.finance-status--danger {
  background: hsl(0 67% 52% / .11);
  color: hsl(0 65% 45%);
}

.finance-status--warning {
  background: hsl(38 90% 52% / .15);
  color: hsl(32 85% 32%);
}

.finance-status--neutral {
  background: var(--color-muted, var(--muted, #f5f5f5));
  color: var(--color-muted-foreground, var(--muted-foreground, #737373));
}

.dark .finance-status--success {
  color: hsl(145 65% 70%);
}

.dark .finance-status--danger {
  color: hsl(0 75% 75%);
}

.dark .finance-status--warning {
  color: hsl(42 95% 72%);
}

.finance-due-item {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: .7rem;
  padding: .9rem 0;
  text-align: left;
}

.finance-due-item:hover .finance-due-icon {
  transform: translateY(-1px);
}

.finance-due-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: .7rem;
  flex: 0 0 auto;
  transition: transform .18s ease;
}

.finance-due-icon--pay {
  background: hsl(0 67% 52% / .1);
  color: hsl(0 62% 47%);
}

.finance-due-icon--receive {
  background: hsl(145 55% 42% / .12);
  color: hsl(145 55% 34%);
}

.dark .finance-due-icon--pay {
  color: hsl(0 75% 72%);
}

.dark .finance-due-icon--receive {
  color: hsl(145 60% 68%);
}

.finance-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .35rem;
  color: var(--color-primary, var(--primary, #2563eb));
  font-size: .8rem;
  font-weight: 550;
  text-align: left;
}

.finance-link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.finance-table th,
.finance-table td {
  padding: .72rem .55rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border, var(--border, #e5e7eb)) 60%, transparent);
  text-align: left;
}

.finance-table th {
  font-size: .68rem;
  color: var(--color-muted-foreground, var(--muted-foreground, #737373));
  font-weight: 550;
}

.finance-table td {
  font-size: .78rem;
}

.finance-table tr:last-child td {
  border-bottom: 0;
}

.finance-table th:first-child,
.finance-table td:first-child {
  padding-left: 1.25rem;
}

.finance-table th:last-child,
.finance-table td:last-child {
  padding-right: 1.25rem;
}

.finance-transaction-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  flex: 0 0 auto;
  border-radius: .7rem;
}

.finance-transaction-icon--income {
  background: hsl(145 55% 42% / .12);
  color: hsl(145 55% 34%);
}

.finance-transaction-icon--expense {
  background: var(--color-muted, var(--muted, #f5f5f5));
  color: var(--color-muted-foreground, var(--muted-foreground, #737373));
}

.finance-transaction-icon--transfer {
  background: color-mix(in srgb, var(--color-primary, var(--primary, #2563eb)) 10%, transparent);
  color: var(--color-primary, var(--primary, #2563eb));
}

.dark .finance-transaction-icon--income {
  color: hsl(145 60% 68%);
}

.finance-search {
  display: flex;
  align-items: center;
  gap: .55rem;
  min-height: 2.4rem;
  border: 1px solid var(--color-border, var(--border, #e5e7eb));
  border-radius: .75rem;
  padding: 0 .7rem;
}

.finance-search input {
  width: 100%;
  min-width: 0;
  padding: .5rem 0;
  outline: 0;
  border: 0;
  background: transparent;
  color: var(--color-foreground, var(--foreground, #111827));
  font-size: .8rem;
}

.finance-category {
  display: block;
  width: 100%;
  border-radius: .6rem;
  padding: .15rem 0;
  text-align: left;
}

.finance-category:hover .finance-progress>span {
  filter: brightness(.92);
}

.finance-progress {
  display: block;
  width: 100%;
  height: .45rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-muted, var(--muted, #f5f5f5));
}

.finance-progress>span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary, var(--primary, #2563eb));
  transition: width .3s ease;
}

.finance-progress>span.finance-progress__danger {
  background: var(--color-destructive, var(--destructive, #dc2626));
}

.finance-account-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  flex: 0 0 auto;
  border-radius: .7rem;
  background: var(--color-muted, var(--muted, #f5f5f5));
  color: var(--color-muted-foreground, var(--muted-foreground, #737373));
}

.finance-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: .4rem;
  color: var(--color-foreground, var(--foreground, #111827));
  font-size: .82rem;
  font-weight: 550;
}

.finance-field input,
.finance-field select,
.finance-field textarea {
  width: 100%;
  min-height: 2.6rem;
  border: 1px solid var(--color-input, var(--input, var(--color-border, var(--border, #e5e7eb))));
  border-radius: .75rem;
  background: var(--color-background, var(--background, #ffffff));
  color: var(--color-foreground, var(--foreground, #111827));
  padding: .65rem .75rem;
  font-size: .875rem;
  font-weight: 400;
  outline: none;
  transition: border-color .15s ease, box-shadow .15s ease;
}

.finance-field textarea {
  resize: vertical;
}

.finance-field input:focus,
.finance-field select:focus,
.finance-field textarea:focus,
.finance-filter:focus-within,
.finance-search:focus-within {
  border-color: var(--color-ring, var(--ring, #2563eb));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-ring, var(--ring, #2563eb)) 20%, transparent);
}

.finance-radio {
  display: flex;
  align-items: center;
  gap: .5rem;
  min-height: 2.5rem;
  padding: .55rem .65rem;
  border: 1px solid var(--color-border, var(--border, #e5e7eb));
  border-radius: .75rem;
  font-size: .8rem;
  font-weight: 450;
}

.finance-radio:has(input:checked) {
  border-color: color-mix(in srgb, var(--color-primary, var(--primary, #2563eb)) 50%, transparent);
  background: color-mix(in srgb, var(--color-primary, var(--primary, #2563eb)) 5%, transparent);
}

.finance-radio input {
  accent-color: var(--color-primary, var(--primary, #2563eb));
}

.finance-dialog-backdrop {
  position: fixed;
  z-index: 80;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  background: rgb(10 15 25 / .52);
  backdrop-filter: blur(5px);
  padding: 1rem;
}

.finance-dialog {
  width: min(100%, 32rem);
  max-height: min(92dvh, 52rem);
  overflow-y: auto;
  border: 1px solid var(--color-border, var(--border, #e5e7eb));
  border-radius: 1.25rem;
  background: var(--color-background, var(--background, #ffffff));
  color: var(--color-foreground, var(--foreground, #111827));
  box-shadow: 0 24px 80px rgb(0 0 0 / .2);
}

.finance-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: .65rem;
  color: var(--color-muted-foreground, var(--muted-foreground, #737373));
}

.finance-icon-button:hover {
  background: var(--color-muted, var(--muted, #f5f5f5));
  color: var(--color-foreground, var(--foreground, #111827));
}

.finance-dialog-enter-active,
.finance-dialog-leave-active {
  transition: opacity .18s ease;
}

.finance-dialog-enter-active .finance-dialog,
.finance-dialog-leave-active .finance-dialog {
  transition: transform .18s ease;
}

.finance-dialog-enter-from,
.finance-dialog-leave-to {
  opacity: 0;
}

.finance-dialog-enter-from .finance-dialog,
.finance-dialog-leave-to .finance-dialog {
  transform: translateY(8px) scale(.99);
}

@media (prefers-reduced-motion: reduce) {

  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
</style>
