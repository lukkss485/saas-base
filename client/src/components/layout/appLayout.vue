<template>
  <TooltipProvider>
    <div :class="[
      'min-h-screen bg-white text-neutral-900 transition-colors duration-300 dark:bg-neutral-900 dark:text-neutral-100',
      'p-2.5 md:p-3',
      navigationLayout === 'attached' ? 'md:p-0' : '',
    ]">
      <!-- Fundo da gaveta mobile -->
      <Transition name="nt-fade">
        <div v-if="mobileOpen" class="nt-sidebar-backdrop fixed inset-0 z-[55] md:hidden" @click="mobileOpen = false" />
      </Transition>

      <div :class="[
        'flex min-h-full md:min-h-[calc(100vh-1.5rem)]',
        navigationLayout === 'attached' ? 'gap-0 md:min-h-screen' : 'gap-3',
      ]">
        <!-- SIDEBAR LIQUID GLASS -->
        <aside v-if="!isDesktop || isSidebarLayout" :class="[
          'nt-sidebar nt-liquid nt-liquid--panel z-[50] flex w-56 shrink-0 flex-col overflow-hidden p-5',
          'fixed inset-y-2.5 left-2.5 md:sticky md:inset-auto md:self-start',
          navigationLayout === 'attached'
            ? 'nt-liquid--attached md:top-0 md:h-screen md:border-r md:border-neutral-200 dark:md:border-neutral-800'
            : 'md:top-3 md:h-[calc(100vh-1.5rem)]',
          mobileOpen
            ? 'visible translate-x-0'
            : 'invisible translate-x-[-110%] md:visible md:translate-x-0',
          iconOnly ? 'md:w-16 md:p-3' : '',
        ]">
          <div class="flex w-full min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
            <RouterLink to="/dashboard" class="mb-8 flex h-10 items-center" @click="mobileOpen = false">
              <img src="/logo.png" alt="logo" class="h-10 w-10 shrink-0 rounded-md" />

              <span :class="[labelClass, 'font-semibold']">
                nt-life
              </span>
            </RouterLink>

            <!-- Navegação principal -->
            <nav class="grid gap-1 text-sm">
              <Tooltip v-for="item in items" :key="item.to">
                <TooltipTrigger as-child>
                  <RouterLink :to="item.to" :class="navClass(isActive(item.to))" @click="mobileOpen = false">
                    <component :is="item.icon" class="h-4 w-4 shrink-0" />
                    <span :class="labelClass">{{ item.label }}</span>
                  </RouterLink>
                </TooltipTrigger>

                <TooltipContent v-if="iconOnly" side="right" :side-offset="8">
                  {{ item.label }}
                </TooltipContent>
              </Tooltip>
            </nav>

            <div class="mt-auto space-y-4 pt-6">
              <div class="flex flex-col gap-1 border-t border-neutral-200/70 pt-4 dark:border-white/10">
                <!-- Perfil mobile -->
                <RouterLink to="/profile" aria-label="Abrir meu perfil"
                  :class="navClass(isActive('/profile'), 'md:hidden')" @click="mobileOpen = false">
                  <img v-if="showAvatar" :src="avatarSrc" alt="" @error="avatarFailed = true"
                    class="h-6 w-6 shrink-0 rounded-full object-cover" />

                  <div v-else
                    class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-neutral-200 text-[10px] font-semibold text-neutral-800 ring-1 ring-neutral-300 dark:bg-neutral-700 dark:text-neutral-100 dark:ring-neutral-600">
                    {{ initials }}
                  </div>

                  <span :class="labelClass">
                    {{ displayName || 'Meu perfil' }}
                  </span>
                </RouterLink>

                <!-- Configurações e ajuda -->
                <nav class="grid gap-1 text-sm">
                  <Tooltip v-for="link in bottomItems" :key="link.to">
                    <TooltipTrigger as-child>
                      <RouterLink :to="link.to" :class="navClass(isActive(link.to))" @click="mobileOpen = false">
                        <component :is="link.icon" class="h-4 w-4 shrink-0" />
                        <span :class="labelClass">{{ link.label }}</span>
                      </RouterLink>
                    </TooltipTrigger>

                    <TooltipContent v-if="iconOnly" side="right" :side-offset="8">
                      {{ link.label }}
                    </TooltipContent>
                  </Tooltip>
                </nav>

                <Tooltip>
                  <TooltipTrigger as-child>
                    <button type="button" :class="navClass(false, LOGOUT_CLASS)" @click="logout">
                      <LogOut class="h-4 w-4 shrink-0" />
                      <span :class="labelClass">Sair</span>
                    </button>
                  </TooltipTrigger>

                  <TooltipContent v-if="iconOnly" side="right">
                    Sair
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </aside>

        <!-- PÁGINA-->
        <div :class="[
          'flex min-h-full min-w-0 flex-1 flex-col bg-transparent md:min-h-0',
          navigationLayout === 'vertical-left' ? 'md:ml-14' : '',
          navigationLayout === 'vertical-right' ? 'md:mr-14' : '',
        ]">


          <layoutHeader />


          <!-- CONTEÚDO NORMAL: NÃO É GLASS -->
          <main :class="[
            'relative z-0 flex-1 overflow-x-hidden px-4 md:px-6',
            navigationLayout === 'dock' ? 'pb-28 md:pb-24' : 'pb-28 md:pb-6',
          ]">
            <Transition name="nt-page" mode="out-in">
              <div :key="route.fullPath">
                <slot />
              </div>
            </Transition>
          </main>
        </div>
      </div>

      <!-- DOCK HORIZONTAL LIQUID GLASS -->
      <Transition name="nt-nav-dock">
        <nav v-if="isDesktop && navigationLayout === 'dock'"
          class="nt-liquid nt-liquid--capsule nt-desktop-dock fixed bottom-4 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto p-2"
          aria-label="Navegação principal">
          <Tooltip v-for="item in dockItems" :key="item.to">
            <TooltipTrigger as-child>
              <RouterLink :to="item.to" :aria-label="item.label" :title="item.label"
                class="grid size-10 shrink-0 place-items-center rounded-full transition-all duration-200 active:scale-90"
                :class="isActive(item.to)
                  ? 'bg-blue-500/15 text-blue-700 shadow-[inset_0_0_0_1px_rgb(59_130_246/0.20)] dark:bg-blue-400/15 dark:text-blue-200'
                  : 'text-muted-foreground hover:bg-white/30 hover:text-foreground dark:hover:bg-white/10'">
                <component :is="item.icon" class="size-5" />
              </RouterLink>
            </TooltipTrigger>

            <TooltipContent side="top">
              {{ item.label }}
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" class="mx-1 h-6" />

          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon"
                class="size-10 shrink-0 rounded-full text-muted-foreground hover:text-destructive" aria-label="Sair"
                @click="logout">
                <LogOut class="size-5" />
              </Button>
            </TooltipTrigger>

            <TooltipContent side="top">
              Sair
            </TooltipContent>
          </Tooltip>
        </nav>
      </Transition>

      <!-- DOCK VERTICAL LIQUID GLASS -->
      <Transition name="nt-nav-dock">
        <nav v-if="
          isDesktop &&
          (navigationLayout === 'vertical-left' ||
            navigationLayout === 'vertical-right')
        " :class="[
            'nt-liquid nt-liquid--capsule nt-vertical-dock fixed top-1/2 z-40 flex max-h-[80vh] -translate-y-1/2 flex-col items-center gap-1 overflow-y-auto p-2',
            navigationLayout === 'vertical-left' ? 'left-3' : 'right-3',
          ]" aria-label="Navegação principal">
          <Tooltip v-for="item in dockItems" :key="item.to">
            <TooltipTrigger as-child>
              <RouterLink :to="item.to" :aria-label="item.label" :title="item.label"
                class="grid size-10 shrink-0 place-items-center rounded-full transition-all duration-200 active:scale-90"
                :class="isActive(item.to)
                  ? 'bg-blue-500/15 text-blue-700 shadow-[inset_0_0_0_1px_rgb(59_130_246/0.20)] dark:bg-blue-400/15 dark:text-blue-200'
                  : 'text-muted-foreground hover:bg-white/30 hover:text-foreground dark:hover:bg-white/10'">
                <component :is="item.icon" class="size-5" />
              </RouterLink>
            </TooltipTrigger>

            <TooltipContent :side="navigationLayout === 'vertical-left' ? 'right' : 'left'">
              {{ item.label }}
            </TooltipContent>
          </Tooltip>

          <Separator class="my-1 w-6" />

          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon"
                class="size-10 shrink-0 rounded-full text-muted-foreground hover:text-destructive" aria-label="Sair"
                @click="logout">
                <LogOut class="size-5" />
              </Button>
            </TooltipTrigger>

            <TooltipContent :side="navigationLayout === 'vertical-left' ? 'right' : 'left'">
              Sair
            </TooltipContent>
          </Tooltip>
        </nav>
      </Transition>

      <!-- SPOTLIGHT GLOBAL -->
      <GlobalSpotlight :open="assistantOpen" :tasks="tasks" :events="events" :current-path="route.path"
        :current-title="pageHeader.title || 'Página atual'" @close="closeAssistant" @search="handleAssistantSearch"
        @select="openAssistantResult" />

      <!-- NAVEGAÇÃO MOBILE LIQUID GLASS -->
      <Transition name="nt-fade">
        <div
          class="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 flex items-center justify-between gap-2 md:hidden">
          <nav class="nt-liquid nt-liquid--capsule nt-mobile-navigation flex items-center gap-1 p-1.5"
            aria-label="Navegação principal">
            <RouterLink v-for="tab in mobileTabs" :key="tab.to" :to="tab.to" :aria-label="tab.label" :title="tab.label"
              class="grid h-11 w-11 place-items-center rounded-full transition-all duration-200 active:scale-90" :class="isActive(tab.to)
                ? 'bg-blue-500/15 text-blue-700 shadow-[inset_0_0_0_1px_rgb(59_130_246/0.20)] dark:bg-blue-400/15 dark:text-blue-200'
                : 'text-neutral-500 hover:bg-white/30 dark:text-neutral-400 dark:hover:bg-white/10'">
              <component :is="tab.icon" class="h-5 w-5" />
            </RouterLink>
          </nav>

          <button type="button" aria-label="Abrir menu" title="Menu"
            class="nt-liquid nt-liquid--capsule nt-mobile-menu relative grid h-14 w-14 shrink-0 place-items-center transition-transform duration-200 active:scale-90"
            @click="mobileOpen = !mobileOpen">
            <Menu class="h-5 w-5" />
          </button>
        </div>
      </Transition>
    </div>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { pageHeader } from '@/lib/pageHeader';
