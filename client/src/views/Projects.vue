<template>
  <ConfirmDialog v-model:open="deleteProjectOpen" title="Excluir projeto?" :description="deleteProjectDescription"
    confirm-label="Excluir" destructive @confirm="doRemoveProject" />
  <TooltipProvider>
    <div class="space-y-6">
      <!-- Cabeçalho -->
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Projetos</h1>
          <p class="mt-1 text-muted-foreground">{{ subtitle }}</p>
        </div>
        <Button :disabled="limitReached" @click="openCreate">
          <Plus class="h-4 w-4" />
          Novo projeto
        </Button>
      </header>

      <!-- Resumo -->
      <section class="grid gap-4 sm:grid-cols-3">
        <Reveal v-for="(s, i) in stats" :key="s.label" class="h-full" :delay="i * 80">
          <Card class="h-full">
            <CardHeader class="pb-2">
              <CardDescription>{{ s.label }}</CardDescription>
            </CardHeader>
            <CardContent>
              <p class="text-3xl font-bold tabular-nums">{{ s.value }}</p>
              <p class="mt-1 text-xs text-muted-foreground">{{ s.hint }}</p>
            </CardContent>
          </Card>
        </Reveal>
      </section>

      <!-- Busca e ordenação -->
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative w-full sm:w-72">
          <Search class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input v-model="query" placeholder="Buscar projetos" class="pl-9" />
        </div>
        <Select :model-value="sort" @update:model-value="(v) => (sort = v as SortKey)">
          <SelectTrigger class="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
            <SelectItem value="progress">Progresso</SelectItem>
          </SelectContent>
        </Select>
        <span class="ml-auto text-sm text-muted-foreground tabular-nums">
          {{ filtered.length }} de {{ projects.length }}
        </span>
      </div>

      <!-- Carregando -->
      <section v-if="projectsQuery.isPending.value" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton v-for="i in 3" :key="i" class="h-56 rounded-xl" />
      </section>

      <!-- Grade de projetos -->
      <section v-else-if="filtered.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Reveal v-for="(p, i) in filtered" :key="p.id" class="h-full" :delay="Math.min(i, 6) * 60">
          <Card
            class="group flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div class="h-1.5 w-full" :style="{ background: p.color }" />

            <CardHeader class="pb-3">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <CardTitle class="truncate text-base">{{ p.name }}</CardTitle>
                  <CardDescription class="line-clamp-2 min-h-[2.5rem]">
                    {{ p.description || 'Sem descrição' }}
                  </CardDescription>
                </div>
                <Badge v-if="p.next_due" :variant="dueVariant(p.next_due)" class="shrink-0">
                  {{ dueLabel(p.next_due).text }}
                </Badge>
              </div>
            </CardHeader>

            <CardContent class="flex flex-1 flex-col gap-3">
              <div class="flex items-end justify-between">
                <span class="text-3xl font-bold tabular-nums">{{ pct(p) }}%</span>
                <span class="text-xs text-muted-foreground tabular-nums">{{ p.done }}/{{ p.total }} concluídas</span>
              </div>
              <Progress :model-value="pct(p)" />
            </CardContent>

            <CardFooter class="flex-wrap gap-2 border-t pt-4">
              <Button size="sm" class="flex-1" @click="router.push(`/projects/${p.id}`)">
                <FileText class="h-4 w-4" />
                Notas
              </Button>
              <Button size="sm" variant="outline" class="flex-1" @click="openDetail(p.id)">
                Tarefas
              </Button>

              <Tooltip>
                <TooltipTrigger as-child>
                  <Button variant="outline" size="icon" aria-label="Editar projeto" @click="openEdit(p)">
                    <Pencil class="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger as-child>
                  <Button variant="outline" size="icon" aria-label="Excluir projeto" @click="askRemoveProject(p)">
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Excluir</TooltipContent>
              </Tooltip>
            </CardFooter>
          </Card>
        </Reveal>
      </section>

      <!-- Vazio -->
      <Card v-else class="grid place-items-center py-16 text-center">
        <FolderKanban class="h-10 w-10 text-muted-foreground" />
        <p class="mt-4 font-medium">
          {{ query ? 'Nenhum projeto encontrado' : 'Nenhum projeto ainda' }}
        </p>
        <p class="mt-1 max-w-sm text-sm text-muted-foreground">
          Agrupe tarefas em projetos para acompanhar o andamento de cada um.
        </p>
        <Button v-if="!query" class="mt-6" @click="openCreate">Criar primeiro projeto</Button>
      </Card>
    </div>

    <!-- Criar / editar -->
    <Dialog v-model:open="editorOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ editing ? 'Editar projeto' : 'Novo projeto' }}</DialogTitle>
          <DialogDescription>Projetos agrupam tarefas e mostram o progresso.</DialogDescription>
        </DialogHeader>

        <form class="grid gap-4" @submit.prevent="saveProject">
          <div class="grid gap-2">
            <Label for="pj-name">Nome</Label>
            <Input id="pj-name" v-model="form.name" maxlength="80" placeholder="Ex.: Lançamento do app" autofocus />
          </div>

          <div class="grid gap-2">
            <Label for="pj-desc">Descrição</Label>
            <Input id="pj-desc" v-model="form.description" maxlength="300" placeholder="Opcional" />
          </div>

          <div class="grid gap-2">
            <Label>Cor</Label>
            <div class="flex flex-wrap gap-2">
              <button v-for="c in COLORS" :key="c" type="button" :aria-label="`Cor ${c}`"
                class="h-7 w-7 rounded-full transition-transform duration-150 hover:scale-110"
                :class="form.color === c ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background' : ''"
                :style="{ background: c }" @click="form.color = c" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="editorOpen = false">Cancelar</Button>
            <Button type="submit" :disabled="!form.name.trim() || saving">
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Detalhe: tarefas do projeto -->
    <Dialog v-model:open="detailOpen">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <div class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-full" :style="{ background: detail?.project.color ?? '#94a3b8' }" />
            <DialogTitle>{{ detail?.project.name ?? 'Projeto' }}</DialogTitle>
          </div>
          <DialogDescription>{{ detail?.project.description || 'Tarefas deste projeto' }}</DialogDescription>
        </DialogHeader>

        <div v-if="detail" class="space-y-4">
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Progresso</span>
              <span class="tabular-nums">{{ detailPct }}%</span>
            </div>
            <Progress :model-value="detailPct" />
          </div>

          <form class="flex gap-2" @submit.prevent="addTask">
            <Input v-model="newTitle" maxlength="200" placeholder="Nova tarefa neste projeto" />
            <Button type="submit" :disabled="!newTitle.trim() || taskActions.add.isPending.value">
              <Plus class="h-4 w-4" />
              Adicionar
            </Button>
          </form>

          <ul class="max-h-80 divide-y overflow-y-auto">
            <li v-for="t in detail.tasks" :key="t.id" class="flex items-center gap-3 py-2.5">
              <Checkbox :model-value="t.done" :aria-label="`Concluir ${t.title}`" @update:model-value="toggleTask(t)" />
              <span class="flex-1 truncate text-sm" :class="t.done ? 'text-muted-foreground line-through' : ''">
                {{ t.title }}
              </span>
              <Button variant="ghost" size="icon" :aria-label="`Excluir ${t.title}`" @click="removeTask(t)">
                <Trash2 class="h-4 w-4" />
              </Button>
            </li>
            <li v-if="!detail.tasks.length" class="py-8 text-center text-sm text-muted-foreground">
              Nenhuma tarefa neste projeto ainda.
            </li>
          </ul>
        </div>

        <Skeleton v-else class="h-40 w-full" />
      </DialogContent>
    </Dialog>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Reveal from '@/components/motion/Reveal.vue';
