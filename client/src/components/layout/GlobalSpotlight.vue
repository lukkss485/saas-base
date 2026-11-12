
<template>
  <Teleport to="body">
    <Transition name="nt-spotlight">
      <div
        v-if="open"
        class="nt-spotlight-backdrop fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto p-3 sm:p-6"
        @click.self="emit('close')"
        @keydown.esc.stop.prevent="emit('close')"
      >
        <section
          class="relative my-auto w-full max-w-4xl overflow-visible rounded-[2rem] text-neutral-900 dark:text-neutral-100"
          role="dialog"
          aria-modal="true"
          aria-labelledby="nt-spotlight-title"
          aria-describedby="nt-spotlight-description"
        >
          <div class="px-4 pb-5 sm:px-7 sm:pb-6">

            <!-- Pesquisa -->
            <form
              class="nt-spotlight-searchbar"
              role="search"
              @submit.prevent="runSearch"
            >
              <Search class="size-5 shrink-0 text-muted-foreground" />

              <Input
                v-model="query"
                type="search"
                autocomplete="off"
                spellcheck="false"
                placeholder="Buscar em todo o NT-life..."
                aria-label="Pesquisar no NT-life"
                class="h-10 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent"
                @keydown.esc.stop.prevent="emit('close')"
                @keydown="handleSearchKeydown"
              />

              <Badge
                v-if="voiceState === 'listening'"
                variant="secondary"
                class="shrink-0 gap-1.5 rounded-full border-0 bg-blue-500/10 text-blue-600 dark:text-blue-300"
              >
                <span class="size-1.5 animate-pulse rounded-full bg-blue-500" />
                Ouvindo
              </Badge>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="nt-spotlight-mic shrink-0 rounded-full text-blue-500 hover:bg-blue-500/10"
                :class="{ 'is-listening': voiceState === 'listening' }"
                :aria-label="
                  voiceState === 'listening'
                    ? 'Parar de ouvir'
                    : 'Pesquisar por voz'
                "
                @click="
                  voiceState === 'listening'
                    ? stopVoice()
                    : openVoiceConsent()
                "
              >
                <component
                  :is="voiceState === 'listening' ? MicOff : Mic"
                  class="size-5"
                />
              </Button>

              <Button
                type="submit"
                size="icon"
                class="nt-spotlight-submit shrink-0 rounded-full"
                :disabled="!query.trim()"
                aria-label="Pesquisar"
              >
                <ArrowUp class="size-4" />
              </Button>
            </form>

            <!-- Consentimento de voz -->
            <Transition name="nt-spotlight-inline">
              <Card
                v-if="showVoiceConsent"
                class="mt-3 overflow-hidden rounded-2xl border-blue-500/20 bg-card shadow-sm"
              >
                <CardContent class="flex items-start gap-3 p-4">
                  <div
                    class="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-300"
                  >
                    <Mic class="size-5" />
                  </div>

                  <div class="min-w-0 flex-1">
                    <h3 class="text-sm font-semibold">
                      Permitir pesquisa por voz?
                    </h3>

                    <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
                      O microfone só será ativado depois da sua confirmação.
                      O navegador pode processar o áudio pelo serviço de
                      reconhecimento dele. O NT-life recebe o texto transcrito
                      para preencher a pesquisa; nada é enviado até você pesquisar.
                    </p>

                    <div class="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        class="rounded-full"
                        @click="confirmVoiceConsent"
                      >
                        <Mic class="mr-1.5 size-3.5" />
                        Permitir e continuar
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        class="rounded-full"
                        @click="showVoiceConsent = false"
                      >
                        Agora não
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Transition>

            <!-- Mensagens de voz -->
            <p
              v-if="voiceError"
              class="mt-2 text-xs text-destructive"
              role="status"
            >
              {{ voiceError }}
            </p>

            <p
              v-else-if="voiceState === 'done'"
              class="mt-2 text-xs text-emerald-600 dark:text-emerald-400"
              role="status"
            >
              Transcrição pronta. Revise o texto e pressione Enter para pesquisar.
            </p>

            <!-- Painel de resultados -->
            <Transition name="nt-spotlight-inline">
              <Card
                v-if="hasSearched"
                class="mt-4 overflow-hidden rounded-[29px] border-0 bg-card shadow-lg ring-1 ring-neutral-900/5 dark:ring-white/10"
              >
                <CardContent class="px-5 pb-5 pt-0.5">

                  <!-- Filtros -->
                  <div
                    class="mt-4 flex flex-wrap items-center gap-2"
                    aria-label="Filtros da pesquisa"
                  >

                    <!-- Data inicial -->
                    <div class="flex flex-col gap-1">
                      <Label class="px-1 text-[10px] text-muted-foreground">
                        De
                      </Label>

                      <DatePicker
                        v-model="startDate"
                        placeholder="Data inicial"
                        trigger-class="h-8 w-[145px] rounded-full"
                      />
                    </div>

                    <!-- Data final -->
                    <div class="flex flex-col gap-1">
                      <Label class="px-1 text-[10px] text-muted-foreground">
                        Até
                      </Label>

                      <DatePicker
                        v-model="endDate"
                        placeholder="Data final"
                        trigger-class="h-8 w-[145px] rounded-full"
                      />
                    </div>

                    <!-- Página atual -->
                    <div class="flex flex-col gap-1">
                      <Label class="px-1 text-[10px] text-muted-foreground">
                        Na página
                      </Label>

                      <div class="flex h-8 items-center gap-2 rounded-full border border-border bg-background/50 px-3">
                        <Switch
                          id="spotlight-current-page"
                          v-model:checked="onlyCurrentPage"
                          class="scale-90"
                        />

                        <Label
                          for="spotlight-current-page"
                          class="cursor-pointer text-xs font-medium"
                        >
                          {{ onlyCurrentPage ? 'Sim' : 'Não' }}
                        </Label>
                      </div>
                    </div>

                    <!-- Tipo -->
                    <div class="flex flex-col gap-1">
                      <Label class="px-1 text-[10px] text-muted-foreground">
                        Tipo
                      </Label>

                      <Select v-model="typeFilter">
                        <SelectTrigger class="h-8 w-[125px] rounded-full text-xs">
                          <SelectValue placeholder="Tudo" />
                        </SelectTrigger>

                        <SelectContent class="z-[150]">
                          <SelectItem value="all">
                            Tudo
                          </SelectItem>

                          <SelectItem value="task">
                            Tarefas
                          </SelectItem>

                          <SelectItem value="activity">
                            Atividades
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <!-- Status -->
                    <div class="flex flex-col gap-1">
                      <Label class="px-1 text-[10px] text-muted-foreground">
                        Status
                      </Label>

                      <Select v-model="statusFilter">
                        <SelectTrigger class="h-8 w-[125px] rounded-full text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>

                        <SelectContent class="z-[150]">
                          <SelectItem value="all">
                            Todos
                          </SelectItem>

                          <SelectItem value="open">
                            Em aberto
                          </SelectItem>

                          <SelectItem value="done">
                            Concluídos
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <!-- Prioridade -->
                    <div class="flex flex-col gap-1">
                      <Label class="px-1 text-[10px] text-muted-foreground">
                        Prioridade
                      </Label>

                      <Select v-model="priorityFilter">
                        <SelectTrigger class="h-8 w-[125px] rounded-full text-xs">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>

                        <SelectContent class="z-[150]">
                          <SelectItem value="all">
                            Todas
                          </SelectItem>

                          <SelectItem value="high">
                            Alta
                          </SelectItem>

                          <SelectItem value="medium">
                            Média
                          </SelectItem>

                          <SelectItem value="low">
                            Baixa
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <!-- Ordenação -->
                    <div class="flex flex-col gap-1">
                      <Label class="px-1 text-[10px] text-muted-foreground">
                        Ordenar
                      </Label>

                      <Select v-model="sortBy">
                        <SelectTrigger class="h-8 w-[135px] rounded-full text-xs">
                          <SelectValue placeholder="Recentes" />
                        </SelectTrigger>

                        <SelectContent class="z-[150]">
                          <SelectItem value="recent">
                            Recentes
                          </SelectItem>

                          <SelectItem value="oldest">
                            Antigos
                          </SelectItem>

                          <SelectItem value="title">
                            Nome A–Z
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <!-- Limpar filtros -->
                    <div class="flex flex-col gap-1">
                      <Label class="px-1 text-[10px] text-muted-foreground">
                        Ações
                      </Label>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        class="h-8 rounded-full px-3 text-xs"
                        @click="resetFilters"
                      >
                        <RotateCcw class="mr-1.5 size-3.5" />
                        Limpar
                      </Button>
                    </div>
                  </div>

                  <!-- Resultados -->
                  <Card
                    class="nt-spotlight-results mt-5 overflow-hidden rounded-2xl border-border/70 bg-background/50 shadow-none"
                  >
                    <CardHeader
                      class="flex flex-row items-center justify-between gap-3 space-y-0 px-4 py-3"
                    >
                      <div class="flex min-w-0 items-center gap-2">
                        <SlidersHorizontal
                          class="size-4 shrink-0 text-muted-foreground"
                        />

                        <CardTitle class="truncate text-sm font-semibold">
                          Resultados da pesquisa
                        </CardTitle>

                        <Badge
                          variant="secondary"
                          class="rounded-full tabular-nums"
                        >
                          {{ filteredResults.length }}
                        </Badge>
                      </div>

                      <span class="hidden text-[11px] text-muted-foreground sm:inline">
                        Enter para pesquisar · Esc para fechar
                      </span>
                    </CardHeader>

                    <Separator />

                    <!-- Lista de resultados -->
                    <ScrollArea
                      v-if="filteredResults.length"
                      class="h-[min(36vh,320px)] w-full"
                    >
                      <div class="space-y-1 p-2">
                        <Button
                          v-for="(item, index) in filteredResults"
                          :key="item.key"
                          type="button"
                          variant="ghost"
                          class="nt-spotlight-result group h-auto w-full justify-start gap-3 rounded-xl px-2.5 py-2.5 text-left"
                          :class="{
                            'is-active bg-accent': activeIndex === index
                          }"
                          :aria-selected="activeIndex === index"
                          @mouseenter="activeIndex = index"
                          @click="selectResult(item)"
                        >
                          <span
                            class="nt-result-icon shrink-0"
                            :class="
                              item.kind === 'task'
                                ? 'is-task'
                                : 'is-activity'
                            "
                          >
                            <ListTodo
                              v-if="item.kind === 'task'"
                              class="size-4"
                            />

                            <Activity
                              v-else
                              class="size-4"
                            />
                          </span>

                          <span class="min-w-0 flex-1 text-left">
                            <span class="block truncate text-sm font-medium">
                              {{ item.title }}
                            </span>

                            <span class="mt-0.5 block truncate text-xs text-muted-foreground">
                              {{ item.detail }}
                            </span>
                          </span>

                          <Badge
                            variant="secondary"
                            class="hidden shrink-0 rounded-full text-[10px] font-medium sm:inline-flex"
                            :class="item.badgeClass"
                          >
                            {{ item.badge }}
                          </Badge>

                          <span class="hidden shrink-0 text-[11px] text-muted-foreground md:inline">
                            {{ formatDate(item.timestamp) }}
                          </span>

                          <ArrowUpRight
                            class="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          />
                        </Button>
                      </div>
                    </ScrollArea>

                    <!-- Estado vazio -->
                    <CardContent
                      v-else
                      class="flex flex-col items-center justify-center px-5 py-10 text-center"
                    >
                      <div class="grid size-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
                        <Search class="size-5" />
                      </div>

                      <h4 class="mt-3 text-sm font-semibold">
                        Nenhum resultado encontrado
                      </h4>

                      <p class="mt-1 text-xs text-muted-foreground">
                        Tente outro termo ou ajuste os filtros.
                      </p>
                    </CardContent>
                  </Card>

                  <!-- Rodapé -->
                  <CardFooter
                    class="flex flex-wrap items-center justify-between gap-2 px-1 pb-0 pt-3 text-[10px] text-muted-foreground"
                  >
                    <span>
                      Fontes disponíveis: tarefas carregadas e atividades recentes.

                      <span v-if="onlyCurrentPage">
                        · {{ currentTitle }}
                      </span>.
                    </span>

                    <span class="flex items-center gap-1">
                      <kbd>↑</kbd>
                      <kbd>↓</kbd>
                      navegar
                      <kbd>Enter</kbd>
                      pesquisar
                      <kbd>Esc</kbd>
                      fechar
                    </span>
                  </CardFooter>
                </CardContent>
              </Card>
            </Transition>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue';

