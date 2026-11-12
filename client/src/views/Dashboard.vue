<template>
  <TooltipProvider>
    <div class="dashboard-motion space-y-6">
      <!-- Cabeçalho -->
      <header class="dashboard-header flex flex-wrap items-end justify-between gap-3 sm:gap-4">
        <div class="min-w-0">
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Olá, {{ firstName }}! 👋</h1>
          <p class="mt-1 text-sm text-muted-foreground sm:text-base">{{ subtitle }}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Tabs :model-value="String(range)" @update:model-value="(v) => (range = Number(v) as Range)">
            <TabsList>
              <TabsTrigger value="7">7 dias</TabsTrigger>
              <TabsTrigger value="30">30 dias</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="outline" size="icon" aria-label="Atualizar" @click="refetch()">
                <RefreshCw class="h-4 w-4" :class="isFetching ? 'animate-spin' : ''" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Atualizar dados</TooltipContent>
          </Tooltip>

          <Button :variant="editing ? 'default' : 'outline'" size="sm" class="gap-2" @click="toggleEditing">
            <Check v-if="editing" class="h-4 w-4" />
            <LayoutGrid v-else class="h-4 w-4" />
            {{ editing ? 'Concluir' : 'Personalizar' }}
          </Button>

          <Button v-if="editing" variant="ghost" size="sm" class="gap-2" @click="resetLayout">
            <RotateCcw class="h-4 w-4" />
            Restaurar
          </Button>
        </div>
      </header>

      <Transition name="edit-hint">
        <p v-if="editing"
          class="-mt-3 rounded-lg border border-primary/15 bg-primary/[0.035] px-3 py-2 text-sm text-muted-foreground">
          Arraste pela alça (⋮⋮) para reposicionar e use Esc para cancelar. Os botões mudam largura, direção e
          visibilidade. As mudanças são salvas neste navegador.
        </p>
      </Transition>

      <!-- Grade de widgets: o TransitionGroup anima a troca de posição dos blocos -->
      <TransitionGroup ref="gridRef" tag="div" name="widget" appear
        class="relative grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4" @before-leave="onBeforeLeave">
        <section v-for="(w, index) in visibleWidgets" :key="w.id" :data-widget-id="w.id"
          :style="{ '--widget-index': index }"
          class="dashboard-widget relative min-w-0 select-none transition-opacity duration-200" :class="[
            SPAN_CLASS[w.span],
            dragId === w.id
              ? 'rounded-xl opacity-40 outline-2 outline-dashed outline-offset-2 outline-primary/50'
              : '',
          ]">
          <!-- Barra de edição -->
          <div v-if="editing"
            class="mb-2 flex flex-wrap items-center gap-1 rounded-lg border border-dashed bg-muted/40 p-1.5">
            <span role="button" tabindex="0"
              class="flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
              aria-label="Arrastar para reposicionar" title="Arraste para reposicionar"
              @pointerdown="onPointerDown($event, w.id)">
              <GripVertical class="h-4 w-4" />
            </span>

            <span class="px-1 text-xs font-medium">{{ WIDGET_LABEL[w.id] }}</span>

            <span class="mx-1 h-4 w-px bg-border" />

            <Button variant="ghost" size="icon" class="h-7 w-7" aria-label="Mover para antes" :disabled="index === 0"
              @click="move(w.id, -1)">
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" class="h-7 w-7" aria-label="Mover para depois"
              :disabled="index === visibleWidgets.length - 1" @click="move(w.id, 1)">
              <ChevronRight class="h-4 w-4" />
            </Button>

            <span class="mx-1 h-4 w-px bg-border" />

            <span class="px-1 text-xs text-muted-foreground">Largura</span>
            <Button v-for="n in SPANS" :key="n" :variant="w.span === n ? 'default' : 'ghost'" size="sm"
              class="h-7 w-7 px-0 text-xs" :aria-label="`${n} ${n === 1 ? 'coluna' : 'colunas'}`"
              @click="update(w.id, { span: n as Span })">
              {{ n }}
            </Button>

            <span class="mx-1 h-4 w-px bg-border" />

            <Button variant="ghost" size="sm" class="h-7 gap-1.5 px-2 text-xs"
              @click="update(w.id, { dir: w.dir === 'row' ? 'col' : 'row' })">
              <Columns3 v-if="w.dir === 'row'" class="h-3.5 w-3.5" />
              <Rows3 v-else class="h-3.5 w-3.5" />
              {{ w.dir === 'row' ? 'Lado a lado' : 'Empilhado' }}
            </Button>

            <span class="mx-1 h-4 w-px bg-border" />

            <Button variant="ghost" size="icon" class="h-7 w-7" aria-label="Ocultar widget"
              @click="update(w.id, { visible: false })">
              <EyeOff class="h-4 w-4" />
            </Button>
          </div>

          <!-- Indicadores -->
          <div v-if="w.id === 'stats'" :class="bodyClass(w)">
            <template v-if="!dashData">
              <div v-for="i in 4" :key="i" :class="itemClass(w)">
                <Skeleton class="h-28 w-full rounded-xl sm:h-36" />
              </div>
            </template>
            <template v-else>
              <div v-for="(c, cardIndex) in statCards" :key="c.key" :class="[itemClass(w), 'dashboard-stat-shell']"
                :style="{ '--stat-index': cardIndex }">
                <StatCard :label="c.label" :value="c.value" :hint="c.hint" :icon="c.icon" :tone="c.tone"
                  :badge="c.badge" :active="filter === c.key" @select="go(c.key)" />
              </div>
            </template>
          </div>

          <!-- Criadas x concluídas -->
          <Card v-else-if="w.id === 'chart'" class="dashboard-card min-w-0 gap-3 py-4 sm:gap-6 sm:py-6">
            <CardHeader class="px-4 sm:px-6">
              <CardTitle class="text-base">Criadas x concluídas</CardTitle>
              <CardDescription class="break-words text-xs sm:text-sm">
                Últimos {{ range }} dias · passe o mouse para ver detalhes
              </CardDescription>
            </CardHeader>
            <CardContent class="min-w-0 px-4 sm:px-6">
              <div :class="bodyClass(w)">
                <div :class="[itemClass(w), 'min-w-0']">
                  <AreaChart v-if="dashData" :key="range" :series="dashData.series" />
                  <Skeleton v-else class="h-44 w-full rounded-xl sm:h-60" />
                </div>
                <div :class="legendClass(w)" class="text-xs text-muted-foreground">
                  <span class="flex items-center gap-1.5"><i class="h-2 w-2 rounded-full bg-primary" />Criadas</span>
                  <span class="flex items-center gap-1.5"><i
                      class="h-2 w-2 rounded-full bg-emerald-500" />Concluídas</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Distribuição -->
          <Card v-else-if="w.id === 'donut'" class="dashboard-card">
            <CardHeader>
              <CardTitle class="text-base">Distribuição</CardTitle>
              <CardDescription>Clique em um trecho para filtrar</CardDescription>
            </CardHeader>
            <CardContent :class="bodyClass(w)">
              <div :class="itemClass(w)">
                <DonutChart :segments="donutSegments" @select="(key) => go(key as Filter)" />
              </div>
              <ul :class="[itemClass(w), 'grid content-start gap-2 text-sm']">
                <li v-for="s in donutSegments" :key="s.key" class="flex items-center justify-between">
                  <span class="flex items-center gap-2">
                    <i class="h-2.5 w-2.5 rounded-full" :style="{ background: s.color }" />
                    {{ s.label }}
                  </span>
                  <span class="tabular-nums text-muted-foreground">{{ s.value }}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <!-- Atividade recente -->
          <Card v-else-if="w.id === 'activity'" class="dashboard-card">
            <CardHeader>
              <CardTitle class="text-base">Atividade recente</CardTitle>
            </CardHeader>
            <CardContent :class="w.dir === 'row' ? 'columns-1 gap-x-6 sm:columns-2 [&>*]:break-inside-avoid' : ''">
              <ActivityFeed :events="dashData?.events ?? []" />
            </CardContent>
          </Card>

          <!-- Próximos vencimentos -->
          <Card v-else class="dashboard-card">
            <CardHeader>
              <CardTitle class="text-base">Próximos vencimentos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul :class="w.dir === 'row' ? 'columns-1 gap-x-6 sm:columns-2' : 'grid'">
                <li v-for="u in dashData?.upcoming ?? []" :key="u.id" class="mb-1 break-inside-avoid">
                  <button type="button"
                    class="dashboard-upcoming-item flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                    @click="go('pendentes')">
                    <span class="h-2 w-2 shrink-0 rounded-full" :class="PRIORITY_DOT[u.priority]" />
                    <span class="min-w-0 flex-1 truncate text-sm">{{ u.title }}</span>
                    <span class="shrink-0 text-xs" :class="DUE_CLASS[dueLabel(u.due_date).tone]">
                      {{ dueLabel(u.due_date).text }}
                    </span>
                  </button>
                </li>
              </ul>
              <p v-if="dashData && !dashData.upcoming.length"
                class="empty-state py-6 text-center text-sm text-muted-foreground">
                Nenhum vencimento agendado.
              </p>
            </CardContent>
          </Card>
        </section>
      </TransitionGroup>

      <!-- Widgets ocultos: aparecem só no modo de edição -->
      <div v-if="editing && hiddenWidgets.length"
        class="hidden-widgets flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-3">
        <span class="text-sm text-muted-foreground">Ocultos:</span>
        <Button v-for="w in hiddenWidgets" :key="w.id" variant="outline" size="sm" class="gap-2"
          @click="update(w.id, { visible: true })">
          <Eye class="h-3.5 w-3.5" />
          {{ WIDGET_LABEL[w.id] }}
        </Button>
      </div>

      <TaskPanel v-model:filter="filter" />
    </div>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { useStorage } from '@vueuse/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import StatCard from '@/components/dashboard/StatCard.vue';
