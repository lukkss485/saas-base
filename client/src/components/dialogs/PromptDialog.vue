<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">{{ description }}</DialogDescription>
      </DialogHeader>

      <form class="grid gap-2" @submit.prevent="submit">
        <Label v-if="label" :for="inputId">{{ label }}</Label>
        <Input :id="inputId" v-model="value" :type="inputType" :placeholder="placeholder" autofocus />

        <DialogFooter class="mt-4">
          <Button type="button" variant="outline" @click="cancel">{{ cancelLabel }}</Button>
          <Button type="submit">{{ confirmLabel }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    description?: string;
    label?: string;
    placeholder?: string;
    initialValue?: string;
    inputType?: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }>(),
  {
    initialValue: '',
    inputType: 'text',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
  }
);

const emit = defineEmits<{
  'update:open': [value: boolean];
  submit: [value: string];
}>();

const value = ref('');
const inputId = `prompt-${Math.random().toString(36).slice(2, 9)}`;

// Preenche com o valor inicial sempre que o diálogo abre
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) value.value = props.initialValue;
  }
);

function submit(): void {
  emit('submit', value.value.trim());
  emit('update:open', false);
}

function cancel(): void {
  emit('update:open', false);
}
</script>