import {
  Activity,
  ArrowUp,
  ArrowUpRight,
  CalendarDays,
  ListTodo,
  Mic,
  MicOff,
  Search,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-vue-next';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import DatePicker from '@/components/DatePicker.vue';


/* =========================================
   TIPOS
========================================= */

interface SpeechAlternativeLike {
  transcript: string;
}

interface SpeechResultLike extends ArrayLike<SpeechAlternativeLike> {
  isFinal?: boolean;
}

interface SpeechEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechResultLike>;
}

interface SpeechErrorLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: SpeechErrorLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type ResultKind = 'task' | 'activity';

type SearchResult = {
  key: string;
  title: string;
  detail: string;
  kind: ResultKind;
  status: 'open' | 'done' | 'activity';
  priority: 'high' | 'medium' | 'low' | 'none';
  timestamp: number | null;
  href: string;
  badge: string;
  badgeClass: string;
};

type LooseRecord = Record<string, unknown>;


/* =========================================
   PROPS E EVENTOS
========================================= */

const props = withDefaults(
  defineProps<{
    open: boolean;
    tasks?: unknown[];
    events?: unknown[];
    currentPath?: string;
    currentTitle?: string;
  }>(),
  {
    tasks: () => [],
    events: () => [],
    currentPath: '/',
    currentTitle: 'Página atual',
  },
);

