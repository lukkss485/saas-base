<script setup lang="ts">
import { timeAgo } from '@/lib/format';
import {
  globalSearch,
  sidebarCollapsed as collapsed,
} from '@/lib/ui';
import { avatarFailed, avatarSrc, canNotify, displayName, enableNotifications, events, initials, isActive, isDark, KIND_LABEL, notifOpen, openAssistant, permission, planLabel, showAvatar, toggleFullscreen, toggleNotif, toggleTheme, unread } from './AppLayout.vue';
import { isFullscreen } from './AppLayout.vue';
import { pageHeader } from '@/lib/pageHeader.js';
</script>
<template>
  <!-- HEADER LIQUID GLASS -->
  <header class="nt-header nt-glass sticky top-0 z-50 flex items-center gap-2 px-3 py-3 md:px-6">
    <!-- Controles -->
    <div class="relative z-[2] hidden gap-2 md:flex">
      <!-- Sidebar -->
      <div class="lg-glass nt-liquid nt-liquid--capsule lg-header-control">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon" class="hover:bg-transparent"
              :aria-label="collapsed ? 'Expandir sidebar' : 'Minimizar sidebar'" @click="collapsed = !collapsed">
              <PanelLeftOpen v-if="collapsed" class="h-5 w-5" />
              <PanelLeftClose v-else class="h-5 w-5" />
            </Button>
          </TooltipTrigger>

          <TooltipContent>
            {{ collapsed ? 'Expandir sidebar' : 'Minimizar sidebar' }}
          </TooltipContent>
        </Tooltip>
      </div>

      <!-- Tela cheia -->
      <div class="lg-glass nt-liquid nt-liquid--capsule lg-header-control">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon" class="hover:bg-transparent" aria-label="Tela cheia"
              @click="toggleFullscreen">
              <Minimize v-if="isFullscreen" class="h-4 w-4" />
              <Maximize v-else class="h-4 w-4" />
            </Button>
          </TooltipTrigger>

          <TooltipContent>
            {{ isFullscreen ? 'Sair da tela cheia' : 'Tela cheia' }}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>

    <!-- Título e pesquisa -->
    <div class="relative z-[2] flex min-w-0 flex-1 items-center gap-3">
      <div v-if="pageHeader.title" class="min-w-0 shrink">
        <p class="truncate text-base font-semibold leading-tight">
          {{ pageHeader.title }}
        </p>

        <p v-if="pageHeader.subtitle" class="truncate text-xs text-neutral-500 dark:text-neutral-400">
          {{ pageHeader.subtitle }}
        </p>
      </div>

      <!-- Pesquisa global -->
      <div v-if="pageHeader.showSearch" class="w-full min-w-0 max-w-md">
        <button type="button"
          class="lg-glass nt-liquid nt-liquid--capsule lg-header-search group flex w-full items-center gap-3 px-4 text-left text-sm text-neutral-500 transition-all duration-300 hover:border-neutral-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 dark:text-neutral-400 dark:hover:border-neutral-600"
          aria-haspopup="dialog" aria-label="Abrir pesquisa global" @click="openAssistant">
          <Search class="size-4 shrink-0 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />

          <span class="min-w-0 flex-1 truncate">
            {{ globalSearch || 'Buscar em todo o NT-life...' }}
          </span>

          <kbd
            class="hidden shrink-0 rounded-md border border-neutral-200/70 bg-white/50 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900/40 sm:inline-flex">
            /
          </kbd>
        </button>
      </div>
    </div>

    <!-- Ações da direita -->
    <div class="relative z-[2] ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
      <div id="page-header-actions" class="flex items-center gap-2" />

      <!-- Tema -->
      <div class="lg-glass nt-liquid nt-liquid--capsule lg-header-control">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon" class="hover:bg-transparent"
              :aria-label="isDark ? 'Modo claro' : 'Modo escuro'" @click="toggleTheme">
              <Sun v-if="isDark" class="h-4 w-4" />
              <Moon v-else class="h-4 w-4" />
            </Button>
          </TooltipTrigger>

          <TooltipContent>
            {{ isDark ? 'Modo claro' : 'Modo escuro' }}
          </TooltipContent>
        </Tooltip>
      </div>

      <!-- Notificações -->
      <div ref="notifRef" class="relative">
        <div class="lg-glass nt-liquid nt-liquid--capsule lg-header-control">
          <Button variant="ghost" size="icon" class="hover:bg-transparent" aria-label="Notificações"
            @click="toggleNotif">
            <Bell class="h-4 w-4" />
          </Button>
        </div>

        <span v-if="unread"
          class="pointer-events-none absolute right-1 top-1 z-[4] grid h-4 min-w-[1rem] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
          {{ unread > 9 ? '9+' : unread }}
        </span>

        <!-- Popover de notificações -->
        <Transition name="nt-pop">
          <div v-if="notifOpen"
            class="lg-glass nt-liquid nt-liquid--popover lg-header-popover absolute right-0 z-[70] mt-2 w-80">
            <div
              class="relative z-[2] flex items-center justify-between border-b border-neutral-200/50 px-4 py-3 dark:border-white/10">
              <p class="text-sm font-semibold">
                Notificações
              </p>

              <Button v-if="canNotify && permission === 'default'" variant="link" size="sm" class="h-auto p-0"
                @click="enableNotifications">
                Ativar alertas
              </Button>

              <span v-else-if="permission === 'granted'" class="text-xs text-neutral-500 dark:text-neutral-400">
                Alertas ativos
              </span>
            </div>

            <ul class="relative z-[2] max-h-80 overflow-y-auto">
              <li v-for="event in events.slice(0, 8)" :key="event.id"
                class="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-neutral-100/40 dark:hover:bg-white/5">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium">
                    {{ KIND_LABEL[event.kind] }}
                  </p>

                  <p class="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {{ event.title }}
                  </p>
                </div>

                <span class="shrink-0 text-xs text-neutral-400">
                  {{ timeAgo(event.created_at) }}
                </span>
              </li>

              <li v-if="!events.length" class="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                Nenhuma notificação ainda.
              </li>
            </ul>
          </div>
        </Transition>
      </div>

      <!-- Perfil -->
      <RouterLink to="/profile" title="Meu perfil" aria-label="Abrir meu perfil"
        class="lg-glass nt-liquid nt-liquid--capsule lg-header-profile group hidden shrink-0 items-center gap-2 p-1.5 md:flex lg:pr-3"
        :class="isActive('/profile') ? 'lg-header-profile-active' : ''">
        <img v-if="showAvatar" :src="avatarSrc" alt="" @error="avatarFailed = true"
          class="h-9 w-9 shrink-0 rounded-full object-cover transition-transform duration-300 group-hover:scale-105" />

        <div v-else
          class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-800 ring-1 ring-neutral-300 transition-transform duration-300 group-hover:scale-105 dark:bg-neutral-700 dark:text-neutral-100 dark:ring-neutral-600">
          {{ initials }}
        </div>

        <div class="hidden text-left text-sm lg:block">
          <p class="font-medium leading-tight">
            {{ displayName || 'Meu perfil' }}
          </p>

          <p class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ planLabel }}
          </p>
        </div>
      </RouterLink>
    </div>
  </header>
</template>