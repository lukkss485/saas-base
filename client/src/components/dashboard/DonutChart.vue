<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface AnimatedSegment extends Segment {
  value: number;
}

interface Arc extends AnimatedSegment {
  percent: number;
  path: string;
}

const props = defineProps<{ segments: Segment[] }>();
const emit = defineEmits<{ select: [key: string] }>();

// A proporção do anel foi ajustada para se aproximar do SVG enviado.
const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 82;
const STROKE = 20;
const OUTER_RADIUS = RADIUS + STROKE / 2;
const INNER_RADIUS = RADIUS - STROKE / 2;
const CAP_RADIUS = STROKE / 2;
const DURATION = 1350;
const GAP_DEG = 2.8;
const CAP_INSET_DEG = (Math.asin(CAP_RADIUS / RADIUS) * 180) / Math.PI;

function cleanSegments(segments: Segment[]): AnimatedSegment[] {
  const seen = new Set<string>();
  return segments
    .filter((segment) => {
      if (seen.has(String(segment.key))) return false;
      seen.add(String(segment.key));
      return true;
    })
    .map((segment) => ({
      key: String(segment.key),
      label: String(segment.label ?? ''),
      color: String(segment.color || '#2563eb'),
      value: Math.max(0, Number.isFinite(Number(segment.value)) ? Number(segment.value) : 0),
    }));
}

const animatedSegments = ref<AnimatedSegment[]>(cleanSegments(props.segments));
const hoveredKey = ref<string | null>(null);
const isAnimating = ref(false);
const isCenterAnimating = ref(false);
let animationFrame = 0;
let centerAnimationFrame = 0;
let hoverTimer: ReturnType<typeof setTimeout> | undefined;

const totalExact = computed(() =>
  animatedSegments.value.reduce((sum, segment) => sum + Math.max(0, segment.value), 0),
);
const total = computed(() => Math.round(totalExact.value));
const hasValues = computed(() => totalExact.value > 0.0001);

// O texto central segue os valores finais dos props, não cada frame intermediário do arco.
const targetSegments = computed(() => cleanSegments(props.segments));
const targetTotal = computed(() =>
  targetSegments.value.reduce((sum, segment) => sum + Math.max(0, segment.value), 0),
);
const centerTargetSegment = computed(() => {
  const hovered = hoveredKey.value
    ? targetSegments.value.find((segment) => segment.key === hoveredKey.value && segment.value > 0.0001)
    : undefined;
  return hovered ?? targetSegments.value.find((segment) => segment.value > 0.0001) ?? targetSegments.value[0] ?? null;
});
const centerLabel = computed(() => {
  if (targetTotal.value <= 0.0001) return 'sem tarefas';
  return centerTargetSegment.value?.label ?? 'tarefas';
});
const targetCenterPercent = computed(() => {
  if (!centerTargetSegment.value || targetTotal.value <= 0.0001) return 0;
  return Math.round((Math.max(0, centerTargetSegment.value.value) / targetTotal.value) * 100);
});
const centerPercentDisplay = ref(targetCenterPercent.value);

function animateCenterPercent(target: number): void {
  if (centerAnimationFrame) cancelAnimationFrame(centerAnimationFrame);
  centerAnimationFrame = 0;

  if (prefersReducedMotion() || typeof window === 'undefined') {
    centerPercentDisplay.value = target;
    isCenterAnimating.value = false;
    return;
  }

  const from = centerPercentDisplay.value;
  if (from === target) {
    isCenterAnimating.value = false;
    return;
  }

  const startTime = performance.now();
  const duration = 760;
  isCenterAnimating.value = true;

  const frame = (now: number) => {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    centerPercentDisplay.value = Math.round(from + (target - from) * eased);

    if (progress < 1) {
      centerAnimationFrame = requestAnimationFrame(frame);
    } else {
      centerPercentDisplay.value = target;
      centerAnimationFrame = 0;
      isCenterAnimating.value = false;
    }
  };

  centerAnimationFrame = requestAnimationFrame(frame);
}

watch(targetCenterPercent, animateCenterPercent);

function setHoveredKey(key: string | null, delay = 100): void {
  if (hoverTimer) clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    hoveredKey.value = key;
    hoverTimer = undefined;
  }, delay);
}

function polarPoint(radius: number, angleDegrees: number): { x: number; y: number } {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER + radius * Math.sin(radians),
  };
}

function pointString(point: { x: number; y: number }): string {
  return `${point.x.toFixed(3)} ${point.y.toFixed(3)}`;
}

/**
 * Cria uma fatia preenchida com pontas arredondadas como no SVG de referência.
 * As pontas são geometria do próprio path, não stroke-linecap: isso evita as
 * “bolinhas” que apareceram na versão anterior quando os segmentos se aproximavam.
 */