const emit = defineEmits<{
  close: [];
  search: [query: string];
  select: [result: { href: string }];
}>();


/* =========================================
   ESTADOS
========================================= */

const query = ref('');
const hasSearched = ref(false);

const onlyCurrentPage = ref(false);

const typeFilter = ref<'all' | ResultKind>('all');

const statusFilter = ref<'all' | 'open' | 'done'>('all');

const priorityFilter = ref<'all' | 'high' | 'medium' | 'low'>('all');

const sortBy = ref<'recent' | 'oldest' | 'title'>('recent');

const activeIndex = ref(-1);

const showVoiceConsent = ref(false);

const voiceState = ref<'idle' | 'listening' | 'done'>('idle');

const voiceError = ref('');

const searchInput = ref<HTMLInputElement | null>(null);

let recognition: SpeechRecognitionLike | null = null;

let transcriptBeforeListening = '';


/* =========================================
   DATE PICKERS
========================================= */

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);

  return localDateString(date);
}

const todayDate = localDateString(new Date());

const startDate = ref(getDefaultStartDate());

const endDate = ref(todayDate);


/* =========================================
   UTILITÁRIOS
========================================= */

function record(value: unknown): LooseRecord {
  return value && typeof value === 'object'
    ? value as LooseRecord
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

function timestampFrom(value: unknown): number | null {
  const raw = stringValue(value);

  if (!raw) return null;

  const parsed = Date.parse(raw);

  return Number.isFinite(parsed) ? parsed : null;
}

function dateBoundary(
  value: string,
  endOfDay = false,
): number | null {
  if (!value) return null;

  const parts = value.split('-').map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }

  const [year, month, day] = parts;

  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);

  return Number.isNaN(date.getTime())
    ? null
    : date.getTime();
}

