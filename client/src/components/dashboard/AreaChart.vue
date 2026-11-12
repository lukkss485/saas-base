<template>
  <div class="relative">
    <svg
      ref="svgRef"
      :viewBox="`0 0 ${W} ${H}`"
      class="h-44 w-full select-none sm:h-60"
      @mousemove="onMove"
      @mouseleave="hover = -1"
    >
      <defs>
        <linearGradient id="nt-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#2563eb" stop-opacity="0.2" />
          <stop offset="100%" stop-color="#2563eb" stop-opacity="0" />
        </linearGradient>
      </defs>

      <line
        v-for="y in gridY"
        :key="y"
        :x1="PX"
        :x2="W - PX"
        :y1="y"
        :y2="y"
        stroke="#e2e8f0"
        stroke-dasharray="3 5"
        class="dark:stroke-slate-700"
      />

      <path :d="areaD" fill="url(#nt-area)" />
      <path :d="createdD" pathLength="1" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" class="nt-draw" />
      <path :d="completedD" pathLength="1" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" class="nt-draw" />

      <g v-if="active">
        <line :x1="active.x" :x2="active.x" :y1="PY" :y2="H - PY" stroke="#94a3b8" stroke-dasharray="2 4" />
        <circle :cx="active.x" :cy="active.cy" r="5" fill="#2563eb" stroke="#fff" stroke-width="2" />
        <circle :cx="active.x" :cy="active.ly" r="4" fill="#10b981" stroke="#fff" stroke-width="2" />
      </g>
    </svg>

    <Transition name="nt-tip">
      <div
        v-if="active"
        class="pointer-events-none absolute top-2 z-10 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
        :style="tipStyle"
      >
        <p class="font-medium">{{ active.full }}</p>
        <p class="mt-1 flex items-center gap-2"><i class="h-2 w-2 rounded-full bg-blue-500" />Criadas: {{ active.created }}</p>
        <p class="flex items-center gap-2"><i class="h-2 w-2 rounded-full bg-emerald-500" />Concluídas: {{ active.completed }}</p>
      </div>
    </Transition>

    <div class="relative mt-2 h-4 text-xs text-muted-foreground">
      <span
        v-for="p in ticks"
        :key="p.day"
        class="absolute -translate-x-1/2"
        :style="{ left: p.pct + '%' }"
      >{{ p.short }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { shortDay, fullDay } from '@/lib/format';

type Point = { day: string; created: number; completed: number };

const props = defineProps<{ series: Point[] }>();

const W = 600;
const H = 220;
const PX = 28;
const PY = 16;

const svgRef = ref<SVGSVGElement | null>(null);
const hover = ref(-1);

const max = computed(() => Math.max(1, ...props.series.flatMap((p) => [p.created, p.completed])));
const step = computed(() => (props.series.length > 1 ? (W - PX * 2) / (props.series.length - 1) : 0));
const yFor = (v: number) => H - PY - (v / max.value) * (H - PY * 2);

const pts = computed(() =>
  props.series.map((p, i) => {
    const x = PX + i * step.value;
    return {
      ...p,
      x,
      cy: yFor(p.created),
      ly: yFor(p.completed),
      pct: (x / W) * 100,
      short: shortDay(p.day),
      full: fullDay(p.day),
    };
  })
);

// Curva suave (Catmull-Rom convertida em Bézier)
function smooth(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

const createdD = computed(() => smooth(pts.value.map((p) => ({ x: p.x, y: p.cy }))));
const completedD = computed(() => smooth(pts.value.map((p) => ({ x: p.x, y: p.ly }))));
const areaD = computed(() => {
  const last = pts.value[pts.value.length - 1];
  if (!last) return '';
  return `${createdD.value} L${last.x},${H - PY} L${PX},${H - PY} Z`;
});

const gridY = computed(() => [0.25, 0.5, 0.75, 1].map((f) => H - PY - f * (H - PY * 2)));

const ticks = computed(() => {
  const n = pts.value.length;
  const every = n > 10 ? 5 : 1;
  return pts.value.filter((_, i) => i % every === 0 || i === n - 1);
});

const active = computed(() => (hover.value >= 0 ? pts.value[hover.value] ?? null : null));

// Tooltip: abre à direita do cursor, e à esquerda quando está perto da borda direita
const tipStyle = computed(() => {
  if (!active.value) return {};
  const flip = active.value.pct > 60;
  return {
    left: active.value.pct + '%',
    transform: flip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
  };
});

function onMove(e: MouseEvent): void {
  const el = svgRef.value;
  if (!el || !props.series.length) return;
  const rect = el.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * W;
  const i = step.value ? Math.round((x - PX) / step.value) : 0;
  hover.value = Math.min(props.series.length - 1, Math.max(0, i));
}
</script>

<style scoped>
.nt-draw {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: nt-draw 1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes nt-draw {
  to { stroke-dashoffset: 0; }
}

.nt-tip-enter-active,
.nt-tip-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.nt-tip-enter-from,
.nt-tip-leave-to {
  opacity: 0;
}
</style>