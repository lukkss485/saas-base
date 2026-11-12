<!-- src/components/layout/AppFooter.vue -->
<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { ListChecks } from '@lucide/vue';

const APP_NAME = 'SaaS Base';
const year = new Date().getFullYear();

const isLogged = computed(() => !!localStorage.getItem('token'));

const productLinks = [
  { label: 'Recursos', href: '/#recursos' },
  { label: 'Como funciona', href: '/#como-funciona' },
  { label: 'Planos', href: '/#planos' },
  { label: 'Perguntas', href: '/#faq' },
];

const accountLinks = computed(() =>
  isLogged.value
    ? [{ label: 'Painel', to: '/dashboard' }]
    : [
        { label: 'Entrar', to: '/login' },
        { label: 'Criar conta', to: '/login?mode=register' },
      ],
);
</script>

<template>
  <footer class="border-t bg-background">
    <div class="mx-auto max-w-6xl px-6 py-12">
      <div class="grid gap-10 md:grid-cols-4">
        <div class="md:col-span-2">
          <RouterLink to="/" class="flex items-center gap-2 font-semibold">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ListChecks class="h-4 w-4" />
            </span>
            {{ APP_NAME }}
          </RouterLink>
          <p class="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Um jeito simples de organizar suas tarefas, com conta segura e assinatura sem complicação.
          </p>
        </div>

        <div>
          <h3 class="text-sm font-semibold">Produto</h3>
          <ul class="mt-4 grid gap-3 text-sm text-muted-foreground">
            <li v-for="link in productLinks" :key="link.href">
              <a :href="link.href" class="transition-colors hover:text-foreground">{{ link.label }}</a>
            </li>
          </ul>
        </div>

        <div>
          <h3 class="text-sm font-semibold">Conta</h3>
          <ul class="mt-4 grid gap-3 text-sm text-muted-foreground">
            <li v-for="link in accountLinks" :key="link.to">
              <RouterLink :to="link.to" class="transition-colors hover:text-foreground">
                {{ link.label }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>

      <div class="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
        <span>© {{ year }} {{ APP_NAME }}. Todos os direitos reservados.</span>
        <span>Pagamentos processados pelo Mercado Pago.</span>
      </div>
    </div>
  </footer>
</template>
