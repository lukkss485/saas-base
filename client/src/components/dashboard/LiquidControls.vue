<template>
  <div class="grid gap-4">
    <div v-for="c in CONTROLS" :key="c.key" class="grid gap-2">
      <div class="flex items-center justify-between text-sm">
        <span class="font-medium">{{ c.label }}</span>
        <span class="tabular-nums text-muted-foreground">{{ format(c) }}</span>
      </div>
      <input
        type="range"
        :min="c.min"
        :max="c.max"
        :step="c.step"
        :value="liquidSettings[c.key]"
        class="w-full accent-primary"
        @input="onRange(c.key, $event)"
      />
      <p class="text-xs text-muted-foreground">{{ c.hint }}</p>
    </div>

    <div class="flex justify-end">
      <Button variant="outline" size="sm" @click="resetLiquid">Restaurar padrão</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { liquidSettings, resetLiquid, type LiquidSettings } from '@/lib/liquid';

type Control = {
  key: keyof LiquidSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  hint: string;
  suffix?: string;
};

const CONTROLS: Control[] = [
  { key: 'stiffness', label: 'Rigidez', min: 60, max: 320, step: 5, hint: 'Velocidade com que o indicador chega à aba.' },
  { key: 'damping', label: 'Amortecimento', min: 4, max: 30, step: 1, hint: 'Menor valor = mais quique ao parar.' },
  { key: 'stretch', label: 'Estiramento', min: 0, max: 1, step: 0.05, hint: 'Quanto ele estica na horizontal durante o movimento.' },
  { key: 'opacity', label: 'Opacidade', min: 0.3, max: 1, step: 0.05, hint: 'Transparência da pílula.' },
  { key: 'blur', label: 'Desfoque de vidro', min: 0, max: 12, step: 1, hint: 'Efeito de vidro atrás da pílula.', suffix: 'px' },
];

// Atualiza a configuração a partir do slider (tipado, sem lógica no template)
function onRange(key: keyof LiquidSettings, e: Event): void {
  liquidSettings[key] = Number((e.target as HTMLInputElement).value);
}

function format(c: Control): string {
  const v = liquidSettings[c.key];
  const text = c.key === 'stretch' ? `${Math.round(v * 100)}%` : Number(v).toFixed(c.step < 1 ? 2 : 0);
  return `${text}${c.suffix ?? ''}`;
}
</script>