import AreaChart from '@/components/dashboard/AreaChart.vue';
import DonutChart from '@/components/dashboard/DonutChart.vue';
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue';
import TaskPanel from '@/components/dashboard/TaskPanel.vue';
import { useDashboard, useMe } from '@/queries/tasks';
import { dueLabel, DUE_CLASS, PRIORITY_DOT } from '@/lib/format';
import type { Filter, Range } from '@/lib/types';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns3,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  ListChecks,
  RefreshCw,
  Rows3,
  RotateCcw,
} from 'lucide-vue-next';

// ===== Tipos e configuração =====
type WidgetId = 'stats' | 'chart' | 'donut' | 'activity' | 'upcoming';
type Span = 1 | 2 | 3 | 4;
type Dir = 'row' | 'col';

interface WidgetConfig {
  id: WidgetId;
  span: Span;
  dir: Dir;
  visible: boolean;
}

const STORAGE_KEY = 'nt-dashboard-layout-v1';
const SPANS: Span[] = [1, 2, 3, 4];

const WIDGET_LABEL: Record<WidgetId, string> = {
  stats: 'Indicadores',
  chart: 'Criadas x concluídas',
  donut: 'Distribuição',
  activity: 'Atividade recente',
  upcoming: 'Próximos vencimentos',
};

