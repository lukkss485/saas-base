<template>
  <div class="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
    <TransitionGroup name="nt-toast">
      <div
        v-for="t in toasts.items"
        :key="t.id"
        class="pointer-events-auto flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-xl"
      >
        <span>{{ t.message }}</span>
        <button
          v-if="t.onAction"
          type="button"
          class="font-medium text-blue-300 transition-colors hover:text-white"
          @click="run(t)"
        >
          {{ t.actionLabel }}
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useToasts, dismiss, type ToastItem } from '@/lib/toast';

const toasts = useToasts();

function run(t: ToastItem): void {
  t.onAction?.();
  dismiss(t.id);
}
</script>

<style scoped>
.nt-toast-enter-active,
.nt-toast-leave-active {
  transition: all 250ms cubic-bezier(0.22, 1, 0.36, 1);
}
.nt-toast-enter-from,
.nt-toast-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}
</style>