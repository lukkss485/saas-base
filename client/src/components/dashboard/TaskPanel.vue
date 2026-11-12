<template>
  <TooltipProvider>
    <Card id="tarefas" class="scroll-mt-6 overflow-hidden">
      <CardHeader class="gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Minhas tarefas</CardTitle>
            <CardDescription>
              <Transition name="nt-roll" mode="out-in">
                <span :key="`${visible.length}-${tasks.length}`">
                  {{ visible.length }} de {{ tasks.length }} exibidas
                </span>
              </Transition>
              <span v-if="limit"> · {{ tasks.length }}/{{ limit }} no plano Free</span>
            </CardDescription>
          </div>

          <div class="flex w-full items-center gap-2 sm:w-auto">
            <Input
              id="task-search"
              v-model="query"
              placeholder="Buscar (/)"
              class="transition-all duration-200 sm:w-60"
              @keydown.esc="query = ''"
            />
            <Select :model-value="sort" @update:model-value="(v) => (sort = v as SortKey)">
              <SelectTrigger class="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent class="w-full">
                <SelectItem value="recent">Mais recentes</SelectItem> 
                <SelectItem value="due">Vencimento</SelectItem>
                <SelectItem value="priority">Prioridade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Filtros: usa o Tabs compartilhado, com indicador Liquid Glass centralizado -->
        <Tabs v-model="filter" class="w-full sm:w-fit">
          <TabsList
            aria-label="Filtrar tarefas"
            class="grid w-full grid-cols-4 gap-1 p-1 sm:flex sm:w-fit sm:flex-nowrap"
          >
            <TabsTrigger
              v-for="f in FILTERS"
              :key="f.key"
              :value="f.key"
              class="min-w-0 gap-1 px-1 text-xs sm:gap-2 sm:px-3 sm:text-sm"
            >
              <span class="truncate leading-none">{{ f.label }}</span>
              <span
                class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center overflow-hidden rounded-full px-1.5 text-xs leading-none tabular-nums transition-colors duration-300"
                :class="filter === f.key ? 'bg-muted text-foreground' : 'bg-background/60 text-muted-foreground'"
              >
                <Transition name="nt-roll" mode="out-in">
                  <span :key="counts[f.key]" class="inline-block">{{ counts[f.key] }}</span>
                </Transition>
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent class="space-y-4">
        <!-- Nova tarefa -->
        <form class="grid gap-2 sm:grid-cols-[1fr_8rem_10rem_auto]" @submit.prevent="add">
          <Input
            id="task-new"
            v-model="draft"
            maxlength="200"
            placeholder="Nova tarefa (n)"
            class="transition-all duration-200"
            :disabled="limitReached || creating"
          />

          <Select
            :model-value="draftPriority"
            :disabled="limitReached"
            class="w-full"
            @update:model-value="(v) => (draftPriority = v as Priority)"
          >
            <SelectTrigger class="w-full transition-all duration-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent class="w-full">
              <SelectItem v-for="p in PRIORITY_OPTIONS" :key="p.value" :value="p.value">
                {{ p.label }}
              </SelectItem>
            </SelectContent>
          </Select>

          <DatePicker v-model="draftDue" placeholder="Vencimento" :disabled="limitReached" trigger-class="w-full" />

          <Button type="submit" class="transition-all duration-200" :disabled="!draft.trim() || limitReached || creating">
            <Plus class="h-4 w-4" />
            <Transition name="nt-roll" mode="out-in">
              <span :key="creating ? 'loading' : 'idle'">{{ creating ? 'Adicionando...' : 'Adicionar' }}</span>
            </Transition>
          </Button>
        </form>

        <Transition name="nt-fade-up">
          <p v-if="limitReached" class="text-sm text-muted-foreground">
            Limite do plano Free atingido.
            <RouterLink to="/billing" class="font-medium text-primary underline-offset-4 hover:underline">
              Assine o Pro
            </RouterLink>
            para continuar.
          </p>
        </Transition>

        <!-- Lista -->
        <TransitionGroup tag="ul" name="nt-list" class="relative">
          <li
            v-for="t in visible"
            :key="t.id"
            class="group flex items-center gap-3 rounded-xl border-b px-2 py-3 transition-colors duration-200 last:border-0 hover:bg-muted/60"
            :class="busy.has(t.id) ? 'animate-pulse' : ''"
          >
            <Checkbox
              class="nt-check transition-all duration-200"
              :model-value="t.done"
              :disabled="busy.has(t.id)"  
              :aria-label="`Concluir ${t.title}`"
              @update:model-value="toggle(t)"
            />

            <div class="min-w-0 flex-1">
              <Input
                v-if="editingId === t.id"
                :id="`task-edit-${t.id}`"
                v-model="editTitle"
                maxlength="200"
                class="h-8 transition-all duration-200"
                @keydown.enter.prevent="saveEdit(t)"
                @keydown.esc="editingId = null"
                @blur="saveEdit(t)"
              />
              <p
                v-else
                class="cursor-text truncate text-sm"
                title="Duplo clique para editar"
                @dblclick="startEdit(t)"
              >
                <span class="nt-done" :class="{ 'nt-done-on': t.done }">{{ t.title }}</span>
              </p>

              <div class="mt-1 flex flex-wrap items-center gap-2">
                <Transition name="nt-roll" mode="out-in">
                  <Badge :key="t.priority" :variant="PRIORITY_VARIANT[t.priority]">
                    {{ PRIORITY_LABEL[t.priority] }}
                  </Badge>
                </Transition>
                <span v-if="t.due_date" class="text-xs transition-colors duration-300" :class="dueClass(t)">
                  {{ dueLabel(t.due_date).text }}
                </span>
              </div>
            </div>

            <div class="hidden md:block">
              <Select :model-value="t.priority" @update:model-value="(v) => setPriority(t, v as Priority)">
                <SelectTrigger class="h-8 w-28 text-xs transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="p in PRIORITY_OPTIONS" :key="p.value" :value="p.value">
                    {{ p.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              type="date"
              class="hidden h-8 w-36 transition-all duration-200 md:block"
              :model-value="t.due_date ?? ''"
              @update:model-value="(v) => setDue(t, String(v))"
            />

            <Tooltip>
              <TooltipTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon"
                  class="scale-75 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 focus-visible:scale-100 focus-visible:opacity-100 hover:text-destructive"
                  :aria-label="`Excluir ${t.title}`"
                  @click="remove(t)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir</TooltipContent>
            </Tooltip>
          </li>
        </TransitionGroup>

        <Transition name="nt-fade-up">
          <p v-if="!visible.length" class="py-10 text-center text-sm text-muted-foreground">
            {{ emptyText }}
          </p>
        </Transition>
      </CardContent>
    </Card>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { globalSearch as query } from '@/lib/ui';
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { refDebounced, useEventListener } from '@vueuse/core';
import { toast } from 'vue-sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DatePicker from '@/components/DatePicker.vue';
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from '@/queries/tasks';
import { dueLabel, DUE_CLASS, isOverdue, PRIORITY_LABEL } from '@/lib/format';
import type { Filter, Priority, Task } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2 } from 'lucide-vue-next';

type SortKey = 'recent' | 'due' | 'priority';

const filter = defineModel<Filter>('filter', { default: 'todas' });

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendentes', label: 'Pendentes' },
  { key: 'concluidas', label: 'Concluídas' },
  { key: 'atrasadas', label: 'Atrasadas' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
];

const PRIORITY_ORDER: Record<Priority, number> = { alta: 0, media: 1, baixa: 2 };
const PRIORITY_VARIANT: Record<Priority, 'destructive' | 'secondary' | 'outline'> = {
  alta: 'destructive',
  media: 'secondary',
  baixa: 'outline',
};
const UNDO_MS = 5000;

// ===== Dados e mutações (TanStack Query) =====
const tasksQuery = useTasks();
const createTask = useCreateTask();
const updateTask = useUpdateTask();
const deleteTask = useDeleteTask();

const tasks = computed<Task[]>(() => tasksQuery.data.value?.tasks ?? []);
const limit = computed(() => tasksQuery.data.value?.limit ?? null);
const limitReached = computed(() => limit.value !== null && tasks.value.length >= limit.value);

// ===== Busca e ordenação =====
const debouncedQuery = refDebounced(query, 200);
const sort = ref<SortKey>('recent');

// ===== Formulário de nova tarefa =====
const draft = ref('');
const draftPriority = ref<Priority>('media');
const draftDue = ref('');
const creating = ref(false);

// ===== Edição inline =====
const editingId = ref<number | null>(null);
const editTitle = ref('');

const busy = ref<Set<number>>(new Set());

// ===== Exclusões esperando o "Desfazer" =====
const hidden = ref<Set<number>>(new Set());
const pendingDelete = new Map<number, ReturnType<typeof setTimeout>>();

// ===== Contagens e lista visível =====
const counts = computed(() => ({
  todas: tasks.value.length,
  pendentes: tasks.value.filter((t) => !t.done).length,
  concluidas: tasks.value.filter((t) => t.done).length,
  atrasadas: tasks.value.filter(isOverdue).length,
}));

const visible = computed(() => {
  const q = debouncedQuery.value.trim().toLowerCase();
  let list = tasks.value.filter((t) => !hidden.value.has(t.id));

  if (filter.value === 'pendentes') list = list.filter((t) => !t.done);
  else if (filter.value === 'concluidas') list = list.filter((t) => t.done);
  else if (filter.value === 'atrasadas') list = list.filter(isOverdue);

  if (q) list = list.filter((t) => t.title.toLowerCase().includes(q));

  return [...list].sort((a, b) => {
    if (sort.value === 'due') return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');
    if (sort.value === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return b.created_at.localeCompare(a.created_at);
  });
});

const emptyText = computed(() => {
  if (debouncedQuery.value) return `Nenhuma tarefa encontrada para "${debouncedQuery.value}".`;
  if (filter.value !== 'todas') return 'Nada aqui neste filtro.';
  return 'Nenhuma tarefa ainda. Adicione a primeira acima.';
});

// ===== Utilitários =====
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Algo deu errado';
}

function setBusy(id: number, on: boolean): void {
  const next = new Set(busy.value);
  if (on) next.add(id);
  else next.delete(id);
  busy.value = next;
}

function dueClass(t: Task): string {
  if (t.done || !t.due_date) return 'text-muted-foreground';
  return DUE_CLASS[dueLabel(t.due_date).tone];
}

// ===== Ações das tarefas =====
async function add(): Promise<void> {
  const title = draft.value.trim();
  if (!title || limitReached.value || creating.value) return;

  creating.value = true;
  try {
    await createTask.mutateAsync({
      title,
      priority: draftPriority.value,
      due_date: draftDue.value || null,
    });
    draft.value = '';
    draftDue.value = '';
    toast.success('Tarefa criada');
  } catch (e) {
    toast.error(errMsg(e));
  } finally {
    creating.value = false;
  }
}

async function toggle(t: Task): Promise<void> {
  if (busy.value.has(t.id)) return;
  const done = !t.done;
  setBusy(t.id, true);
  try {
    await updateTask.mutateAsync({ id: t.id, body: { done } });
    toast(done ? `Concluída: ${t.title}` : `Reaberta: ${t.title}`, {
      action: {
        label: 'Desfazer',
        onClick: () => updateTask.mutate({ id: t.id, body: { done: !done } }),
      },
    });
  } catch (e) {
    toast.error(errMsg(e));
  } finally {
    setBusy(t.id, false);
  }
}

function startEdit(t: Task): void {
  editingId.value = t.id;
  editTitle.value = t.title;
  nextTick(() => {
    const el = document.getElementById(`task-edit-${t.id}`) as HTMLInputElement | null;
    el?.focus();
    el?.select();
  });
}

function saveEdit(t: Task): void {
  if (editingId.value !== t.id) return;
  const title = editTitle.value.trim();
  editingId.value = null;
  if (!title || title === t.title) return;
  updateTask.mutate({ id: t.id, body: { title } }, { onError: (e) => toast.error(errMsg(e)) });
}

function setPriority(t: Task, priority: Priority): void {
  if (priority === t.priority) return;
  updateTask.mutate({ id: t.id, body: { priority } }, { onError: (e) => toast.error(errMsg(e)) });
}

function setDue(t: Task, value: string): void {
  const due_date = value || null;
  if (due_date === t.due_date) return;
  updateTask.mutate({ id: t.id, body: { due_date } }, { onError: (e) => toast.error(errMsg(e)) });
}

function restoreVisible(id: number): void {
  const next = new Set(hidden.value);
  next.delete(id);
  hidden.value = next;
}

function commitDelete(id: number): void {
  pendingDelete.delete(id);
  deleteTask.mutate(id, {
    onError: (e) => {
      restoreVisible(id);
      toast.error(errMsg(e));
    },
  });
}

function remove(t: Task): void {
  if (pendingDelete.has(t.id)) return;

  hidden.value = new Set([...hidden.value, t.id]);
  const timer = setTimeout(() => commitDelete(t.id), UNDO_MS);
  pendingDelete.set(t.id, timer);

  toast('Tarefa excluída', {
    duration: UNDO_MS,
    action: {
      label: 'Desfazer',
      onClick: () => {
        clearTimeout(pendingDelete.get(t.id));
        pendingDelete.delete(t.id);
        restoreVisible(t.id);
      },
    },
  });
}

// ===== Atalhos =====
useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key.toLowerCase() === 'n') {
    e.preventDefault();
    document.getElementById('task-new')?.focus();
  }
});

