<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-3xl font-bold tracking-tight">Tarefas</h1>
      <p class="mt-1 text-muted-foreground">Pendentes, concluídas, prioridades e prazos em um só lugar.</p>
    </header>

    <section class="grid gap-4 sm:grid-cols-3">
      <Reveal v-for="(s, i) in stats" :key="s.label" class="h-full" :delay="i * 80">
        <Card class="h-full">
          <CardHeader class="pb-2">
            <CardDescription>{{ s.label }}</CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-3xl font-bold tabular-nums">{{ s.value }}</p>
            <p class="mt-1 text-xs text-muted-foreground">{{ s.hint }}</p>
          </CardContent>
        </Card>
      </Reveal>
    </section>

    <Reveal :delay="240">
      <TaskPanel v-model:filter="filter" />
    </Reveal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import TaskPanel from '@/components/dashboard/TaskPanel.vue';
import Reveal from '@/components/motion/Reveal.vue';
import { isOverdue } from '@/lib/format';
import type { Filter } from '@/lib/types';
import { useTasks } from '@/queries/tasks';

const filter = ref<Filter>('todas');
const { data } = useTasks();
const tasks = computed(() => data.value?.tasks ?? []);

const stats = computed(() => [
  { label: 'Pendentes', value: tasks.value.filter((t) => !t.done).length, hint: 'aguardando conclusão' },
  { label: 'Concluídas', value: tasks.value.filter((t) => t.done).length, hint: 'já finalizadas' },
  { label: 'Atrasadas', value: tasks.value.filter(isOverdue).length, hint: 'passaram do prazo' },
]);
</script>