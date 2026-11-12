<template>
  <div>
    <TransitionGroup tag="ul" name="nt-list" class="grid gap-4">
      <li v-for="e in events" :key="e.id" class="flex items-start gap-3">
        <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg" :class="meta[e.kind].tone">
          <component :is="meta[e.kind].icon" class="h-4 w-4" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm">
            <span class="font-medium">{{ meta[e.kind].verb }}</span>
            <span class="text-slate-500 dark:text-slate-400"> tarefa</span>
          </p>
          <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ e.title }}</p>
        </div>
        <span class="shrink-0 text-xs text-slate-400">{{ timeAgo(e.created_at) }}</span>
      </li>
    </TransitionGroup>

    <p v-if="!events.length" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
      Suas ações aparecem aqui.
    </p>
  </div>
</template>

<script setup lang="ts">
import { Plus, CheckCircle2, RotateCcw, Pencil, Trash2 } from 'lucide-vue-next';
import { timeAgo } from '@/lib/format';
import type { ActivityEvent, EventKind } from '@/lib/types';

defineProps<{ events: ActivityEvent[] }>();

const meta: Record<EventKind, { verb: string; icon: unknown; tone: string }> = {
  created: { verb: 'Criou', icon: Plus, tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  completed: { verb: 'Concluiu', icon: CheckCircle2, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  reopened: { verb: 'Reabriu', icon: RotateCcw, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  edited: { verb: 'Editou', icon: Pencil, tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
  deleted: { verb: 'Excluiu', icon: Trash2, tone: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
};
</script>

<style scoped>
.nt-list-enter-active,
.nt-list-leave-active {
  transition: all 300ms ease;
}
.nt-list-enter-from {
  opacity: 0;
  transform: translateX(-8px);
}
.nt-list-leave-to {
  opacity: 0;
  transform: translateX(8px);
}
</style>