// Classes completas: o Tailwind precisa encontrá-las como texto literal
const SPAN_CLASS: Record<Span, string> = {
  1: 'md:col-span-1 xl:col-span-1',
  2: 'md:col-span-2 xl:col-span-2',
  3: 'md:col-span-2 xl:col-span-3',
  4: 'md:col-span-2 xl:col-span-4',
};

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'stats', span: 4, dir: 'row', visible: true },
  { id: 'chart', span: 2, dir: 'col', visible: true },
  { id: 'donut', span: 2, dir: 'row', visible: true },
  { id: 'activity', span: 2, dir: 'col', visible: true },
  { id: 'upcoming', span: 2, dir: 'col', visible: true },
];

const BODY_ROW = 'flex flex-row flex-wrap items-stretch gap-3 sm:gap-4';
const BODY_COL = 'flex flex-col gap-3 sm:gap-4';

// ===== Estado =====
const range = ref<Range>(7);
const filter = ref<Filter>('todas');
const editing = ref(false);

const layout = useStorage<WidgetConfig[]>(
  STORAGE_KEY,
  DEFAULT_LAYOUT.map((w) => ({ ...w }))
);

const gridRef = ref<ComponentPublicInstance | null>(null);
const dragId = ref<WidgetId | null>(null);

// ===== Dados =====
const { data: dashData, isFetching, refetch } = useDashboard(range);
const { data: me } = useMe();