function normalizePriority(
  value: unknown,
): SearchResult['priority'] {
  const priority = stringValue(value).toLocaleLowerCase('pt-BR');

  if (['high', 'alta', 'urgent', 'urgente'].includes(priority)) {
    return 'high';
  }

  if (['medium', 'media', 'média', 'normal'].includes(priority)) {
    return 'medium';
  }

  if (['low', 'baixa'].includes(priority)) {
    return 'low';
  }

  return 'none';
}


/* =========================================
   NORMALIZAÇÃO DOS RESULTADOS
========================================= */

const allResults = computed<SearchResult[]>(() => {
  const taskResults: SearchResult[] = props.tasks.flatMap(
    (value, index) => {
      const item = record(value);

      const title = stringValue(
        item.title || item.name,
      ).trim();

      if (!title) return [];

      const done = Boolean(
        item.done ??
        item.completed ??
        item.is_completed,
      );

      const description = stringValue(
        item.description ||
        item.notes ||
        item.project_name,
      );

      const timestamp = timestampFrom(
        item.updated_at ||
        item.created_at ||
        item.due_date,
      );

      return [
        {
          key: `task-${stringValue(item.id) || index}`,
          title,
          detail: ['Tarefa', description]
            .filter(Boolean)
            .join(' · '),
          kind: 'task',
          status: done ? 'done' : 'open',
          priority: normalizePriority(item.priority),
          timestamp,
          href: '/tasks',
          badge: done ? 'Concluída' : 'Em aberto',
          badgeClass: done
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
            : 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
        },
      ];
    },
  );

  const eventResults: SearchResult[] = props.events.flatMap(
    (value, index) => {
      const item = record(value);

      const title = stringValue(item.title).trim();

      if (!title) return [];

      const createdAt = timestampFrom(item.created_at);

      const kind = stringValue(item.kind)
        .toLocaleLowerCase('pt-BR');

      const eventLabel: Record<string, string> = {
        created: 'Nova tarefa',
        completed: 'Tarefa concluída',
        reopened: 'Tarefa reaberta',
        edited: 'Tarefa editada',
        deleted: 'Tarefa excluída',
      };

      return [
        {
          key: `activity-${stringValue(item.id) || index}`,
          title,
          detail: eventLabel[kind] || 'Atividade',
          kind: 'activity',
          status: 'activity',
          priority: 'none',
          timestamp: createdAt,
          href: '/notifications',
          badge: 'Atividade',
          badgeClass:
            'bg-violet-500/10 text-violet-700 dark:text-violet-300',
        },
      ];
    },
  );

  return [...taskResults, ...eventResults];
});