import { dueLabel } from '@/lib/format';
import type { Task } from '@/lib/types';
import {
  useDeleteProject,
  useProjectDetail,
  useProjectTaskActions,
  useProjects,
  useSaveProject,
  type Project,
} from '@/queries/projects';
import { FileText, FolderKanban, Pencil, Plus, Search, Trash2 } from 'lucide-vue-next';
import ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue';

const router = useRouter();

type SortKey = 'recent' | 'name' | 'progress';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#64748b'];

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Algo deu errado';
}

function pct(p: Pick<Project, 'total' | 'done'>): number {
  return p.total ? Math.round((p.done * 100) / p.total) : 0;
}

function dueVariant(ymd: string): 'destructive' | 'default' | 'secondary' {
  const tone = dueLabel(ymd).tone;
  if (tone === 'late') return 'destructive';
  if (tone === 'today') return 'default';
  return 'secondary';
}

// Lista e busca
const query = ref('');
const sort = ref<SortKey>('recent');

const projectsQuery = useProjects();
const projects = computed<Project[]>(() => projectsQuery.data.value?.projects ?? []);
const limit = computed(() => projectsQuery.data.value?.limit ?? null);
const limitReached = computed(() => limit.value !== null && projects.value.length >= limit.value);

const filtered = computed<Project[]>(() => {
  const q = query.value.trim().toLowerCase();
  const list = projects.value.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
  );
  return [...list].sort((a, b) => {
    if (sort.value === 'name') return a.name.localeCompare(b.name, 'pt-BR');
    if (sort.value === 'progress') return pct(b) - pct(a);
    return b.created_at.localeCompare(a.created_at);
  });
});

