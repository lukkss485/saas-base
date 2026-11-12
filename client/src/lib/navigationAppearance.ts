
import { ref, watch } from 'vue';

export type NavigationLayout =
  | 'sidebar'
  | 'attached'
  | 'dock'
  | 'vertical-left'
  | 'vertical-right';

const STORAGE_KEY = 'nt-life-navigation-layout';

const VALID_LAYOUTS: NavigationLayout[] = [
  'sidebar',
  'attached',
  'dock',
  'vertical-left',
  'vertical-right',
];

function getInitialLayout(): NavigationLayout {
  if (typeof window === 'undefined') {
    return 'sidebar';
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (
      saved &&
      VALID_LAYOUTS.includes(saved as NavigationLayout)
    ) {
      return saved as NavigationLayout;
    }
  } catch {
    // Mantém o padrão caso o armazenamento não esteja disponível.
  }

  return 'sidebar';
}

export const navigationLayout = ref<NavigationLayout>(
  getInitialLayout(),
);

watch(
  navigationLayout,
  (value) => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // A navegação continua funcionando mesmo sem persistência.
    }
  },
  { flush: 'sync' },
);

export function setNavigationLayout(
  layout: NavigationLayout,
): void {
  if (!VALID_LAYOUTS.includes(layout)) return;

  navigationLayout.value = layout;
}