/* =========================================
   FILTROS
========================================= */

const filteredResults = computed(() => {
  const term = query.value
    .trim()
    .toLocaleLowerCase('pt-BR');

  const startTimestamp = dateBoundary(startDate.value);

  const endTimestamp = dateBoundary(endDate.value, true);

  const results = allResults.value.filter((item) => {
    const searchable = `${item.title} ${item.detail}`
      .toLocaleLowerCase('pt-BR');

    if (term && !searchable.includes(term)) {
      return false;
    }

    if (
      item.timestamp !== null &&
      startTimestamp !== null &&
      item.timestamp < startTimestamp
    ) {
      return false;
    }

    if (
      item.timestamp !== null &&
      endTimestamp !== null &&
      item.timestamp > endTimestamp
    ) {
      return false;
    }

    if (
      typeFilter.value !== 'all' &&
      item.kind !== typeFilter.value
    ) {
      return false;
    }

    if (
      statusFilter.value !== 'all' &&
      item.status !== statusFilter.value
    ) {
      return false;
    }

    if (
      priorityFilter.value !== 'all' &&
      item.priority !== priorityFilter.value
    ) {
      return false;
    }

    if (
      onlyCurrentPage.value &&
      item.href !== props.currentPath
    ) {
      return false;
    }

    return true;
  });

  if (sortBy.value === 'title') {
    return results.sort((a, b) =>
      a.title.localeCompare(b.title, 'pt-BR'),
    );
  }

  if (sortBy.value === 'oldest') {
    return results.sort(
      (a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0),
    );
  }

  return results.sort(
    (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0),
  );
});


/* =========================================
   FORMATAÇÃO
========================================= */

function formatDate(timestamp: number | null): string {
  if (!timestamp) {
    return 'Data indisponível';
  }

  const date = new Date(timestamp);

  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return 'Hoje';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}


/* =========================================
   PESQUISA
========================================= */

function runSearch(): void {
  const value = query.value.trim();

  if (!value) {
    hasSearched.value = false;
    return;
  }

  hasSearched.value = true;
  activeIndex.value = -1;

  emit('search', value);
}

function selectResult(item: SearchResult): void {
  emit('select', {
    href: item.href,
  });
}

