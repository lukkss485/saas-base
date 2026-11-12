<template>
  <div
    ref="el"
    class="nt-reveal"
    :class="{ 'is-visible': visible }"
    :style="{ transitionDelay: visible ? delay + 'ms' : '0ms' }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';

const props = withDefaults(
  defineProps<{
    delay?: number;
    once?: boolean;
  }>(),
  { delay: 0, once: true }
);

const el = ref<HTMLElement | null>(null);
const visible = ref(false);

useIntersectionObserver(
  el,
  ([entry]) => {
    if (!entry) return;
    if (entry.isIntersecting) {
      visible.value = true;
    } else if (!props.once) {
      visible.value = false;
    }
  },
  { threshold: 0.12 }
);
</script>

<style scoped>
.nt-reveal {
  opacity: 0;
  transform: translateY(18px);
  filter:blur(10px);
  transition:
    opacity 550ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 550ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 550ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform filter;
}

.nt-reveal.is-visible {
  opacity: 1;
  filter:blur(0px);
  transform: none;
}

/* Quem desativou animações no sistema vê o conteúdo direto */
@media (prefers-reduced-motion: reduce) {
  .nt-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>