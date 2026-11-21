
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import {
  PanelLeftOpen,
  PanelLeftClose,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-vue-next'

import { sidebarCollapsed } from '@/lib/ui'
import { pageHeader } from '@/lib/pageHeader'
import { ui } from '@/components/ui_kit/glass'
import { useMe } from '@/queries/tasks'

/* =========================================
   USUÁRIO AUTENTICADO
========================================= */

const meQuery = useMe()

const me = computed(() => meQuery.data.value ?? null)

const displayName = computed(() => {
  return (
    me.value?.name?.trim() ||
    me.value?.email?.split('@')[0] ||
    'Meu perfil'
  )
})

const avatarSrc = computed(() => me.value?.avatar || '')

const initials = computed(() => {
  const parts = displayName.value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  return (
    parts.map(part => part.charAt(0)).join('').toUpperCase() ||
    '?'
  )
})

const avatarFailed = ref(false)

const showAvatar = computed(
  () => Boolean(avatarSrc.value) && !avatarFailed.value,
)

watch(avatarSrc, () => {
  avatarFailed.value = false
})

/* =========================================
   SIDEBAR
========================================= */

function toggleSidebar(): void {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

/* =========================================
   TEMA
========================================= */

const isDark = ref(
  document.documentElement.classList.contains('dark'),
)

const currentScheme = computed(
  () => isDark.value ? 'dark' : 'light',
)

function toggleTheme(): void {
  const dark = document.documentElement.classList.toggle('dark')

  localStorage.setItem(
    'theme',
    dark ? 'dark' : 'light',
  )

  isDark.value = dark
}

/* =========================================
   LIQUID GLASS — HEADER
========================================= */

const headerGlassStyle = computed(() => {
  const glass = ui.glass({
    scheme: currentScheme.value,
    radius: 'small',
    blur: 'medium',
    tintColor: 'primary',
    progressive: true,
  })

  return {
    ...glass,
    backgroundColor: `color-mix(in srgb, ${glass.backgroundColor} 65%, transparent)`,
  }
})

/* =========================================
   LIQUID GLASS — CONTROLS
========================================= */

const controlGlassStyle = computed(() => {
  const glass = ui.glass({
    scheme: currentScheme.value,
    radius: 'extralarge',
    blur: 'large',
    tintColor: 'secondary',
    progressive: false,
  })

  return {
    ...glass,
    borderRadius: '9999px',
    borderWidth: '1px',
    borderStyle: 'solid',
    backgroundColor: `color-mix(in srgb, ${glass.backgroundColor} 55%, transparent)`,
  }
})
</script>

<template>
  <header
    :style="headerGlassStyle"
    class="
      sticky top-0 z-50
      flex min-h-16 w-full items-center justify-between gap-3
      px-3 py-3 md:px-6
      transition-colors duration-300
    "
  >
    <!-- =====================================
         ESQUERDA
    ====================================== -->

    <div class="flex min-w-0 flex-1 items-center gap-3">

      <!-- Sidebar -->
      <button
        type="button"
        :style="controlGlassStyle"
        class="
          group flex size-10 shrink-0 items-center justify-center
          transition-all duration-300
          hover:brightness-105
          active:scale-95
        "
        :aria-label="
          sidebarCollapsed
            ? 'Expandir sidebar'
            : 'Minimizar sidebar'
        "
        :aria-expanded="!sidebarCollapsed"
        @click="toggleSidebar"
      >
        <component
          :is="sidebarCollapsed ? PanelLeftOpen : PanelLeftClose"
          class="size-5 transition-transform duration-300"
        />
      </button>

      <!-- Título e subtítulo -->
      <div class="flex min-w-0 flex-1 flex-col justify-center">

        <h1
          v-if="pageHeader.title"
          class="truncate text-base font-semibold leading-tight"
        >
          {{ pageHeader.title }}
        </h1>

        <p
          v-if="pageHeader.subtitle"
          class="
            truncate text-xs
            text-neutral-500
            dark:text-neutral-400
          "
        >
          {{ pageHeader.subtitle }}
        </p>

      </div>
    </div>

    <!-- =====================================
         DIREITA
    ====================================== -->

    <div class="flex shrink-0 items-center gap-2">

      <!-- Alternar tema -->
      <button
        type="button"
        :style="controlGlassStyle"
        class="
          flex size-10 shrink-0 items-center justify-center
          transition-all duration-300
          hover:brightness-105
          active:scale-95
        "
        :aria-label="
          isDark
            ? 'Ativar tema claro'
            : 'Ativar tema escuro'
        "
        @click="toggleTheme"
      >
        <Transition name="theme-icon" mode="out-in">
          <Sun
            v-if="isDark"
            key="sun"
            class="size-[18px]"
          />

          <Moon
            v-else
            key="moon"
            class="size-[18px]"
          />
        </Transition>
      </button>

      <!-- =================================
           PERFIL DO USUÁRIO
      ================================== -->

      <RouterLink
        to="/profile"
        :style="controlGlassStyle"
        class="
          group flex max-w-[220px] min-w-0
          items-center gap-2
          rounded-full py-1 pl-1 pr-2.5
          transition-all duration-300
          hover:brightness-105
          active:scale-[0.98]
          md:pr-3
        "
        aria-label="Abrir meu perfil"
      >

        <!-- Avatar -->
        <div
          class="
            relative size-9 shrink-0 overflow-hidden
            rounded-full
            bg-neutral-200
            ring-1 ring-black/10
            dark:bg-neutral-700
            dark:ring-white/10
          "
        >

          <!-- Foto real -->
          <img
            v-if="showAvatar"
            :src="avatarSrc"
            alt="Foto de perfil"
            class="size-full object-cover"
            @error="avatarFailed = true"
          />

          <!-- Fallback -->
          <div
            v-else
            class="
              grid size-full place-items-center
              text-xs font-semibold
              text-neutral-700
              dark:text-neutral-100
            "
          >
            {{ initials }}
          </div>

        </div>

        <!-- Nome -->
        <div class="hidden min-w-0 flex-col md:flex">

          <span class="max-w-36 truncate text-sm font-medium leading-tight">
            {{ displayName }}
          </span>

          <span
            v-if="me?.plan"
            class="
              truncate text-[10px] leading-tight
              text-neutral-500
              dark:text-neutral-400
            "
          >
            {{ me.plan === 'pro' ? 'Plano Pro' : 'Plano Free' }}
          </span>

        </div>

        <!-- Indicador -->
        <ChevronRight
          class="
            hidden size-3.5 shrink-0
            text-neutral-400
            transition-transform duration-300
            group-hover:translate-x-0.5
            md:block
          "
        />

      </RouterLink>

    </div>
  </header>
</template>

<style scoped>
.theme-icon-enter-active,
.theme-icon-leave-active {
  transition:
    opacity 250ms ease,
    transform 250ms ease;
}

.theme-icon-enter-from {
  opacity: 0;
  transform: rotate(-35deg) scale(0.7);
}

.theme-icon-leave-to {
  opacity: 0;
  transform: rotate(35deg) scale(0.7);
}

@media (prefers-reduced-motion: reduce) {
  .theme-icon-enter-active,
  .theme-icon-leave-active {
    transition: none;
  }
}
</style>
