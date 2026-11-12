<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p class="mt-1 text-muted-foreground">Sua produtividade ao longo do tempo.</p>
      </div>

      <Tabs :model-value="String(range)" @update:model-value="(v) => (range = Number(v) as ReportRange)">
        <TabsList>
          <TabsTrigger value="7">7 dias</TabsTrigger>
          <TabsTrigger value="30">30 dias</TabsTrigger>
          <TabsTrigger value="90">90 dias</TabsTrigger>
        </TabsList>
      </Tabs>
    </header>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <template v-if="!report">
        <Skeleton v-for="i in 4" :key="i" class="h-32 rounded-xl" />
      </template>
      <template v-else>
        <Reveal v-for="(s, i) in summary" :key="s.label" class="h-full" :delay="i * 60">
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
      </template>
    </section>

    <section class="grid gap-4 xl:grid-cols-3">
      <Card class="xl:col-span-2">
        <CardHeader>
          <CardTitle class="text-base">Criadas x concluídas</CardTitle>
          <CardDescription>Últimos {{ range }} dias</CardDescription>
        </CardHeader>
        <CardContent>
          <AreaChart v-if="report" :key="range" :series="report.series" />
          <Skeleton v-else class="h-60 w-full rounded-xl" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Conclusões por dia da semana</CardTitle>
          <CardDescription>Quando você mais finaliza tarefas</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex h-52 items-end justify-between gap-2">
            <div v-for="d in weekdayBars" :key="d.label" class="flex flex-1 flex-col items-center gap-2">
              <span class="text-xs tabular-nums text-muted-foreground">{{ d.n }}</span>
              <div class="w-full rounded-t-lg bg-primary transition-all duration-700" :style="{ height: d.height }" />
              <span class="text-xs text-muted-foreground">{{ d.label }}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>

    <section class="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Por prioridade</CardTitle>
          <CardDescription>Tarefas concluídas em cada nível</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div v-for="p in priorityRows" :key="p.key" class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="flex items-center gap-2">
                <i class="h-2 w-2 rounded-full" :class="PRIORITY_DOT[p.key]" />
                {{ PRIORITY_LABEL[p.key] }}
              </span>
              <span class="tabular-nums text-muted-foreground">{{ p.done }}/{{ p.total }}</span>
            </div>
            <Progress :model-value="p.pct" />
          </div>
          <p v-if="!priorityRows.length" class="text-sm text-muted-foreground">Sem tarefas ainda.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Projetos</CardTitle>
          <CardDescription>Progresso de cada projeto</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div v-for="p in report?.projects ?? []" :key="p.name" class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="flex min-w-0 items-center gap-2">
                <i class="h-2 w-2 shrink-0 rounded-full" :style="{ background: p.color }" />
                <span class="truncate">{{ p.name }}</span>
              </span>
              <span class="tabular-nums text-muted-foreground">{{ pctOf(p) }}%</span>
            </div>
            <Progress :model-value="pctOf(p)" />
          </div>
          <p v-if="report && !report.projects.length" class="text-sm text-muted-foreground">
            Crie um projeto para ver o progresso aqui.
          </p>
        </CardContent>
      </Card>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AreaChart from '@/components/dashboard/AreaChart.vue';
import Reveal from '@/components/motion/Reveal.vue';
import { PRIORITY_DOT, PRIORITY_LABEL } from '@/lib/format';
import type { Priority } from '@/lib/types';
import { useReports, type ReportRange } from '@/queries/extra';

const range = ref<ReportRange>(30);
const { data: report } = useReports(range);

const WEEK_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const WEEK_FULL = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

function pctOf(p: { total: number; done: number }): number {
  return p.total ? Math.round((p.done * 100) / p.total) : 0;
}

function formatHours(h: number | null): string {
  if (h === null) return '—';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

const weekdayBars = computed(() => {
  const counts = Array.from({ length: 7 }, () => 0);
  for (const row of report.value?.byWeekday ?? []) counts[row.dow - 1] = row.n;
  const max = Math.max(1, ...counts);
  return counts.map((n, i) => ({
    label: WEEK_SHORT[i],
    n,
    height: `${Math.round((n / max) * 180)}px`,
  }));
});

const summary = computed(() => {
  const r = report.value;
  const best = r?.byWeekday.reduce((a, b) => (b.n > a.n ? b : a), { dow: 0, n: 0 });
  const hasBest = !!best && best.n > 0;
  return [
    { label: 'Concluídas', value: r?.completed ?? 0, hint: `nos últimos ${range.value} dias` },
    { label: 'Taxa de conclusão', value: `${r?.rate ?? 0}%`, hint: 'concluídas sobre criadas' },
    { label: 'Tempo médio', value: formatHours(r?.avgHours ?? null), hint: 'da criação à conclusão' },
    {
      label: 'Melhor dia',
      value: hasBest ? WEEK_FULL[best.dow - 1] : '—',
      hint: hasBest ? `${best.n} conclusões` : 'ainda sem dados',
    },
  ];
});

const priorityRows = computed(() => {
  const order: Priority[] = ['alta', 'media', 'baixa'];
  return order
    .map((key) => {
      const row = report.value?.byPriority.find((p) => p.priority === key);
      const total = row?.total ?? 0;
      const done = row?.done ?? 0;
      return { key, total, done, pct: total ? Math.round((done * 100) / total) : 0 };
    })
    .filter((p) => p.total > 0);
});
</script>