import layoutHeader from './AppLayoutHeader.vue';
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';


import {
  useRoute,
  useRouter,
  RouterLink,
} from 'vue-router';

import { useQueryClient } from '@tanstack/vue-query';

import {
  onClickOutside,
  useEventListener,
  useMediaQuery,
} from '@vueuse/core';

import { toast } from 'vue-sonner';

import {
  Button,
  buttonVariants,
} from '@/components/ui/button';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { Separator } from '@/components/ui/separator';

import {
  useDashboard,
  useMe,
  useTasks,
} from '@/queries/tasks';

import {
  globalSearch,
  sidebarCollapsed as collapsed,
} from '@/lib/ui';


import { cn } from '@/lib/utils';

import type {
  ActivityEvent,
  EventKind,
  Range,
} from '@/lib/types';

import {
  Home,
  CreditCard,
  Wallet,
  Settings,
  Bug,
  LogOut,
  Menu,
  Search,
  Bell,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize,
  Minimize,
  ListChecks,
  CalendarDays,
  BarChart3,
  Users,
  FolderKanban,
  UserRound,
} from 'lucide-vue-next';

import { lastSeen } from '@/lib/notify';
import { navigationLayout } from '@/lib/navigationAppearance';

import GlobalSpotlight from './GlobalSpotlight.vue';