function resetFilters(): void {
  startDate.value = getDefaultStartDate();
  endDate.value = localDateString(new Date());

  onlyCurrentPage.value = false;
  typeFilter.value = 'all';
  statusFilter.value = 'all';
  priorityFilter.value = 'all';
  sortBy.value = 'recent';
}


/* =========================================
   TECLADO
========================================= */

function handleSearchKeydown(event: KeyboardEvent): void {
  if (
    event.key === 'ArrowDown' &&
    filteredResults.value.length
  ) {
    event.preventDefault();

    activeIndex.value = Math.min(
      activeIndex.value + 1,
      filteredResults.value.length - 1,
    );
  } else if (
    event.key === 'ArrowUp' &&
    filteredResults.value.length
  ) {
    event.preventDefault();

    activeIndex.value =
      activeIndex.value <= 0
        ? 0
        : activeIndex.value - 1;
  } else if (
    event.key === 'Enter' &&
    activeIndex.value >= 0 &&
    filteredResults.value[activeIndex.value]
  ) {
    event.preventDefault();

    selectResult(filteredResults.value[activeIndex.value]);
  }
}


/* =========================================
   WATCHERS
========================================= */

watch(filteredResults, () => {
  activeIndex.value = -1;
});

watch(query, (value) => {
  if (!value.trim()) {
    hasSearched.value = false;
    activeIndex.value = -1;
  }
});


/* =========================================
   VOZ
========================================= */

function openVoiceConsent(): void {
  voiceError.value = '';
  showVoiceConsent.value = true;
}

function confirmVoiceConsent(): void {
  showVoiceConsent.value = false;
  startVoice();
}

function startVoice(): void {
  const speechWindow = window as SpeechWindow;

  const SpeechRecognition =
    speechWindow.SpeechRecognition ||
    speechWindow.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voiceError.value =
      'Este navegador não oferece reconhecimento de voz. Você ainda pode digitar sua pesquisa.';

    return;
  }

  try {
    const instance = new SpeechRecognition();

    recognition = instance;

    transcriptBeforeListening = query.value.trim();

    instance.lang = 'pt-BR';
    instance.interimResults = true;
    instance.continuous = false;

    voiceState.value = 'listening';
    voiceError.value = '';

    instance.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (
        let index = 0;
        index < event.results.length;
        index += 1
      ) {
        const transcript =
          event.results[index]?.[0]?.transcript || '';

        if (event.results[index]?.isFinal) {
          finalText += `${transcript} `;
        } else {
          interimText += `${transcript} `;
        }
      }

      const recognized =
        `${finalText}${interimText}`.trim();

      query.value = [
        transcriptBeforeListening,
        recognized,
      ]
        .filter(Boolean)
        .join(' ')
        .trim();
    };

    instance.onerror = (event) => {
      voiceState.value = 'idle';

      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed'
      ) {
        voiceError.value =
          'A permissão do microfone foi negada. Libere o microfone nas permissões do navegador para tentar novamente.';
      } else if (event.error === 'no-speech') {
        voiceError.value =
          'Não detectei fala. Tente novamente em um local mais silencioso.';
      } else {
        voiceError.value =
          'Não foi possível transcrever agora. Tente novamente ou digite sua pesquisa.';
      }

      recognition = null;
    };

    instance.onend = () => {
      if (voiceState.value === 'listening') {
        voiceState.value = 'done';
      }

      recognition = null;
    };

    instance.start();
  } catch {
    voiceState.value = 'idle';

    voiceError.value =
      'Não foi possível iniciar o microfone neste momento.';

    recognition = null;
  }
}

function stopVoice(): void {
  if (!recognition) {
    voiceState.value = 'idle';
    return;
  }

  try {
    recognition.stop();
  } catch {
    /* O reconhecimento pode já ter terminado. */
  }
}

function stopVoiceImmediately(): void {
  if (recognition) {
    try {
      recognition.abort();
    } catch {
      /* Já encerrado. */
    }

    recognition = null;
  }

  voiceState.value = 'idle';
}


