import { reactive, watch } from 'vue';

export type LiquidSettings = {
  stiffness: number; // rigidez da mola (quanto maior, mais rápido chega)
  damping: number;   // amortecimento (quanto maior, menos quica)
  stretch: number;   // quanto estica na horizontal (0 a 1)
  opacity: number;   // opacidade da pílula (0 a 1)
  blur: number;      // desfoque de vidro em px (0 a 12)
};

export const LIQUID_DEFAULTS: LiquidSettings = {
  stiffness: 170,
  damping: 14,
  stretch: 0.35,
  opacity: 1,
  blur: 0,
};

const KEY = 'liquid-settings';

function load(): LiquidSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...LIQUID_DEFAULTS, ...JSON.parse(raw) } : { ...LIQUID_DEFAULTS };
  } catch {
    return { ...LIQUID_DEFAULTS };
  }
}

export const liquidSettings = reactive<LiquidSettings>(load());

watch(
  liquidSettings,
  (value) => localStorage.setItem(KEY, JSON.stringify(value)),
  { deep: true }
);

export function resetLiquid(): void {
  Object.assign(liquidSettings, LIQUID_DEFAULTS);
}