/* =========================================
   ROTAS E QUERIES
========================================= */

const route = useRoute();
const router = useRouter();

const queryClient = useQueryClient();

const meQuery = useMe();
const tasksQuery = useTasks();
const dashQuery = useDashboard(ref<Range>(7));

const me = computed(
  () => meQuery.data.value ?? null,
);

const tasks = computed(
  () => tasksQuery.data.value?.tasks ?? [],
);

export const events = computed<ActivityEvent[]>(
  () => dashQuery.data.value?.events ?? [],
);

/* =========================================
   NAVEGAÇÃO CONFIGURÁVEL
========================================= */

const isDesktop = useMediaQuery('(min-width: 768px)');

const isSidebarLayout = computed(
  () =>
    navigationLayout.value === 'sidebar' ||
    navigationLayout.value === 'attached',
);

const iconOnly = computed(
  () => collapsed.value && isDesktop.value,
);

/* =========================================
   LABELS E CLASSES
========================================= */

const labelClass = computed(() =>
  cn(
    'whitespace-nowrap overflow-hidden transition-[max-width,opacity,margin] duration-300 ease-out',
    iconOnly.value
      ? 'max-w-0 opacity-0 ml-0'
      : 'max-w-[10rem] opacity-100 ml-2.5',
  ),
);