const totalTasks = computed(() => projects.value.reduce((s, p) => s + p.total, 0));
const totalDone = computed(() => projects.value.reduce((s, p) => s + p.done, 0));
const overallPct = computed(() => (totalTasks.value ? Math.round((totalDone.value * 100) / totalTasks.value) : 0));

const subtitle = computed(() => {
  if (projectsQuery.isPending.value) return 'Carregando seus projetos...';
  if (!projects.value.length) return 'Organize suas tarefas em projetos.';
  const n = projects.value.length;
  return `${n} ${n === 1 ? 'projeto' : 'projetos'} acompanhados.`;
});

const stats = computed(() => [
  {
    label: 'Projetos',
    value: projects.value.length,
    hint: limit.value ? `${projects.value.length}/${limit.value} no plano Free` : 'ilimitados no plano Pro',
  },
  {
    label: 'Tarefas nos projetos',
    value: totalTasks.value,
    hint: `${totalDone.value} concluídas`,
  },
  {
    label: 'Progresso geral',
    value: `${overallPct.value}%`,
    hint: 'considerando todas as tarefas',
  },
]);

// Criar e editar
const editorOpen = ref(false);
const editing = ref<Project | null>(null);
const form = ref({ name: '', description: '', color: COLORS[0] as string });
const saveMutation = useSaveProject();
const saving = computed(() => saveMutation.isPending.value);

function openCreate(): void {
  editing.value = null;
  form.value = { name: '', description: '', color: COLORS[0] as string };
  editorOpen.value = true;
}

function openEdit(p: Project): void {
  editing.value = p;
  form.value = { name: p.name, description: p.description ?? '', color: p.color };
  editorOpen.value = true;
}

async function saveProject(): Promise<void> {
  const name = form.value.name.trim();
  if (!name) return;
  const isEdit = !!editing.value;
  try {
    await saveMutation.mutateAsync({
      id: editing.value?.id,
      body: {
        name,
        description: form.value.description.trim() || null,
        color: form.value.color,
      },
    });
    editorOpen.value = false;
    toast.success(isEdit ? 'Projeto atualizado' : 'Projeto criado');
  } catch (e) {
    toast.error(msg(e));
  }
}

// Excluir
const deleteMutation = useDeleteProject();

const deleteProjectOpen = ref(false);
const toDeleteProject = ref<Project | null>(null);
const deleteProjectDescription = computed(() =>
  toDeleteProject.value
    ? `O projeto "${toDeleteProject.value.name}" será excluído. As tarefas dele continuam na lista geral.`
    : ''
);

function askRemoveProject(p: Project): void {
  toDeleteProject.value = p;
  deleteProjectOpen.value = true;
}

async function doRemoveProject(): Promise<void> {
  const p = toDeleteProject.value;
  if (!p) return;
  try {
    await deleteMutation.mutateAsync(p.id);
    toast('Projeto excluído');
  } catch (e) {
    toast.error(msg(e));
  } finally {
    toDeleteProject.value = null;
  }
}

// Detalhe do projeto (tarefas)
const detailId = ref<number | null>(null);
const detailOpen = ref(false);
const detailQuery = useProjectDetail(detailId);
const detail = computed(() => detailQuery.data.value ?? null);
const detailPct = computed(() => (detail.value ? pct(detail.value.project) : 0));

const taskActions = useProjectTaskActions(detailId);
const newTitle = ref('');

function openDetail(id: number): void {
  detailId.value = id;
  detailOpen.value = true;
}

async function addTask(): Promise<void> {
  const title = newTitle.value.trim();
  if (!title || !detailId.value) return;
  try {
    await taskActions.add.mutateAsync(title);
    newTitle.value = '';
  } catch (e) {
    toast.error(msg(e));
  }
}

function toggleTask(t: Task): void {
  taskActions.toggle.mutate(
    { id: t.id, done: !t.done },
    { onError: (e) => toast.error(msg(e)) }
  );
}

function removeTask(t: Task): void {
  taskActions.remove.mutate(t.id, {
    onSuccess: () => toast('Tarefa excluída'),
    onError: (e) => toast.error(msg(e)),
  });
}
</script>