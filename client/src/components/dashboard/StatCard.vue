<template>
  <Card
    role="button"
    tabindex="0"
    class="group cursor-pointer gap-3 py-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring sm:gap-6 sm:py-6"
    :class="active ? 'ring-2 ring-primary' : ''"
    @click="emit('select')"
    @keydown.enter.prevent="emit('select')"
  >
    <CardHeader class="flex flex-row items-center justify-between space-y-0 px-4 pb-0 sm:px-6">
      <CardDescription class="text-xs sm:text-sm">{{ label }}</CardDescription>
      <div
        class="grid h-8 w-8 place-items-center rounded-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 sm:h-9 sm:w-9"
        :class="tone"
      >
        <component :is="icon" class="h-4 w-4" />
      </div>
    </CardHeader>
    <CardContent class="px-4 sm:px-6">
      <!-- A key muda a cada valor novo, então a animação roda de novo -->
      <p :key="value" class="nt-badge-in text-2xl font-bold tabular-nums sm:text-3xl">{{ display }}</p>
      <div class="mt-1 flex items-center gap-2 sm:mt-2">
        <p class="text-[11px] leading-tight text-muted-foreground sm:text-xs">{{ hint }}</p>
        <Badge v-if="badge" variant="destructive" class="nt-badge-in ml-auto shrink-0">{{ badge }}</Badge>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';
import { useTransition } from '@vueuse/core';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';

const props = defineProps<{
  label: string;
  value: number;
  hint: string;
  icon: Component;
  tone: string;
  badge?: string;
  active?: boolean;
}>();

const emit = defineEmits<{ select: [] }>();

// Conta do valor antigo até o novo
const animated = useTransition(() => props.value, { duration: 600 });
const display = computed(() => Math.round(animated.value));
</script>