const EMPTY = { total: 0, done: 0, overdue: 0, due_today: 0, high_open: 0 };
const t = computed(() => dashData.value?.totals ?? EMPTY);

const firstName = computed(() => {
  const base = me.value?.name || me.value?.email.split('@')[0] || '';
  return base.split(' ')[0];
});

const subtitle = computed(() => {
  if (!dashData.value) return 'Carregando seu resumo...';
  const n = t.value.due_today;
  if (!n) return 'Nenhuma tarefa vence hoje.';
  return `${n} ${n === 1 ? 'tarefa vence' : 'tarefas vencem'} hoje.`;
});

const createdInRange = computed(
  () => dashData.value?.series.reduce((s, p) => s + p.created, 0) ?? 0
);

const completionRate = computed(() =>
  t.value.total ? Math.round((t.value.done * 100) / t.value.total) : 0
);

const statCards = computed(() => [
  {
    key: 'todas' as Filter,
    label: 'Total de tarefas',
    value: t.value.total,
    hint: `+${createdInRange.value} nos últimos ${range.value} dias`,
    icon: ListChecks,
    tone: 'bg-primary/10 text-primary',
    badge: undefined as string | undefined,
  },
  {
    key: 'concluidas' as Filter,
    label: 'Concluídas',
    value: t.value.done,
    hint: `${completionRate.value}% de conclusão`,
    icon: CheckCircle2,
    tone: 'bg-emerald-500/10 text-emerald-600',
    badge: undefined as string | undefined,
  },
  {
    key: 'pendentes' as Filter,
    label: 'Pendentes',
    value: t.value.total - t.value.done,
    hint: `${t.value.high_open} de prioridade alta`,
    icon: Clock,
    tone: 'bg-violet-500/10 text-violet-600',
    badge: undefined as string | undefined,
  },
  {
    key: 'atrasadas' as Filter,
    label: 'Atrasadas',
    value: t.value.overdue,
    hint: t.value.due_today ? `${t.value.due_today} vencem hoje` : 'nenhuma vence hoje',
    icon: AlertTriangle,
    tone: 'bg-destructive/10 text-destructive',
    badge: t.value.overdue ? 'atenção' : undefined,
  },
]);

const donutSegments = computed(() => [
  { key: 'concluidas', label: 'Concluídas', value: t.value.done, color: '#2563eb' },
  { key: 'pendentes', label: 'Pendentes', value: t.value.total - t.value.done - t.value.overdue, color: '#cbd5e1' },
  { key: 'atrasadas', label: 'Atrasadas', value: t.value.overdue, color: '#ef4444' },
]);

// ===== Layout =====
function clampSpan(value: unknown): Span {
  const n = Math.round(Number(value));
  return Math.min(4, Math.max(1, Number.isFinite(n) ? n : 1)) as Span;
}

// Respeita a ordem salva, descarta ids desconhecidos ou repetidos e completa com os padrões
const widgets = computed<WidgetConfig[]>(() => {
  const known = new Set<WidgetId>(DEFAULT_LAYOUT.map((w) => w.id));
  const seen = new Set<WidgetId>();
  const saved = Array.isArray(layout.value) ? layout.value : [];
  const list: WidgetConfig[] = [];

  for (const w of [...saved, ...DEFAULT_LAYOUT]) {
    if (!known.has(w.id) || seen.has(w.id)) continue;
    seen.add(w.id);
    list.push({
      id: w.id,
      span: clampSpan(w.span),
      dir: w.dir === 'row' ? 'row' : 'col',
      visible: w.visible !== false,
    });
  }
  return list;
});

const visibleWidgets = computed(() => widgets.value.filter((w) => w.visible));
const hiddenWidgets = computed(() => widgets.value.filter((w) => !w.visible));

function commit(list: WidgetConfig[]): void {
  layout.value = list.map((w) => ({ ...w }));
}

function update(id: WidgetId, patch: Partial<Omit<WidgetConfig, 'id'>>): void {
  commit(widgets.value.map((w) => (w.id === id ? { ...w, ...patch } : w)));
}

