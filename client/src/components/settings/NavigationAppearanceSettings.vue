
<template>
  <Card class="overflow-hidden">
    <CardHeader>
      <div class="flex items-center gap-3">
        <div class="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <PanelsTopLeft class="size-5" />
        </div>

        <div class="min-w-0">
          <CardTitle>Barra de navegação</CardTitle>
          <CardDescription>
            Personalize como você navega pelo NT-life.
          </CardDescription>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Button
          v-for="option in options"
          :key="option.value"
          type="button"
          variant="outline"
          class="relative h-auto min-h-[112px] w-full justify-start rounded-2xl p-4 text-left transition-all duration-200"
          :class="
            navigationLayout === option.value
              ? 'border-primary bg-primary/5 ring-2 ring-primary/15'
              : 'border-border hover:border-primary/40 hover:bg-muted/50'
          "
          :aria-pressed="navigationLayout === option.value"
          @click="setNavigationLayout(option.value)"
        >
          <div class="flex w-full flex-col gap-3">
            <div class="flex items-center justify-between">
              <div
                class="grid size-9 place-items-center rounded-xl"
                :class="
                  navigationLayout === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                "
              >
                <component :is="option.icon" class="size-5" />
              </div>

              <Badge
                v-if="navigationLayout === option.value"
                variant="default"
                class="rounded-full"
              >
                Ativo
              </Badge>

              <Check
                v-else
                class="size-4 text-muted-foreground/40"
              />
            </div>

            <div class="min-w-0">
              <p class="text-sm font-semibold">
                {{ option.label }}
              </p>

              <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
                {{ option.description }}
              </p>
            </div>
          </div>
        </Button>
      </div>

      <Separator />

      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-1">
          <p class="text-sm font-medium">
            Navegação atual
          </p>

          <p class="text-xs text-muted-foreground">
            {{ selectedOption?.label }}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          class="rounded-full"
          :disabled="navigationLayout === 'sidebar'"
          @click="setNavigationLayout('sidebar')"
        >
          Restaurar padrão
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import {
  Check,
  GripHorizontal,
  PanelsTopLeft,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
} from 'lucide-vue-next';

import {
  navigationLayout,
  setNavigationLayout,
  type NavigationLayout,
} from '@/lib/navigationAppearance';

import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Separator } from '@/components/ui/separator';

const options: {
  value: NavigationLayout;
  label: string;
  description: string;
  icon: typeof PanelLeft;
}[] = [
  {
    value: 'sidebar',
    label: 'Normal',
    description: 'Barra lateral tradicional do NT-life.',
    icon: PanelLeft,
  },
  {
    value: 'attached',
    label: 'Integrada à página',
    description: 'Sidebar conectada diretamente ao conteúdo.',
    icon: PanelsTopLeft,
  },
  {
    value: 'dock',
    label: 'Dock horizontal',
    description: 'Barra flutuante na parte inferior da tela.',
    icon: GripHorizontal,
  },
  {
    value: 'vertical-left',
    label: 'Dock vertical esquerda',
    description: 'Ícones flutuantes na lateral esquerda.',
    icon: PanelLeftClose,
  },
  {
    value: 'vertical-right',
    label: 'Dock vertical direita',
    description: 'Ícones flutuantes na lateral direita.',
    icon: PanelRight,
  },
];

const selectedOption = computed(() =>
  options.find(
    (option) => option.value === navigationLayout.value,
  ),
);
</script>