function roundedSegmentPath(startAngle: number, endAngle: number): string {
  const sweep = endAngle - startAngle;
  if (sweep <= 0.05) return '';

  const outerStart = polarPoint(OUTER_RADIUS, startAngle);
  const outerEnd = polarPoint(OUTER_RADIUS, endAngle);
  const innerEnd = polarPoint(INNER_RADIUS, endAngle);
  const innerStart = polarPoint(INNER_RADIUS, startAngle);
  const largeArc = sweep > 180 ? 1 : 0;

  // Fatias muito pequenas usam pontas retas para não invadir as categorias vizinhas.
  if (sweep < CAP_INSET_DEG * 2 + GAP_DEG + 1) {
    return [
      `M ${pointString(outerStart)}`,
      `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArc} 1 ${pointString(outerEnd)}`,
      `L ${pointString(innerEnd)}`,
      `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArc} 0 ${pointString(innerStart)}`,
      'Z',
    ].join(' ');
  }

  return [
    `M ${pointString(outerStart)}`,
    `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArc} 1 ${pointString(outerEnd)}`,
    `A ${CAP_RADIUS} ${CAP_RADIUS} 0 0 1 ${pointString(innerEnd)}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArc} 0 ${pointString(innerStart)}`,
    `A ${CAP_RADIUS} ${CAP_RADIUS} 0 0 1 ${pointString(outerStart)}`,
    'Z',
  ].join(' ');
}

const arcs = computed<Arc[]>(() => {
  const segments = animatedSegments.value;
  const safeTotal = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  if (safeTotal <= 0.0001) {
    return segments.map((segment) => ({ ...segment, percent: 0, path: '' }));
  }

  let angle = -90;
  return segments.map((segment) => {
    const value = Math.max(0, segment.value);
    const sweep = (value / safeTotal) * 360;
    const gap = Math.min(GAP_DEG, sweep * 0.24);
    const inset = sweep > CAP_INSET_DEG * 2 + gap + 1
      ? CAP_INSET_DEG + gap / 2
      : gap / 2;
    const startAngle = angle + inset;
    const endAngle = angle + sweep - inset;
    const path = value > 0.0001 && endAngle > startAngle
      ? roundedSegmentPath(startAngle, endAngle)
      : '';

    const arc: Arc = {
      ...segment,
      value,
      percent: (value / safeTotal) * 100,
      path,
    };
    angle += sweep;
    return arc;
  });
});

function easeInOutQuart(progress: number): number {
  return progress < 0.5
    ? 8 * progress ** 4
    : 1 - Math.pow(-2 * progress + 2, 4) / 2;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function animateTo(incoming: Segment[]): void {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = 0;

  const next = cleanSegments(incoming);
  if (prefersReducedMotion() || typeof window === 'undefined') {
    animatedSegments.value = next;
    isAnimating.value = false;
    return;
  }

  const currentMap = new Map(animatedSegments.value.map((segment) => [segment.key, segment]));
  const nextMap = new Map(next.map((segment) => [segment.key, segment]));
  const keys = [...new Set([...currentMap.keys(), ...nextMap.keys()])];
  const tracks = keys.map((key) => {
    const current = currentMap.get(key);
    const target = nextMap.get(key);
    const template = target ?? current!;
    return {
      key,
      label: template.label,
      color: template.color,
      from: current?.value ?? 0,
      to: target?.value ?? 0,
      targetExists: Boolean(target),
    };
  });

  const startTime = performance.now();
  isAnimating.value = true;
  const frame = (now: number) => {
    const progress = Math.min(1, (now - startTime) / DURATION);
    const eased = easeInOutQuart(progress);

    animatedSegments.value = tracks
      .map((track) => ({
        key: track.key,
        label: track.label,
        color: track.color,
        value: track.from + (track.to - track.from) * eased,
      }))
      .filter((segment, index) => segment.value > 0.0001 || tracks[index].targetExists);

    if (progress < 1) {
      animationFrame = requestAnimationFrame(frame);
    } else {
      animatedSegments.value = next;
      animationFrame = 0;
      isAnimating.value = false;
    }
  };

  animationFrame = requestAnimationFrame(frame);
}

watch(() => props.segments.map((segment) => ({ ...segment })), animateTo, { deep: true });

function selectSegment(key: string): void {
  emit('select', key);
}

function onArcKeydown(event: KeyboardEvent, key: string): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    selectSegment(key);
  }
  if (event.key === 'Escape') setHoveredKey(null, 0);
}

onBeforeUnmount(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (centerAnimationFrame) cancelAnimationFrame(centerAnimationFrame);
  if (hoverTimer) clearTimeout(hoverTimer);
});
</script>

