<!-- src/components/layout/NavStylePicker.vue -->
<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-base">Navegação</CardTitle>
      <CardDescription>Escolha onde fica o menu do app no computador.</CardDescription>
    </CardHeader>

    <CardContent class="space-y-4">
      <div role="radiogroup" aria-label="Estilo de navegação" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <button
          v-for="option in NAV_STYLES"
          :key="option.id"
          type="button"
          role="radio"
          :aria-checked="navStyle === option.id"
          class="relative flex flex-col gap-2 rounded-xl border p-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :class="navStyle === option.id ? 'border-primary bg-muted/40 ring-1 ring-primary' : ''"
          @click="navStyle = option.id"
        >
          <!-- Miniatura: mostra onde o menu fica na tela -->
          <span class="relative block aspect-[16/10] w-full overflow-hidden rounded-lg border bg-background" aria-hidden="true">
            <span class="absolute inset-0 flex flex-col gap-1 p-2" :class="CONTENT_PADDING[option.id]">
              <span class="h-1.5 w-1/3 rounded-full bg-muted-foreground/30" />
              <span class="h-1.5 w-2/3 rounded-full bg-muted-foreground/20" />
              <span class="mt-1 h-5 w-full rounded-md bg-muted" />
            </span>

            <span v-if="option.id === 'sidebar'" class="absolute inset-y-1.5 left-1.5 flex w-[24%] flex-col gap-1 rounded-md bg-muted-foreground/25 p-1">
              <span class="h-1 w-full rounded-full bg-background/70" />
              <span class="h-1 w-full rounded-full bg-background/50" />
              <span class="h-1 w-full rounded-full bg-background/50" />
            </span>

            <span v-else-if="option.id === 'compact'" class="absolute inset-y-1.5 left-1.5 flex w-[9%] flex-col items-center gap-1 rounded-md bg-muted-foreground/25 py-1">
              <span class="h-1 w-1 rounded-full bg-background/70" />
              <span class="h-1 w-1 rounded-full bg-background/50" />
              <span class="h-1 w-1 rounded-full bg-background/50" />
            </span>

            <span v-else-if="option.id === 'dock'" class="absolute bottom-1.5 left-1/2 flex h-3.5 w-[42%] -translate-x-1/2 items-center justify-evenly rounded-full bg-muted-foreground/25">
              <span class="h-1.5 w-1.5 rounded-full bg-background/70" />
              <span class="h-1.5 w-1.5 rounded-full bg-background/50" />
              <span class="h-1.5 w-1.5 rounded-full bg-background/50" />
              <span class="h-1.5 w-1.5 rounded-full bg-background/50" />
            </span>

            <span v-else-if="option.id === 'top'" class="absolute inset-x-1.5 top-1.5 flex h-3.5 items-center gap-1.5 rounded-full bg-muted-foreground/25 px-2">
              <span class="h-1 w-5 rounded-full bg-background/70" />
              <span class="h-1 w-5 rounded-full bg-background/50" />
              <span class="h-1 w-5 rounded-full bg-background/50" />
            </span>

            <span v-else class="absolute left-1.5 top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-muted-foreground/25">
              <span class="h-0.5 w-1.5 rounded-full bg-background/80" />
            </span>
          </span>

          <span class="px-1 pb-1">
            <span class="block text-sm font-medium">{{ option.label }}</span>
            <span class="block text-xs text-muted-foreground">{{ option.description }}</span>
          </span>

          <span
            v-if="navStyle === option.id"
            class="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground"
          >
            <Check class="h-3 w-3" />
          </span>
        </button>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs text-muted-foreground">
          A escolha vale neste navegador. No celular, o menu continua sendo a dock de baixo.
        </p>
        <Button v-if="navStyle !== DEFAULT_NAV_STYLE" variant="ghost" size="sm" @click="navStyle = DEFAULT_NAV_STYLE">
          Voltar ao padrão
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Button } from '@/c';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DEFAULT_NAV_STYLE, NAV_STYLES, navStyle, type NavStyle } from '@/lib/navStyle';
import { Check } from 'lucide-vue-next';

// Reserva o espaço do menu na miniatura (classes completas, para o Tailwind encontrá-las)
const CONTENT_PADDING: Record<NavStyle, string> = {
  sidebar: 'pl-[30%] pt-3',
  compact: 'pl-[15%] pt-3',
  dock: 'pt-3 pb-7',
  top: 'pt-7',
  minimal: 'pt-7',
};
</script>