const LOGOUT_CLASS =
  'text-neutral-600 hover:bg-red-100 hover:text-red-700 dark:text-neutral-300 dark:hover:bg-red-950 dark:hover:text-red-300';

function navClass(
  active: boolean,
  extra = '',
): string {
  return cn(
    buttonVariants({
      variant: 'secondary',
      size: 'default',
    }),
    'h-10 w-full justify-start gap-0 rounded-xl px-3 py-0! text-sm font-normal',
    'transition-[padding,background-color,color] duration-300 ease-out',
    extra,
    'dark:bg-transparent dark:hover:bg-neutral-500/50',
    active
      ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
      : '',
  );
}

/* =========================================
   ITENS DA NAVEGAÇÃO
========================================= */

const items = [
  { to: '/dashboard', label: 'Início', icon: Home },
  { to: '/projects', label: 'Projetos', icon: FolderKanban },
  { to: '/tasks', label: 'Tarefas', icon: ListChecks },
  { to: '/calendar', label: 'Calendário', icon: CalendarDays },
  { to: '/finance', label: 'Financeiro', icon: Wallet },
  { to: '/reports', label: 'Relatórios', icon: BarChart3 },
  { to: '/team', label: 'Equipe', icon: Users },
  { to: '/notifications', label: 'Notificações', icon: Bell },
  { to: '/billing', label: 'Plano', icon: CreditCard },
];

const bottomItems = [
  { to: '/settings', label: 'Configurações', icon: Settings },
  { to: '/bug-report', label: 'Reportar bug', icon: Bug },
];

const mobileTabs = [
  { to: '/dashboard', label: 'Início', icon: Home },
  { to: '/tasks', label: 'Tarefas', icon: ListChecks },
  { to: '/calendar', label: 'Calendário', icon: CalendarDays },
  { to: '/finance', label: 'Financeiro', icon: Wallet },
  { to: '/projects', label: 'Projetos', icon: FolderKanban },
];

const dockItems = computed(() => [
  ...items,
  {
    to: '/profile',
    label: 'Perfil',
    icon: UserRound,
  },
  ...bottomItems,
]);

/* =========================================
   NOTIFICAÇÕES
========================================= */

export const KIND_LABEL: Record<EventKind, string> = {
  created: 'Nova tarefa',
  completed: 'Tarefa concluída',
  reopened: 'Tarefa reaberta',
  edited: 'Tarefa editada',
  deleted: 'Tarefa excluída',
};

export const notifOpen = ref(false);
const notifRef = ref<HTMLElement | null>(null);

onClickOutside(notifRef, () => {
  notifOpen.value = false;
});

export const unread = computed(
  () =>
    events.value.filter(
      (event) =>
        new Date(event.created_at).getTime() > lastSeen.value,
    ).length,
);

export function toggleNotif(): void {
  notifOpen.value = !notifOpen.value;

  if (notifOpen.value) {
    lastSeen.value = Date.now();
  }
}

/* =========================================
   ALERTAS DO NAVEGADOR
========================================= */

export const canNotify =
  typeof window !== 'undefined' &&
  'Notification' in window;

export const permission = ref<NotificationPermission>(
  canNotify ? Notification.permission : 'denied',
);

export async function enableNotifications(): Promise<void> {
  if (!canNotify) return;

  permission.value = await Notification.requestPermission();

  if (permission.value === 'granted') {
    toast.success('Alertas do navegador ativados');
  }
}