<template>
  <div
    class="donut-chart mx-auto w-full max-w-[220px]"
    :class="{ 'donut-chart--moving': isAnimating || isCenterAnimating }"
    role="group"
    aria-label="Distribuição de tarefas"
  >
    <svg
      class="donut-chart__svg block h-auto w-full"
      :viewBox="`0 0 ${SIZE} ${SIZE}`"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      :aria-label="`Distribuição de tarefas: ${total} no total. ${centerPercentDisplay}% ${centerLabel}.`"
    >
      <title>Distribuição de tarefas</title>
      <desc>Gráfico circular interativo. Selecione um segmento para filtrar as tarefas.</desc>

      <!-- Trilha neutra por trás dos segmentos -->
      <circle
        class="donut-chart__track"
        :cx="CENTER"
        :cy="CENTER"
        :r="RADIUS"
        fill="none"
        stroke-opacity="0.10"
        :stroke-width="STROKE"
      />

      <g v-if="hasValues" class="donut-chart__segments">
        <path
          v-for="arc in arcs"
          v-show="arc.path"
          :key="arc.key"
          class="donut-chart__arc"
          :class="{
            'donut-chart__arc--hovered': hoveredKey === arc.key,
            'donut-chart__arc--dimmed': hoveredKey !== null && hoveredKey !== arc.key,
          }"
          :d="arc.path"
          :fill="arc.color"
          :tabindex="arc.value > 0.0001 ? 0 : -1"
          role="button"
          :aria-label="`${arc.label}: ${Math.round(arc.value)} tarefas, ${Math.round(arc.percent)}%. Clique para filtrar.`"
          @mouseenter="setHoveredKey(arc.key, 120)"
          @mouseleave="setHoveredKey(null, 180)"
          @focus="setHoveredKey(arc.key, 0)"
          @blur="setHoveredKey(null, 0)"
          @click="selectSegment(arc.key)"
          @keydown="onArcKeydown($event, arc.key)"
        >
          <title>{{ arc.label }} — {{ Math.round(arc.value) }} tarefas ({{ Math.round(arc.percent) }}%)</title>
        </path>
      </g>

      <!-- Percentual principal, inspirado no SVG de referência -->
      <g class="donut-chart__center" aria-hidden="true">
        <text
          :x="CENTER"
          y="103"
          text-anchor="middle"
          dominant-baseline="middle"
          class="donut-chart__value fill-foreground tabular-nums"
        >
          {{ centerPercentDisplay }}%
        </text>
        <Transition name="donut-center-label" mode="out-in">
          <text
            :key="centerLabel"
            :x="CENTER"
            y="130"
            text-anchor="middle"
            dominant-baseline="middle"
            class="donut-chart__caption fill-muted-foreground"
          >
            {{ centerLabel }}
          </text>
        </Transition>
      </g>
    </svg>

    <p class="sr-only" aria-live="polite">
      {{ total }} tarefas no total. {{ arcs.map((arc) => `${arc.label}: ${Math.round(arc.value)} (${Math.round(arc.percent)}%)`).join('; ') }}.
    </p>
  </div>
</template>

<style scoped>
.donut-chart {
  isolation: isolate;
  animation: donut-chart-enter 850ms cubic-bezier(0.22, 1, 0.36, 1) both;
  filter: blur(0);
  transition: filter 320ms ease;
}

.donut-chart__svg {
  overflow: visible;
}

/* Desfoque quase imperceptível enquanto os valores/arcos estão se movendo. */
.donut-chart--moving {
  filter: blur(0.38px);
}

.donut-chart__track {
  transition: stroke-opacity 500ms ease;
}

.donut-chart__arc {
  cursor: pointer;
  outline: none;
  transform-origin: center;
  transition:
    opacity 480ms ease,
    filter 480ms cubic-bezier(0.22, 1, 0.36, 1);
  vector-effect: non-scaling-stroke;
}

.donut-chart__arc--hovered {
  filter: drop-shadow(0 3px 5px rgb(15 23 42 / 18%));
}

.donut-chart__arc--dimmed {
  opacity: 0.58;
}

.donut-chart__arc:focus-visible {
  filter: drop-shadow(0 0 4px rgb(37 99 235 / 50%));
}

.donut-chart__value {
  transition: filter 280ms ease;
  font-size: 32px;
  font-weight: 750;
  letter-spacing: -0.045em;
}

.donut-chart__caption {
  max-width: 120px;
  transform-box: fill-box;
  transform-origin: center;
  font-size: 12px;
  font-weight: 500;
  text-anchor: middle;
}

.donut-center-label-enter-active,
.donut-center-label-leave-active {
  transition:
    opacity 420ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 420ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.donut-center-label-enter-from {
  opacity: 0;
  filter: blur(2px);
  transform: translateY(3px);
}

.donut-center-label-leave-to {
  opacity: 0;
  filter: blur(2px);
  transform: translateY(-2px);
}

@keyframes donut-chart-enter {
  from {
    opacity: 0;
    transform: translateY(7px) scale(0.975);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .donut-chart {
    animation: none !important;
    filter: none !important;
  }

  .donut-center-label-enter-active,
  .donut-center-label-leave-active {
    transition: none !important;
  }

  .donut-chart__track,
  .donut-chart__arc {
    transition: none !important;
  }
}
</style>
