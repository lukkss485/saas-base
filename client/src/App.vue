<template>
  <AppLayout v-if="isPrivate">
    <RouterView />
  </AppLayout>

  <div v-else class="flex min-h-screen flex-col bg-slate-50">
    <!-- seu cabeçalho e rodapé públicos -->
    <AppHeader />
    <main class="flex-1">
      <RouterView />
    </main>
    <AppFooter />
  </div>

  <!-- <DevTools v-if="isDev" /> -->
  <Toaster rich-colors position="bottom-center" />
</template>

<script setup lang="ts">

import { computed } from 'vue';
import { useRoute, RouterView } from 'vue-router';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from '@/components/layout/AppLayout.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import DevTools from '@/components/DevTools.vue';
import 'vue-sonner/style.css';

const route = useRoute();
const isDev = import.meta.env.DEV;
const isPrivate = computed(() => !!route.meta.private);
</script>