// Setas: trocam com o vizinho visível, mesmo que haja ocultos no meio
function move(id: WidgetId, delta: -1 | 1): void {
  const vis = visibleWidgets.value;
  const i = vis.findIndex((w) => w.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= vis.length) return;

  const list = [...widgets.value];
  const a = list.findIndex((w) => w.id === vis[i].id);
  const b = list.findIndex((w) => w.id === vis[j].id);
  [list[a], list[b]] = [list[b], list[a]];
  commit(list);
}

function resetLayout(): void {
  layout.value = DEFAULT_LAYOUT.map((w) => ({ ...w }));
}

function toggleEditing(): void {
  editing.value = !editing.value;
}

// Ao ocultar, o widget fica "solto" no lugar atual para sair sem puxar os vizinhos de uma vez
function onBeforeLeave(el: Element): void {
  const node = el as HTMLElement;
  node.style.left = `${node.offsetLeft}px`;
  node.style.top = `${node.offsetTop}px`;
  node.style.width = `${node.offsetWidth}px`;
  node.style.height = `${node.offsetHeight}px`;
}

// ===== Arrastar com eventos de ponteiro =====
const GHOST_MAX_W = 520;
const GHOST_MAX_H = 240;
const SWAP_LOCK_MS = 480; // dá tempo para a animação de troca terminar antes de testar outra troca
const EDGE = 90; // faixa perto da borda da janela que rola a página

let active = false;
let ghost: HTMLElement | null = null;
let grab = { x: 0, y: 0 };
let pointer = { x: 0, y: 0 };
let rafId = 0;
let lockUntil = 0;
let snapshot: WidgetConfig[] | null = null;

function gridEl(): HTMLElement | null {
  return (gridRef.value?.$el as HTMLElement | undefined) ?? null;
}

function sectionEl(id: WidgetId): HTMLElement | null {
  return gridEl()?.querySelector<HTMLElement>(`[data-widget-id="${id}"]`) ?? null;
}

function onPointerDown(e: PointerEvent, id: WidgetId): void {
  if (!editing.value || active || dragId.value) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;

  const el = sectionEl(id);
  if (!el) return;
  e.preventDefault();

  const rect = el.getBoundingClientRect();
  const w = Math.min(rect.width, GHOST_MAX_W);
  const h = Math.min(rect.height, GHOST_MAX_H);

  grab = {
    x: Math.min(Math.max(e.clientX - rect.left, 12), w - 12),
    y: Math.min(Math.max(e.clientY - rect.top, 12), h - 12),
  };
  pointer = { x: e.clientX, y: e.clientY };

  // Cópia flutuante que acompanha o ponteiro
  ghost = el.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('data-widget-id');
  Object.assign(ghost.style, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    margin: '0',
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    overflow: 'hidden',
    zIndex: '9999',
    pointerEvents: 'none',
    borderRadius: '1rem',
    background: 'var(--background)',
    opacity: '0.96',
    boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.35)',
    transform: `translate(${rect.left}px, ${rect.top}px) scale(1.01)`,
    transition:
      'width 420ms cubic-bezier(0.22, 1, 0.36, 1), height 420ms cubic-bezier(0.22, 1, 0.36, 1)',
    willChange: 'transform',
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(ghost);

  // No próximo quadro a cópia encolhe até o tamanho máximo
  requestAnimationFrame(() => {
    if (!ghost) return;
    ghost.style.width = `${w}px`;
    ghost.style.height = `${h}px`;
  });

  snapshot = widgets.value.map((x) => ({ ...x }));
  active = true;
  dragId.value = id;
  lockUntil = 0;

  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'grabbing';

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('keydown', onKeyDown);
  rafId = requestAnimationFrame(tick);
}

function onPointerMove(e: PointerEvent): void {
  if (!active || !ghost) return;
  pointer = { x: e.clientX, y: e.clientY };
  ghost.style.transform = `translate(${e.clientX - grab.x}px, ${e.clientY - grab.y}px) scale(1.01)`;
}

function onPointerUp(): void {
  finish(false);
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') finish(true);
}

