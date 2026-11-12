<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child ">
      <Button
        variant="outline"
        type="button"
        :disabled="disabled"
        :class="[
          'nt-date-trigger justify-start gap-2 font-normal',
          !modelValue ? 'text-muted-foreground' : '',
          triggerClass,
        ]"
      >
        <CalendarIcon class="h-4 w-4 shrink-0" />
        <span class="truncate">{{ label }}</span>
      </Button>
    </PopoverTrigger>

    <PopoverContent align="start" class="nt-menu nt-cal-wrap w-auto overflow-hidden rounded-[1.35rem] p-1 shadow-2xl">
      <Calendar
        class="nt-cal p-3"
        :model-value="calendarValue"
        locale="pt-BR"
        @update:model-value="onPick"
      />

      <div class="flex items-center justify-between border-t px-4 py-2.5 text-sm">
        <button
          type="button"
          class="nt-link-btn text-muted-foreground hover:text-foreground"
          @click="clear"
        >
          Limpar
        </button>
        <button
          type="button"
          class="nt-link-btn font-medium text-primary hover:underline"
          @click="pickToday"
        >
          Hoje
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getLocalTimeZone, parseDate, today, type DateValue } from '@internationalized/date';
import { CalendarIcon } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const props = withDefaults(
  defineProps<{
    modelValue: string | null | undefined;
    placeholder?: string;
    disabled?: boolean;
    triggerClass?: string;
  }>(),
  { placeholder: 'Sem data', disabled: false, triggerClass: '' }
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const open = ref(false);

// Converte o texto "AAAA-MM-DD" para o formato que o calendário usa
const calendarValue = computed<DateValue | undefined>(() =>
  props.modelValue ? parseDate(props.modelValue) : undefined
);

const label = computed(() => {
  if (!props.modelValue) return props.placeholder;
  const [y, m, d] = props.modelValue.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
});

function onPick(value: DateValue | undefined): void {
  emit('update:modelValue', value ? value.toString() : '');
  open.value = false;
}

function pickToday(): void {
  emit('update:modelValue', today(getLocalTimeZone()).toString());
  open.value = false;
}

function clear(): void {
  emit('update:modelValue', '');
  open.value = false;
}
</script>