/* =========================================
   ABERTURA E FECHAMENTO
========================================= */

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      showVoiceConsent.value = false;
      voiceError.value = '';
      voiceState.value = 'idle';

      hasSearched.value = false;

      await nextTick();

      document
        .querySelector<HTMLInputElement>(
          '.nt-spotlight-searchbar input',
        )
        ?.focus();
    } else {
      stopVoiceImmediately();

      showVoiceConsent.value = false;

      hasSearched.value = false;
    }
  },
);

onBeforeUnmount(stopVoiceImmediately);
</script>

<style>
/* Fundo */
.nt-spotlight-backdrop {
  background: rgb(12 15 22 / 0.44);
  -webkit-backdrop-filter: blur(10px) saturate(125%);
  backdrop-filter: blur(10px) saturate(125%);
}

.dark .nt-spotlight-backdrop {
  background: rgb(0 0 0 / 0.52);
}

/* Barra de pesquisa */
.nt-spotlight-searchbar {
  display: flex;
  min-height: 58px;
  align-items: center;
  gap: 12px;
  padding: 7px 8px 7px 18px;
  border: 1px solid rgb(148 163 184 / .34);
  border-radius: 999px;
  background: rgb(255 255 255 / .66);
  box-shadow:
    inset 0 1px 1px rgb(255 255 255 / .8),
    0 8px 28px rgb(15 23 42 / .06);
  transition:
    border-color 220ms ease,
    box-shadow 220ms ease,
    background 220ms ease;
}

.dark .nt-spotlight-searchbar {
  border-color: rgb(255 255 255 / .13);
  background: rgb(20 22 30 / .66);
  box-shadow:
    inset 0 1px 1px rgb(255 255 255 / .07),
    0 8px 28px rgb(0 0 0 / .18);
}

.nt-spotlight-searchbar:focus-within {
  border-color: rgb(112 130 255 / .68);
  box-shadow:
    0 0 0 4px rgb(112 130 255 / .12),
    0 12px 32px rgb(45 60 130 / .12);
}

/* Microfone */
.nt-spotlight-mic,
.nt-spotlight-submit {
  transition:
    transform 180ms ease,
    background-color 180ms ease,
    box-shadow 180ms ease;
}

.nt-spotlight-mic.is-listening {
  color: white;
  background: linear-gradient(135deg, #5479ff, #a65ce9);
  box-shadow:
    0 0 0 5px rgb(105 125 255 / .14),
    0 0 24px rgb(105 125 255 / .42);
  animation: nt-mic-pulse 1.15s ease-in-out infinite;
}

/* Resultados */
.nt-spotlight-result {
  transition:
    background 160ms ease,
    transform 160ms ease;
}

.nt-spotlight-result:hover,
.nt-spotlight-result:focus-visible {
  outline: none;
  transform: translateX(2px);
}

.nt-result-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 11px;
}

.nt-result-icon.is-task {
  color: #5277ef;
  background: rgb(82 119 239 / .12);
}

.nt-result-icon.is-activity {
  color: #9a64d8;
  background: rgb(154 100 216 / .12);
}

/* Atalhos */
.nt-spotlight-results kbd,
.nt-spotlight-backdrop footer kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 19px;
  border: 1px solid rgb(148 163 184 / .27);
  border-radius: 5px;
  padding: 0 4px;
  font-size: 10px;
}

/* Animação de entrada do Spotlight */
.nt-spotlight-enter-active,
.nt-spotlight-leave-active {
  transition:
    opacity 240ms ease,
    backdrop-filter 300ms ease;
}

.nt-spotlight-enter-from,
.nt-spotlight-leave-to {
  opacity: 0;
}

/* Animação dos painéis */
.nt-spotlight-inline-enter-active,
.nt-spotlight-inline-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms cubic-bezier(.2, .8, .2, 1);
}

.nt-spotlight-inline-enter-from,
.nt-spotlight-inline-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(.99);
}

/* Pulsação do microfone */
@keyframes nt-mic-pulse {
  0%, 100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.045);
  }
}

/* Acessibilidade */
@media (prefers-reduced-motion: reduce) {
  .nt-spotlight-mic {
    animation: none !important;
  }

  .nt-spotlight-enter-active,
  .nt-spotlight-leave-active,
  .nt-spotlight-inline-enter-active,
  .nt-spotlight-inline-leave-active {
    transition-duration: 1ms !important;
  }
}
</style>