// Um quadro por vez: rola a página perto das bordas e testa se deve trocar de lugar
function tick(): void {
  if (!active) return;

  if (pointer.y < EDGE) {
    window.scrollBy(0, -Math.ceil((EDGE - pointer.y) / 6));
  } else if (pointer.y > window.innerHeight - EDGE) {
    window.scrollBy(0, Math.ceil((pointer.y - (window.innerHeight - EDGE)) / 6));
  }

  if (performance.now() >= lockUntil) hitTest();
  rafId = requestAnimationFrame(tick);
}

function inside(r: DOMRect): boolean {
  return pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;
}

function hitTest(): void {
  const from = dragId.value;
  const grid = gridEl();
  if (!from || !grid) return;

  // Se o ponteiro ainda está sobre o espaço do próprio widget, não troca (evita vai e volta)
  const own = sectionEl(from);
  if (own && inside(own.getBoundingClientRect())) return;

  const els = grid.querySelectorAll<HTMLElement>('[data-widget-id]');
  for (const el of els) {
    const id = el.dataset.widgetId as WidgetId;
    if (id === from) continue;
    if (inside(el.getBoundingClientRect())) {
      reorder(from, id);
      lockUntil = performance.now() + SWAP_LOCK_MS;
      return;
    }
  }
}

