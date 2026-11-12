<script setup lang="ts">
import type { SelectContentEmits, SelectContentProps } from 'reka-ui';
import { reactiveOmit } from '@vueuse/core';
import {
  SelectContent,
  SelectPortal,
  SelectViewport,
  useForwardPropsEmits,
} from 'reka-ui';
import { cn } from '@/lib/utils';
import SelectScrollDownButton from './SelectScrollDownButton.vue';
import SelectScrollUpButton from './SelectScrollUpButton.vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<SelectContentProps & { class?: any }>(),
  {
    position: 'popper',
    sideOffset: 6,
  }
);

const emits = defineEmits<SelectContentEmits>();

const delegatedProps = reactiveOmit(props, 'class');
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <SelectPortal>
    <SelectContent
      v-bind="{ ...forwarded, ...$attrs }"
      :class="
        cn(
          'relative z-50 max-h-96 min-w-32 overflow-hidden rounded-[1.25rem]  border bg-popover text-popover-foreground shadow-lg',
          props.class
        )
      "
    >
      <SelectScrollUpButton />
      <SelectViewport class="p-1">
        <slot />
      </SelectViewport>
      <SelectScrollDownButton />
    </SelectContent>
  </SelectPortal>
</template>