onBeforeUnmount(() => {
  for (const [id, timer] of pendingDelete) {
    clearTimeout(timer);
    commitDelete(id);
  }
});
</script>

<style>
/* ===== Contadores: o número antigo sobe e o novo entra por baixo ===== */
.nt-roll-enter-active,
.nt-roll-leave-active {
  transition:
    transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 240ms ease;
}

.nt-roll-enter-from {
  transform: translateY(80%);
  opacity: 0;
}

.nt-roll-leave-to {
  transform: translateY(-80%);
  opacity: 0;
}

/* ===== Lista de tarefas ===== */
@keyframes nt-row-in {
  0% {
    opacity: 0;
    transform: translateY(-12px) scale(0.98);
    background-color: rgba(37, 99, 235, 0.12);
  }

  60% {
    opacity: 1;
  }

  100% {
    opacity: 1;
    transform: none;
    background-color: transparent;
  }
}

/* Entrada com um leve destaque azul */
.nt-list-enter-active {
  animation: nt-row-in 520ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* Saída para a direita; fica absoluta para não travar as outras linhas */
.nt-list-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  transition:
    opacity 220ms ease,
    transform 280ms cubic-bezier(0.4, 0, 1, 1);
}

.nt-list-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.97);
}

/* Reordenação (filtro, busca, ordenação) */
.nt-list-move {
  transition: transform 480ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* ===== Título concluído: o traço se desenha da esquerda para a direita ===== */
.nt-done {
  background-image: linear-gradient(currentColor, currentColor);
  background-repeat: no-repeat;
  background-position: 0 55%;
  background-size: 0% 1.5px;
  transition:
    background-size 460ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 300ms ease;
}

.nt-done-on {
  background-size: 100% 1.5px;
  opacity: 0.55;
}

/* ===== Avisos e estado vazio ===== */
.nt-fade-up-enter-active,
.nt-fade-up-leave-active {
  transition:
    opacity 300ms ease,
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.nt-fade-up-enter-from,
.nt-fade-up-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* Quem desativou animações no sistema não vê movimento */
@media (prefers-reduced-motion: reduce) {
  .nt-roll-enter-active,
  .nt-roll-leave-active,
  .nt-list-enter-active,
  .nt-list-leave-active,
  .nt-list-move,
  .nt-done,
  .nt-fade-up-enter-active,
  .nt-fade-up-leave-active {
    animation: none !important;
    transition-duration: 1ms !important;
  }
}
</style>