// Arrastando para frente, entra depois do alvo. Arrastando para trás, entra antes
function reorder(fromId: WidgetId, targetId: WidgetId): void {
  const all = widgets.value;
  const fromIdx = all.findIndex((w) => w.id === fromId);
  const toIdx = all.findIndex((w) => w.id === targetId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

  const dragged = all[fromIdx];
  const list = all.filter((w) => w.id !== fromId);
  let index = list.findIndex((w) => w.id === targetId);
  if (fromIdx < toIdx) index += 1;

  list.splice(index, 0, dragged);
  commit(list);
}

function detach(): void {
  active = false;
  cancelAnimationFrame(rafId);
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
  window.removeEventListener('keydown', onKeyDown);
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
}

function finish(revert: boolean): void {
  if (!active) return;
  detach();

  if (revert && snapshot) commit(snapshot);
  snapshot = null;

  const node = ghost;
  ghost = null;
  const id = dragId.value;

  if (!node || !id) {
    node?.remove();
    dragId.value = null;
    return;
  }

  // Espera o DOM refletir o layout final e desliza a cópia até o lugar do widget
  nextTick(() => {
    const grid = gridEl();
    const target = sectionEl(id);
    if (grid && target) {
      const g = grid.getBoundingClientRect();
      node.style.transition =
        'transform 480ms cubic-bezier(0.22, 1, 0.36, 1), width 480ms cubic-bezier(0.22, 1, 0.36, 1), height 480ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 480ms ease';
      node.style.transform = `translate(${g.left + target.offsetLeft}px, ${g.top + target.offsetTop}px) scale(1)`;
      node.style.width = `${target.offsetWidth}px`;
      node.style.height = `${target.offsetHeight}px`;
      node.style.boxShadow = '0 0 0 rgba(0, 0, 0, 0)';
    }

    window.setTimeout(() => {
      node.remove();
      dragId.value = null;
    }, 500);
  });
}

onBeforeUnmount(() => {
  detach();
  ghost?.remove();
  ghost = null;
});

// ===== Classes de layout =====
function bodyClass(w: WidgetConfig): string {
  return w.dir === 'row' ? BODY_ROW : BODY_COL;
}

function itemClass(w: WidgetConfig): string {
  return w.dir === 'row' ? 'min-w-0 flex-1 basis-[12rem]' : 'min-w-0 w-full';
}

function legendClass(w: WidgetConfig): string {
  return w.dir === 'row' ? 'flex shrink-0 flex-col gap-2' : 'flex flex-wrap gap-x-4 gap-y-1';
}

// Filtra a lista e leva até ela
function go(f: Filter): void {
  filter.value = f;
  document.getElementById('tarefas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<style>
/* Entrada suave e escalonada dos widgets */
.dashboard-header {
  animation: dashboard-enter 850ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes dashboard-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.widget-move {
  transition: transform 650ms cubic-bezier(0.22, 1, 0.36, 1);
}

.widget-enter-active,
.widget-appear-active {
  transition:
    opacity 680ms ease,
    transform 760ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: calc(var(--widget-index, 0) * 100ms);
}

.widget-enter-from,
.widget-appear-from {
  opacity: 0;
  transform: scale(0.975) translateY(12px);
}

/* Os cartões ganham elevação sutil, borda azul e sombra ao passar o mouse */
.dashboard-card {
  position: relative;
  isolation: isolate;
  border-color: color-mix(in srgb, var(--border) 88%, rgb(59 130 246 / 28%));
  transition:
    border-color 380ms ease,
    box-shadow 420ms ease,
    background-color 380ms ease;
}

.dashboard-card:hover,
.dashboard-card:focus-within {
  border-color: color-mix(in srgb, var(--border) 58%, rgb(59 130 246 / 55%));
  box-shadow: 0 16px 38px -28px rgb(37 99 235 / 48%);
}

.dashboard-card::after {
  content: "";
  position: absolute;
  top: 0;
  left: -70%;
  z-index: 1;
  width: 48%;
  height: 2px;
  pointer-events: none;
  opacity: 0;
  background: linear-gradient(90deg, transparent, rgb(59 130 246 / 55%), transparent);
}

.dashboard-card:hover::after {
  left: 120%;
  opacity: 1;
  transition: left 900ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease;
}

/* Os indicadores aparecem em sequência depois que os dados carregam */
.dashboard-stat-shell {
  min-width: 0;
  animation: stat-enter 780ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--stat-index, 0) * 130ms);
  transition:
    transform 380ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 400ms ease;
}

.dashboard-stat-shell:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 22px -20px rgb(37 99 235 / 42%);
}

@keyframes stat-enter {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

/* Pequeno destaque de interação nos vencimentos */
.dashboard-upcoming-item {
  position: relative;
  overflow: hidden;
  transition:
    background-color 320ms ease,
    padding-left 320ms ease,
    color 320ms ease;
}

.dashboard-upcoming-item:hover {
  padding-left: 0.75rem;
}

.dashboard-upcoming-item::before {
  content: "";
  position: absolute;
  inset-block: 25%;
  left: 0;
  width: 2px;
  border-radius: 999px;
  background: var(--primary);
  opacity: 0;
  transform: scaleY(0.35);
  transition:
    opacity 350ms ease,
    transform 350ms cubic-bezier(0.22, 1, 0.36, 1);
}

.dashboard-upcoming-item:hover::before,
.dashboard-upcoming-item:focus-visible::before {
  opacity: 1;
  transform: scaleY(1);
}

/* Feedback de clique consistente, sem interferir em botões desabilitados */
.dashboard-motion button:not(:disabled) {
  transition:
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 300ms ease;
}

.dashboard-motion button:not(:disabled):active {
  transform: scale(0.97);
}

/* A dica de personalização e os widgets ocultos entram e saem suavemente */
.edit-hint-enter-active,
.edit-hint-leave-active {
  transition:
    opacity 350ms ease,
    transform 400ms cubic-bezier(0.22, 1, 0.36, 1);
}

.edit-hint-enter-from,
.edit-hint-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.hidden-widgets {
  animation: dashboard-enter 650ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* Ao ocultar, sai da grade para os vizinhos já começarem a deslizar */
.widget-leave-active {
  position: absolute;
  pointer-events: none;
  transition:
    opacity 350ms ease,
    transform 350ms cubic-bezier(0.22, 1, 0.36, 1);
}

.widget-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.empty-state {
  animation: empty-state-enter 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes empty-state-enter {
  from {
    opacity: 0;
    transform: translateY(4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {

  .dashboard-header,
  .dashboard-stat-shell,
  .hidden-widgets,
  .empty-state {
    animation: none !important;
  }

  .widget-move,
  .widget-enter-active,
  .widget-appear-active,
  .widget-leave-active,
  .edit-hint-enter-active,
  .edit-hint-leave-active,
  .dashboard-card,
  .dashboard-stat-shell,
  .dashboard-upcoming-item,
  .dashboard-upcoming-item::before,
  .dashboard-card::after,
  .dashboard-motion button:not(:disabled) {
    transition-duration: 1ms !important;
    transition-delay: 0ms !important;
  }

  .dashboard-stat-shell:hover,
  .dashboard-motion button:not(:disabled):active {
    transform: none !important;
    filter: none !important;
  }
}
</style>
