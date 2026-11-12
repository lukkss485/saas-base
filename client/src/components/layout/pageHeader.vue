<!-- src/components/layout/PageHeader.vue -->
<script setup lang="ts">
import { onUnmounted, watchEffect } from 'vue';
import { resetPageHeader, setPageHeader } from '@/lib/pageHeader';

const props = withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    showSearch?: boolean;
  }>(),
  {
    title: '',
    subtitle: '',
    showSearch: true,
  },
);

// Mantém o cabeçalho sincronizado com as props da página
watchEffect(() => {
  setPageHeader({
    title: props.title,
    subtitle: props.subtitle,
    showSearch: props.showSearch,
  });
});

// Ao sair da página, volta ao cabeçalho padrão
onUnmounted(resetPageHeader);
</script>

<template>
  <!-- O conteúdo do slot (botões, ações) aparece na área de ações do cabeçalho -->
  <Teleport defer to="#page-header-actions">
    <slot />
  </Teleport>
</template>