const seenIds = new Set<number>();

watch(events, (list) => {
  for (const event of list) {
    if (seenIds.has(event.id)) continue;

    seenIds.add(event.id);

    const isRecent =
      Date.now() - new Date(event.created_at).getTime() < 60_000;

    if (
      isRecent &&
      document.hidden &&
      permission.value === 'granted'
    ) {
      new Notification(KIND_LABEL[event.kind], {
        body: event.title,
        tag: `task-${event.id}`,
      });
    }
  }
});

/* =========================================
   MOBILE
========================================= */

const mobileOpen = ref(false);

/* =========================================
   TEMA
========================================= */

export const isDark = ref(
  document.documentElement.classList.contains('dark'),
);

export function toggleTheme(): void {
  const dark =
    document.documentElement.classList.toggle('dark');

  localStorage.setItem(
    'theme',
    dark ? 'dark' : 'light',
  );

  isDark.value = dark;
}

/* =========================================
   TELA CHEIA
========================================= */

export const isFullscreen = ref(
  !!document.fullscreenElement,
);

useEventListener(document, 'fullscreenchange', () => {
  isFullscreen.value = !!document.fullscreenElement;
});

export async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    toast.error('Tela cheia não disponível neste navegador');
  }
}

/* =========================================
   SPOTLIGHT GLOBAL
========================================= */

export const assistantOpen = ref(false);

export function openAssistant(): void {
  notifOpen.value = false;
  assistantOpen.value = true;
}

export function closeAssistant(): void {
  assistantOpen.value = false;
}

export function handleAssistantSearch(value: string): void {
  globalSearch.value = value;
}

export function openAssistantResult(
  result: { href: string },
): void {
  assistantOpen.value = false;

  if (result.href) {
    router.push(result.href);
  }
}

/* =========================================
   ATALHOS GLOBAIS
========================================= */

useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  const tag = target?.tagName;

  const isTyping =
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target?.isContentEditable;

  if (event.key === 'Escape') {
    if (assistantOpen.value) {
      assistantOpen.value = false;
      return;
    }

    notifOpen.value = false;
    mobileOpen.value = false;
  }

  if (
    event.key === '/' &&
    !isTyping &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  ) {
    event.preventDefault();
    openAssistant();
  }
});

/* =========================================
   PERFIL
========================================= */

export const displayName = computed(
  () =>
    me.value?.name ||
    me.value?.email?.split('@')[0] ||
    '',
);

export const initials = computed(() => {
  const parts = displayName.value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2);

  const letters = parts
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return letters || '?';
});

export const avatarSrc = computed<string | undefined>(
  () => me.value?.avatar ?? undefined,
);

export const avatarFailed = ref(false);

export const showAvatar = computed(
  () => !!avatarSrc.value && !avatarFailed.value,
);

watch(avatarSrc, () => {
  avatarFailed.value = false;
});

export const planLabel = computed(
  () => me.value?.plan === 'pro' ? 'Plano Pro' : 'Plano Free',
);

/* =========================================
   ROTAS
========================================= */

export function isActive(to: string): boolean {
  return route.path === to;
}

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
    notifOpen.value = false;
  },
);

/* =========================================
   LOGOUT
========================================= */

function logout(): void {
  localStorage.removeItem('token');
  queryClient.clear();
  router.push('/login');
}
</script>

<style>
/* =========================================
   SIDEBAR
========================================= */

.nt-sidebar {
  transition:
    transform 350ms cubic-bezier(0.22, 1, 0.36, 1),
    visibility 350ms,
    width 350ms cubic-bezier(0.22, 1, 0.36, 1),
    padding 350ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 300ms ease;
}

@media (min-width: 768px) {
  .nt-sidebar.nt-liquid {
    position: sticky;
  }
}

/* =========================================
SPECULAR HIGHLIGHT — SÓ BRILHO
========================================= */

.nt-glass {
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    padding: 1px;
    background: linear-gradient(135deg,
        rgba(255, 255, 255, 0.95) 0%,
        rgba(255, 255, 255, 0.45) 20%,
        rgba(255, 255, 255, 0.08) 45%,
        rgba(255, 255, 255, 0.35) 75%,
        rgba(255, 255, 255, 0.85) 100%);

    pointer-events: none;
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }
}

