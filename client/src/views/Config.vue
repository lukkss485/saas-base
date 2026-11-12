
<template>
  <TooltipProvider>
    <div class="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 class="text-3xl font-bold tracking-tight">Configurações</h1>
        <p class="mt-1 text-muted-foreground">
          Gerencie seu perfil, preferências e dados.
        </p>
      </header>

      <!-- Perfil -->
      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Perfil</CardTitle>
            <CardDescription>Como você aparece no app.</CardDescription>
          </CardHeader>

          <CardContent class="space-y-4">
            <div class="grid gap-2">
              <Label for="cfg-name">Nome</Label>

              <div class="flex gap-2">
                <Input
                  id="cfg-name"
                  v-model="name"
                  maxlength="80"
                  placeholder="Seu nome"
                />

                <Button
                  :disabled="!nameChanged || savingName"
                  @click="saveName"
                >
                  {{ savingName ? 'Salvando...' : 'Salvar' }}
                </Button>
              </div>
            </div>

            <div class="grid gap-2">
              <Label for="cfg-email">E-mail</Label>

              <Input
                id="cfg-email"
                :model-value="me?.email ?? ''"
                disabled
              />

              <p class="text-xs text-muted-foreground">
                O e-mail não pode ser alterado.
              </p>
            </div>

            <div
              class="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
            >
              <span class="text-muted-foreground">Plano</span>

              <Badge :variant="me?.plan === 'pro' ? 'default' : 'secondary'">
                {{ me?.plan === 'pro' ? 'Pro' : 'Free' }}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <!-- Preferências -->
      <Reveal :delay="80">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Preferências</CardTitle>
            <CardDescription>
              Ajustes de aparência e comportamento.
            </CardDescription>
          </CardHeader>

          <CardContent class="divide-y">
            <div class="flex items-center justify-between py-3">
              <div>
                <p class="text-sm font-medium">Tema escuro</p>
                <p class="text-xs text-muted-foreground">
                  Muda as cores de todo o app.
                </p>
              </div>

              <Switch
                :model-value="isDark"
                @update:model-value="toggleTheme"
              />
            </div>

            <div class="flex items-center justify-between py-3">
              <div>
                <p class="text-sm font-medium">Sidebar minimizada</p>
                <p class="text-xs text-muted-foreground">
                  Mostra só os ícones no computador.
                </p>
              </div>

              <Switch
                :model-value="sidebarCollapsed"
                @update:model-value="(v) => (sidebarCollapsed = !!v)"
              />
            </div>

            <div class="flex items-center justify-between py-3">
              <div>
                <p class="text-sm font-medium">Alertas do navegador</p>
                <p class="text-xs text-muted-foreground">
                  {{ notifStatus }}
                </p>
              </div>

              <Button
                v-if="canNotify && notifPermission !== 'granted'"
                variant="outline"
                size="sm"
                :disabled="notifPermission === 'denied'"
                @click="enableNotifications"
              >
                {{ notifPermission === 'denied' ? 'Bloqueado' : 'Ativar' }}
              </Button>

              <Badge
                v-else-if="notifPermission === 'granted'"
                variant="secondary"
              >
                Ativos
              </Badge>

              <Badge v-else variant="outline">
                Indisponível
              </Badge>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <!-- Aparência da navegação -->
      <Reveal :delay="160">
        <Card class="overflow-hidden">
          <CardHeader class="gap-4">
            <div class="flex items-center gap-3">
              <div
                class="grid size-10 shrink-0 place-items-center rounded-xl bg-muted"
              >
                <PanelsTopLeft class="size-5 text-muted-foreground" />
              </div>

              <div class="min-w-0">
                <CardTitle>Barra de navegação</CardTitle>
                <CardDescription>
                  Escolha como deseja navegar pelo NT-life.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent class="space-y-4">
            <!-- Opções segmentadas -->
            <section
              class="flex flex-col gap-3"
              aria-label="Estilo da navegação"
            >
              <Label class="text-sm font-medium">
                Estilo de navegação
              </Label>

              <div
                class="grid w-full grid-cols-2 gap-1 rounded-2xl bg-muted p-1 sm:grid-cols-3 lg:grid-cols-5"
                role="group"
                aria-label="Selecionar estilo de navegação"
              >
                <Button
                  v-for="option in navigationOptions"
                  :key="option.value"
                  type="button"
                  variant="ghost"
                  size="sm"
                  :class="segClass(navigationLayout === option.value)"
                  :aria-pressed="navigationLayout === option.value"
                  :title="option.description"
                  @click="setNavigationLayout(option.value)"
                >
                  <component
                    :is="option.icon"
                    class="size-4 shrink-0"
                  />

                  <span class="truncate">
                    {{ option.label }}
                  </span>
                </Button>
              </div>
            </section>

            <Separator />

            <!-- Visualização da opção selecionada -->
            <Transition name="nt-nav-description" mode="out-in">
              <div
                v-if="selectedNavigationOption"
                :key="selectedNavigationOption.value"
                class="flex items-start gap-3"
              >
                <div
                  class="grid size-9 shrink-0 place-items-center rounded-xl bg-muted"
                >
                  <component
                    :is="selectedNavigationOption.icon"
                    class="size-4 text-muted-foreground"
                  />
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-sm font-medium">
                      {{ selectedNavigationOption.label }}
                    </p>

                    <Badge variant="secondary">
                      Ativo
                    </Badge>
                  </div>

                  <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {{ selectedNavigationOption.description }}
                  </p>
                </div>
              </div>
            </Transition>

            <Separator />

            <!-- Ações -->
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="space-y-1">
                <p class="text-sm font-medium">
                  Preferência de navegação
                </p>

                <p class="text-xs text-muted-foreground">
                  Salva automaticamente neste dispositivo.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="gap-2"
                :disabled="navigationLayout === 'sidebar'"
                @click="setNavigationLayout('sidebar')"
              >
                <RotateCcw class="size-3.5" />
                Restaurar padrão
              </Button>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <!-- Dados -->
      <Reveal :delay="240">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Dados</CardTitle>
            <CardDescription>
              Exporte ou limpe suas tarefas.
            </CardDescription>
          </CardHeader>

          <CardContent class="space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-sm font-medium">Exportar tarefas</p>
                <p class="text-xs text-muted-foreground">
                  Baixa um arquivo CSV com todas as tarefas.
                </p>
              </div>

              <Button
                variant="outline"
                :disabled="exporting"
                @click="exportCsv"
              >
                <Download class="h-4 w-4" />
                {{ exporting ? 'Gerando...' : 'Exportar CSV' }}
              </Button>
            </div>

            <div
              class="flex flex-wrap items-center justify-between gap-3 border-t pt-3"
            >
              <div>
                <p class="text-sm font-medium">Limpar concluídas</p>
                <p class="text-xs text-muted-foreground">
                  {{ completedCount }}
                  {{
                    completedCount === 1
                      ? 'tarefa concluída'
                      : 'tarefas concluídas'
                  }}
                </p>
              </div>

              <Button
                variant="outline"
                :disabled="!completedCount || clearing"
                @click="clearCompleted"
              >
                <Eraser class="h-4 w-4" />
                {{ clearing ? 'Limpando...' : 'Limpar' }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <!-- Zona de perigo -->
      <Reveal :delay="320">
        <Card class="border-destructive/40">
          <CardHeader>
            <CardTitle class="text-base text-destructive">
              Zona de perigo
            </CardTitle>

            <CardDescription>
              Estas ações não podem ser desfeitas.
            </CardDescription>
          </CardHeader>

          <CardContent class="space-y-3">
            <p class="text-sm">
              Excluir a conta apaga todas as tarefas, o histórico e os dados
              de pagamento registrados.
            </p>

            <div class="grid gap-2 sm:max-w-sm">
              <Label for="cfg-confirm" class="text-xs text-muted-foreground">
                Digite
                <span class="font-mono font-medium text-foreground">
                  {{ me?.email }}
                </span>
                para confirmar
              </Label>

              <Input
                id="cfg-confirm"
                v-model="confirmEmail"
                :placeholder="me?.email ?? ''"
              />
            </div>

            <Button
              variant="destructive"
              :disabled="!canDelete || deleting"
              @click="deleteAccount"
            >
              <Trash2 class="h-4 w-4" />
              {{ deleting ? 'Excluindo...' : 'Excluir conta' }}
            </Button>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue';
import { useRouter } from 'vue-router';
import { useQueryClient } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';

import { api } from '@/api';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';

import Reveal from '@/components/motion/Reveal.vue';

import {
  useClearCompleted,
  useDeleteAccount,
  useMe,
  useTasks,
  useUpdateMe,
} from '@/queries/tasks';

import { sidebarCollapsed } from '@/lib/ui';

import {
  navigationLayout,
  setNavigationLayout,
  type NavigationLayout,
} from '@/lib/navigationAppearance';

import {
  Download,
  Eraser,
  Trash2,
  PanelLeft,
  PanelsTopLeft,
  GripHorizontal,
  PanelLeftClose,
  PanelRight,
  RotateCcw,
} from 'lucide-vue-next';

import { cn } from '@/lib/utils';

const router = useRouter();
const queryClient = useQueryClient();

const { data: me } = useMe();
const { data: tasksData } = useTasks();

const updateMe = useUpdateMe();
const deleteAccount_ = useDeleteAccount();
const clearMutation = useClearCompleted();

/* =========================================
   NAVEGAÇÃO
========================================= */

const navigationOptions: {
  value: NavigationLayout;
  label: string;
  description: string;
  icon: Component;
}[] = [
  {
    value: 'sidebar',
    label: 'Normal',
    description:
      'A barra lateral tradicional, posicionada à esquerda, com ícones e nomes.',
    icon: PanelLeft,
  },
  {
    value: 'attached',
    label: 'Integrada',
    description:
      'A navegação fica conectada diretamente à página, sem espaçamento externo.',
    icon: PanelsTopLeft,
  },
  {
    value: 'dock',
    label: 'Dock',
    description:
      'Uma barra flutuante horizontal na parte inferior da tela, com os destinos da aplicação.',
    icon: GripHorizontal,
  },
  {
    value: 'vertical-left',
    label: 'Vertical esquerda',
    description:
      'Uma dock compacta e flutuante posicionada na lateral esquerda.',
    icon: PanelLeftClose,
  },
  {
    value: 'vertical-right',
    label: 'Vertical direita',
    description:
      'Uma dock compacta e flutuante posicionada na lateral direita.',
    icon: PanelRight,
  },
];

function segClass(active: boolean): string {
  return cn(
    'min-w-0 gap-2 rounded-xl px-2 text-xs sm:px-3 sm:text-sm',
    'transition-all duration-200',
    active
      ? 'bg-background text-foreground shadow-sm hover:bg-background'
      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
  );
}

const selectedNavigationOption = computed(() =>
  navigationOptions.find(
    (option) => option.value === navigationLayout.value,
  ),
);

/* =========================================
   PERFIL
========================================= */

const name = ref('');
const savingName = ref(false);

watch(
  me,
  (value) => {
    if (value) name.value = value.name ?? '';
  },
  { immediate: true },
);

const nameChanged = computed(
  () => name.value.trim() !== (me.value?.name ?? '').trim(),
);

async function saveName(): Promise<void> {
  if (!nameChanged.value) return;

  savingName.value = true;

  try {
    await updateMe.mutateAsync({ name: name.value.trim() });
    toast.success('Nome atualizado');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Não foi possível salvar');
  } finally {
    savingName.value = false;
  }
}

/* =========================================
   PREFERÊNCIAS
========================================= */

const isDark = ref(
  document.documentElement.classList.contains('dark'),
);

function toggleTheme(value: boolean | string): void {
  const dark = !!value;

  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');

  isDark.value = dark;
}

const canNotify =
  typeof window !== 'undefined' && 'Notification' in window;

const notifPermission = ref<NotificationPermission | 'unsupported'>(
  canNotify ? Notification.permission : 'unsupported',
);

const notifStatus = computed(() => {
  if (!canNotify) return 'Este navegador não suporta alertas.';

  if (notifPermission.value === 'granted') {
    return 'Você recebe alertas quando a janela está em segundo plano.';
  }

  if (notifPermission.value === 'denied') {
    return 'Bloqueados nas configurações do navegador.';
  }

  return 'Receba um aviso quando algo acontecer com suas tarefas.';
});

async function enableNotifications(): Promise<void> {
  if (!canNotify) return;

  notifPermission.value = await Notification.requestPermission();

  if (notifPermission.value === 'granted') {
    toast.success('Alertas ativados');
  }
}

/* =========================================
   DADOS
========================================= */

const exporting = ref(false);

async function exportCsv(): Promise<void> {
  exporting.value = true;

  try {
    const token = localStorage.getItem('token');
    const base = import.meta.env.VITE_API_URL ?? '/api';

    const res = await fetch(`${base}/tasks/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      throw new Error('Não foi possível exportar');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'tarefas.csv';
    a.click();

    URL.revokeObjectURL(url);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Erro ao exportar');
  } finally {
    exporting.value = false;
  }
}

const completedCount = computed(
  () => (tasksData.value?.tasks ?? []).filter((t) => t.done).length,
);

const clearing = ref(false);

async function clearCompleted(): Promise<void> {
  if (!completedCount.value) return;

  clearing.value = true;

  try {
    const { deleted } = await clearMutation.mutateAsync();

    toast.success(
      `${deleted} ${deleted === 1 ? 'tarefa removida' : 'tarefas removidas'}`,
    );
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Erro ao limpar');
  } finally {
    clearing.value = false;
  }
}

/* =========================================
   ZONA DE PERIGO
========================================= */

const confirmEmail = ref('');
const deleting = ref(false);

const canDelete = computed(
  () =>
    !!me.value?.email &&
    confirmEmail.value.trim().toLowerCase() ===
      me.value.email.toLowerCase(),
);

async function deleteAccount(): Promise<void> {
  if (!canDelete.value) return;

  deleting.value = true;

  try {
    await deleteAccount_.mutateAsync(confirmEmail.value.trim());

    localStorage.removeItem('token');
    queryClient.clear();

    toast('Conta excluída');
    router.push('/');
  } catch (e) {
    toast.error(
      e instanceof Error
        ? e.message
        : 'Não foi possível excluir a conta',
    );
  } finally {
    deleting.value = false;
  }
}
</script>

<style>
.nt-nav-description-enter-active,
.nt-nav-description-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.nt-nav-description-enter-from {
  opacity: 0;
  transform: translateY(5px);
}

.nt-nav-description-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

@media (prefers-reduced-motion: reduce) {
  .nt-nav-description-enter-active,
  .nt-nav-description-leave-active {
    transition-duration: 1ms !important;
  }
}
</style>
