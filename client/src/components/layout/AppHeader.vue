<!-- src/components/layout/AppHeader.vue -->
<script setup>
import { computed, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { Button } from '@/components/ui/button';
import { ListChecks, Menu, X } from '@lucide/vue';

const APP_NAME = 'NT-life';

const route = useRoute();
const mobileOpen = ref(false);

const isLogged = computed(() => !!localStorage.getItem('token'));
const ctaTo = computed(() => (isLogged.value ? '/dashboard' : '/login?mode=register'));
const ctaLabel = computed(() => (isLogged.value ? 'Ir para o painel' : 'Começar grátis'));

const isLanding = computed(() => route.path === '/');

const navLinks = [
  { label: 'Recursos', href: '#recursos' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Planos', href: '#planos' },
  { label: 'Perguntas', href: '#faq' },
];

function closeMobile() {
  mobileOpen.value = false;
}
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
  >
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
      <RouterLink to="/" class="flex items-center gap-2 font-semibold" @click="closeMobile">
        <img src="/logo.png" alt="" class="h-8 w-8 rounded-lg" />
        {{ APP_NAME }}
      </RouterLink>

      <nav v-if="isLanding" class="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
        <a
          v-for="link in navLinks"
          :key="link.href"
          :href="link.href"
          class="transition-colors hover:text-foreground"
        >
          {{ link.label }}
        </a>
      </nav>

      <div class="flex items-center gap-2">
        <Button as-child variant="ghost" size="sm" class="hidden sm:inline-flex">
          <RouterLink to="/login">Entrar</RouterLink>
        </Button>

        <Button as-child size="sm" class="hidden sm:inline-flex">
          <RouterLink :to="ctaTo">{{ ctaLabel }}</RouterLink>
        </Button>

        <button
          v-if="isLanding"
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-md border md:hidden"
          :aria-expanded="mobileOpen"
          aria-label="Abrir menu"
          @click="mobileOpen = !mobileOpen"
        >
          <X v-if="mobileOpen" class="h-4 w-4" />
          <Menu v-else class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div v-if="isLanding && mobileOpen" class="border-t bg-background md:hidden">
      <nav class="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4 text-sm">
        <a
          v-for="link in navLinks"
          :key="link.href"
          :href="link.href"
          class="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          @click="closeMobile"
        >
          {{ link.label }}
        </a>
        <div class="mt-3 flex flex-col gap-2 sm:hidden">
          <Button as-child variant="outline" size="sm">
            <RouterLink to="/login" @click="closeMobile">Entrar</RouterLink>
          </Button>
          <Button as-child size="sm">
            <RouterLink :to="ctaTo" @click="closeMobile">{{ ctaLabel }}</RouterLink>
          </Button>
        </div>
      </nav>
    </div>
  </header>
</template>