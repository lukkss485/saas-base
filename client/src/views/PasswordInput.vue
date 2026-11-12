<template>
  <div class="relative">
    <Input
      v-model="model"
      v-bind="$attrs"
      :type="visible ? 'text' : 'password'"
      class="pr-10"
    />
    <button
      type="button"
      class="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
      :aria-label="visible ? 'Ocultar senha' : 'Mostrar senha'"
      :aria-pressed="visible"
      @click="visible = !visible"
    >
      <EyeOff v-if="visible" class="h-4 w-4" />
      <Eye v-else class="h-4 w-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Input } from '../components/ui/input';

defineOptions({ inheritAttrs: false });

const model = defineModel<string>({ default: '' });
const visible = ref(false);
</script>