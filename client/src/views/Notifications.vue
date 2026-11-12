<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Notificações</h1>
        <p class="mt-1 text-muted-foreground">
          {{ unreadCount ? `${unreadCount} não ${unreadCount === 1 ? 'lida' : 'lidas'}` : 'Tudo em dia' }}
        </p>
      </div>
      <Button variant="outline" :disabled="!unreadCount" @click="markAllRead">
        <CheckCheck class="h-4 w-4" />
        Marcar todas como lidas
      </Button>
    </header>

    <div class="flex flex-wrap gap-2">
      <Button
        v-for="f in FILTERS"
        :key="f.key"
        size="sm"
        :variant="filter === f.key ? 'default' : 'outline'"
        @click="filter = f.key"
      >
        {{ f.label }}
      </Button>
    </div>

    <Card>
      <CardContent class="p-0">
        <template v-for="group in groups" :key="group.label">
          <p class="border-b bg-muted/40 px-5 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {{ group.label }}
          </p>
          <ul class="divide-y">
            <li v-for="e in group.items" :key="e.id" class="flex items-start gap-3 px-5 py-3">
              <span class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg" :class="META[e.kind].tone">
                <component :is="META[e.kind].icon" class="h-4 w-4" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium">{{ KIND_LABEL[e.kind] }}</p>
                <p class="truncate text-sm text-muted-foreground">{{ e.title }}</p>
              </div>
              <div class="flex shrink-0 flex-col items-end gap-1">
                <span class="text-xs text-muted-foreground">{{ timeAgo(e.created_at) }}</span>
                <span v-if="isUnread(e)" class="h-2 w-2 rounded-full bg-red-500" aria-label="não lida" />
              </div>
            </li>
          </ul>
        </template>

        <p v-if="!groups.length" class="py-16 text-center text-sm text-muted-foreground">
          Nenhuma notificação por aqui.
        </p>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from 'vue';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { timeAgo } from '@/lib/format';
import { lastSeen } from '@/lib/notify';
import type { ActivityEvent, EventKind } from '@/lib/types';
import { useNotifications } from '@/queries/extra';
import { CheckCheck, CheckCircle2, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-vue-next';

const KIND_LABEL: Record<EventKind, string> = {
  created: 'Nova tarefa',
  completed: 'Tarefa concluída',
  reopened: 'Tarefa reaberta',
  edited: 'Tarefa editada',
  deleted: 'Tarefa excluída',
};

const META: Record<EventKind, { icon: Component; tone: string }> = {
  created: { icon: Plus, tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  completed: { icon: CheckCircle2, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  reopened: { icon: RotateCcw, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  edited: { icon: Pencil, tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
  deleted: { icon: Trash2, tone: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
};

const FILTERS: { key: EventKind | 'todas'; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'created', label: 'Criadas' },
  { key: 'completed', label: 'Concluídas' },
  { key: 'edited', label: 'Editadas' },
  { key: 'deleted', label: 'Excluídas' },
];

const filter = ref<EventKind | 'todas'>('todas');
const { data } = useNotifications();
const events = computed<ActivityEvent[]>(() => data.value?.events ?? []);

const filtered = computed(() =>
  filter.value === 'todas' ? events.value : events.value.filter((e) => e.kind === filter.value)
);

function isUnread(e: ActivityEvent): boolean {
  return new Date(e.created_at).getTime() > lastSeen.value;
}

const unreadCount = computed(() => events.value.filter(isUnread).length);

// Agrupa por dia, na ordem em que a API devolve (mais recentes primeiro)
const groups = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const map = new Map<string, ActivityEvent[]>();
  for (const e of filtered.value) {
    const d = new Date(e.created_at);
    d.setHours(0, 0, 0, 0);
    const label =
      d.getTime() === today.getTime()
        ? 'Hoje'
        : d.getTime() === yesterday.getTime()
          ? 'Ontem'
          : d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const list = map.get(label) ?? [];
    list.push(e);
    map.set(label, list);
  }
  return [...map.entries()].map(([label, items]) => ({ label, items }));
});

function markAllRead(): void {
  lastSeen.value = Date.now();
  toast.success('Notificações marcadas como lidas');
}
</script>