.lg-header-control {
  display: grid;

  width: clamp(42px, calc(52px - 0.45cqi), 50px);
  height: clamp(42px, calc(52px - 0.45cqi), 50px);

  flex: 0 0 auto;
  place-items: center;
  padding: 4px;
}

.lg-header-search {
  height: clamp(38px, calc(46px - 0.36cqi), 44px);
  min-height: 38px;
}

.lg-header-profile {
  height: clamp(42px, calc(52px - 0.45cqi), 50px);
  min-height: 42px;
}

.lg-header-profile-active {
  border-color: rgb(59 130 246 / 0.42);
  background-color: rgb(59 130 246 / 0.10);
}

.dark .lg-header-profile-active {
  border-color: rgb(147 197 253 / 0.32);
  background-color: rgb(59 130 246 / 0.15);
}

/* =========================================
   POPOVER
========================================= */

.lg-header-popover {
  border-radius: 1.25rem;
}

/* =========================================
   NAVEGAÇÃO MOBILE
========================================= */

.nt-mobile-navigation {
  flex: 1;
  min-width: 0;
}

.nt-mobile-menu {
  color: rgb(82 82 91);
}

.dark .nt-mobile-menu {
  color: rgb(212 212 216);
}

/* =========================================
   BACKDROP MOBILE
========================================= */

:root {
  --nt-sidebar-backdrop-blur: 7px;
  --nt-sidebar-backdrop-tint: 0.20;
  --nt-sidebar-backdrop-dark-tint: 0.34;
}

.nt-sidebar-backdrop {
  background-color: rgb(15 23 42 / var(--nt-sidebar-backdrop-tint));

  -webkit-backdrop-filter: blur(var(--nt-sidebar-backdrop-blur));
  backdrop-filter: blur(var(--nt-sidebar-backdrop-blur));

  transition:
    opacity 250ms ease,
    backdrop-filter 250ms ease;
}

.dark .nt-sidebar-backdrop {
  background-color: rgb(0 0 0 / var(--nt-sidebar-backdrop-dark-tint));
}

/* =========================================
   DOCKS
========================================= */

.nt-desktop-dock {
  transform-origin: center bottom;
}

.nt-vertical-dock {
  transform-origin: center center;
}

.nt-nav-dock-enter-active,
.nt-nav-dock-leave-active {
  transition:
    opacity 220ms ease,
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 220ms ease;
}

.nt-nav-dock-enter-from,
.nt-nav-dock-leave-to {
  opacity: 0;
  filter: blur(5px);
}

.nt-desktop-dock.nt-nav-dock-enter-from,
.nt-desktop-dock.nt-nav-dock-leave-to {
  transform: translate(-50%, 14px) scale(0.96);
}

.nt-vertical-dock.nt-nav-dock-enter-from,
.nt-vertical-dock.nt-nav-dock-leave-to {
  transform: translateY(calc(-50% + 12px)) scale(0.96);
}

/* =========================================
   FADE
========================================= */

.nt-fade-enter-active,
.nt-fade-leave-active {
  transition: opacity 250ms ease;
}

.nt-fade-enter-from,
.nt-fade-leave-to {
  opacity: 0;
}

/* =========================================
   TROCA DE PÁGINA
========================================= */

.nt-page-enter-active,
.nt-page-leave-active {
  transition:
    opacity 250ms ease,
    transform 250ms cubic-bezier(0.22, 1, 0.36, 1);
}

.nt-page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.nt-page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* =========================================
   NOTIFICAÇÕES
========================================= */

.nt-pop-enter-active,
.nt-pop-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.nt-pop-enter-from,
.nt-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

/* =========================================
   ACESSIBILIDADE
========================================= */

@media (prefers-reduced-motion: reduce) {

  .nt-sidebar,
  .nt-liquid,
  .nt-liquid::before,
  .nt-liquid::after,
  .nt-page-enter-active,
  .nt-page-leave-active,
  .nt-fade-enter-active,
  .nt-fade-leave-active,
  .nt-pop-enter-active,
  .nt-pop-leave-active,
  .nt-nav-dock-enter-active,
  .nt-nav-dock-leave-active {
    transition-duration: 1ms !important;
  }
}
</style>
