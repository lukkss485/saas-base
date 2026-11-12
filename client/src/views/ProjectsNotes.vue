<template>
  <div class="grid min-w-0 gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
    <header class="flex min-w-0 flex-wrap items-center justify-between gap-3 xl:col-span-2">
      <div class="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Voltar para projetos" @click="router.push('/projects')">
          <ArrowLeft class="h-4 w-4" />
        </Button>
        <span
          class="h-3 w-3 shrink-0 rounded-full ring-4 ring-background transition-colors duration-300"
          :style="{ background: project?.color ?? '#94a3b8' }"
        />
        <h1 class="truncate text-xl font-semibold tracking-tight sm:text-2xl">
          {{ project?.name ?? 'Projeto' }}
        </h1>
      </div>

      <span class="shrink-0 text-xs tabular-nums text-muted-foreground">
        {{ pages.length }} {{ pages.length === 1 ? 'página' : 'páginas' }}
      </span>
    </header>

    <!-- Navegador de páginas e pastas -->
    <aside
      class="flex min-h-[18rem] min-w-0 flex-col gap-2 overflow-hidden rounded-2xl border border-border/60 bg-card p-3 shadow-sm xl:min-h-0"
    >
      <div class="flex shrink-0 items-center justify-between gap-2 px-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pastas e páginas</p>
        <div class="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8 rounded-lg transition-transform duration-200 hover:scale-105 active:scale-95"
            aria-label="Nova pasta"
            title="Nova pasta"
            @click="toggleFolderForm"
          >
            <FolderPlus class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8 rounded-lg transition-transform duration-200 hover:scale-105 active:scale-95"
            aria-label="Nova página sem pasta"
            title="Nova página"
            :disabled="createPage.isPending.value"
            @click="addPage()"
          >
            <Plus class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Transition name="folder-form">
        <form
          v-if="showFolderForm"
          class="flex items-center gap-1 rounded-xl border border-primary/20 bg-primary/[0.04] p-1.5"
          @submit.prevent="createFolder"
        >
          <Input
            v-model="newFolderName"
            autofocus
            maxlength="60"
            placeholder="Nome da pasta"
            aria-label="Nome da nova pasta"
            class="h-8 min-w-0 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-1"
            @keydown.esc.prevent="cancelFolderForm"
          />
          <Button type="submit" variant="ghost" size="icon" class="h-8 w-8 shrink-0" aria-label="Criar pasta">
            <Check class="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="h-8 w-8 shrink-0"
            aria-label="Cancelar criação de pasta"
            @click="cancelFolderForm"
          >
            <X class="h-4 w-4" />
          </Button>
        </form>
      </Transition>

      <Transition name="folder-form">
        <p
          v-if="draggedPageId !== null"
          class="shrink-0 rounded-lg border border-primary/20 bg-primary/[0.06] px-3 py-2 text-xs text-primary"
          aria-live="polite"
        >
          Solte a página sobre uma pasta para movê-la.
        </p>
      </Transition>

      <div v-if="listLoading" class="shrink-0 space-y-2 p-1" aria-label="Carregando páginas">
        <Skeleton v-for="i in 4" :key="i" class="h-9 rounded-lg" />
      </div>

      <div v-else class="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <p
          v-if="!pages.length && !folders.length"
          class="grid min-h-28 place-items-center px-2 py-6 text-center text-sm text-muted-foreground"
        >
          Ainda não há páginas. Use <FolderPlus class="inline h-3.5 w-3.5" /> para criar uma pasta ou <Plus class="inline h-3.5 w-3.5" /> para criar uma página.
        </p>

        <div v-else class="grid content-start gap-3">
          <section
            v-for="group in pageGroups"
            :key="group.key"
            class="min-w-0 rounded-xl transition-[background-color,box-shadow] duration-200"
            :class="dragOverGroupKey === group.key && draggedPageId !== null
              ? 'bg-primary/[0.05] ring-2 ring-primary/40 ring-offset-2 ring-offset-background'
              : ''"
            @dragover="onFolderDragOver($event, group.key)"
            @dragenter.prevent="onFolderDragEnter(group.key)"
            @dragleave="onFolderDragLeave($event, group.key)"
            @drop.prevent="onFolderDrop($event, group)"
          >
            <div class="group/folder flex min-w-0 items-center gap-1 rounded-lg px-1 py-1 hover:bg-muted/50">
              <button
                type="button"
                class="flex min-h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 text-left text-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                :aria-expanded="isGroupOpen(group.key)"
                @click="toggleGroup(group.key)"
              >
                <ChevronDown v-if="isGroupOpen(group.key)" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <ChevronRight v-else class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <FolderOpen v-if="group.folderId && isGroupOpen(group.key)" class="h-4 w-4 shrink-0 text-primary" />
                <Folder v-else-if="group.folderId" class="h-4 w-4 shrink-0 text-muted-foreground" />
                <FileText v-else class="h-4 w-4 shrink-0 text-muted-foreground" />
                <span class="min-w-0 flex-1 truncate font-medium">{{ group.label }}</span>
                <span class="shrink-0 text-[11px] tabular-nums text-muted-foreground">{{ group.pages.length }}</span>
              </button>

              <Button
                v-if="group.folderId"
                variant="ghost"
                size="icon"
                class="h-7 w-7 shrink-0 rounded-md opacity-100 transition-opacity sm:opacity-0 sm:group-hover/folder:opacity-100 sm:focus-visible:opacity-100"
                :aria-label="`Nova página em ${group.label}`"
                :title="`Nova página em ${group.label}`"
                :disabled="createPage.isPending.value"
                @click="addPage(group.folderId)"
              >
                <Plus class="h-3.5 w-3.5" />
              </Button>
              <template v-if="group.folderId">
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 shrink-0 rounded-md text-muted-foreground opacity-100 transition-colors hover:text-foreground sm:opacity-0 sm:group-hover/folder:opacity-100 sm:focus-visible:opacity-100"
                  :aria-label="`Renomear pasta ${group.label}`"
                  title="Renomear pasta"
                  @click="renameFolder(group.folderId)"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 shrink-0 rounded-md text-muted-foreground opacity-100 transition-colors hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover/folder:opacity-100 sm:focus-visible:opacity-100"
                  :aria-label="`Excluir pasta ${group.label}`"
                  title="Excluir pasta"
                  @click="removeFolder(group.folderId)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </Button>
              </template>
              <Button
                v-else
                variant="ghost"
                size="icon"
                class="h-7 w-7 shrink-0 rounded-md"
                aria-label="Nova página sem pasta"
                title="Nova página sem pasta"
                :disabled="createPage.isPending.value"
                @click="addPage()"
              >
                <Plus class="h-3.5 w-3.5" />
              </Button>
            </div>

            <Transition name="folder-content">
              <ul v-if="isGroupOpen(group.key)" class="mt-1 grid gap-1 pl-2">
                <li
                  v-for="p in group.pages"
                  :key="p.id"
                  draggable="true"
                  class="group/page min-w-0 rounded-xl border border-transparent transition-[background-color,border-color,box-shadow,opacity,transform] duration-200"
                  :class="[
                    p.id === selectedId
                      ? 'border-primary/15 bg-primary/[0.07] shadow-sm'
                      : 'hover:border-border/70 hover:bg-muted/60',
                    draggedPageId === p.id ? 'scale-[0.99] opacity-50' : 'cursor-grab active:cursor-grabbing',
                  ]"
                  :title="`Arraste '${p.title || 'Sem título'}' para uma pasta`"
                  @dragstart="onPageDragStart($event, p)"
                  @dragend="onPageDragEnd"
                >
                  <div class="flex min-w-0 items-center gap-0.5">
                    <button
                      type="button"
                      class="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-2 text-left text-sm outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      :aria-current="p.id === selectedId ? 'page' : undefined"
                      @click="select(p.id)"
                    >
                      <GripVertical class="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                      <span class="w-5 shrink-0 text-center" aria-hidden="true">{{ p.icon || '📄' }}</span>
                      <span
                        class="truncate"
                        :class="p.id === selectedId ? 'font-medium text-foreground' : 'text-foreground/85'"
                      >
                        {{ p.title || 'Sem título' }}
                      </span>
                    </button>

                    <button
                      type="button"
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-100 outline-none transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover/page:opacity-100 sm:group-focus-within/page:opacity-100"
                      :aria-label="`Mover ${p.title || 'página sem título'} para uma pasta`"
                      :title="movingPageId === p.id ? 'Fechar opções de pasta' : 'Mover para pasta'"
                      @click="movingPageId = movingPageId === p.id ? null : p.id"
                    >
                      <Folder class="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      class="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-100 outline-none transition-[background-color,color,opacity,transform] duration-200 hover:bg-destructive/10 hover:text-destructive active:scale-95 focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover/page:opacity-100 sm:group-focus-within/page:opacity-100"
                      :aria-label="`Excluir ${p.title || 'página sem título'}`"
                      @click="askRemovePage(p)"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div v-if="movingPageId === p.id" class="grid gap-1.5 px-2 pb-2 pt-1">
                    <label :for="`move-page-${p.id}`" class="text-[11px] font-medium text-muted-foreground">
                      Mover para
                    </label>
                    <select
                      :id="`move-page-${p.id}`"
                      class="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                      :value="folderAssignments[String(p.id)] ?? ''"
                      @change="movePage(p.id, $event)"
                    >
                      <option value="">Sem pasta</option>
                      <option v-for="folder in folders" :key="folder.id" :value="folder.id">
                        {{ folder.name }}
                      </option>
                    </select>
                  </div>
                </li>

                <li
                  v-if="group.pages.length === 0"
                  class="rounded-lg px-3 py-2 text-xs italic text-muted-foreground/80"
                >
                  {{ group.folderId ? 'Esta pasta está vazia.' : 'Nenhuma página sem pasta.' }}
                </li>
              </ul>
            </Transition>
          </section>
        </div>
      </div>
    </aside>

    <!-- Editor de página -->
    <section
      class="flex min-h-[32rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-[border-color,box-shadow] duration-300 xl:min-h-[calc(100dvh-10rem)]"
    >
      <template v-if="selectedId">
        <div class="flex shrink-0 items-center gap-2 px-4 pt-4 sm:px-6 sm:pt-5">
          <Input
            :model-value="icon"
            maxlength="4"
            aria-label="Ícone da página"
            class="h-10 w-12 shrink-0 rounded-lg border border-transparent bg-transparent px-0 text-center text-2xl shadow-none transition-colors duration-200 hover:bg-muted/60 focus-visible:border-border focus-visible:ring-2 focus-visible:ring-ring sm:w-14"
            @update:model-value="(v) => (icon = String(v))"
            @blur="saveIcon"
          />
          <Input
            :model-value="title"
            maxlength="200"
            placeholder="Sem título"
            aria-label="Título da página"
            class="h-auto min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-2xl font-bold tracking-tight shadow-none transition-colors duration-200 hover:bg-muted/40 focus-visible:border-border focus-visible:ring-2 focus-visible:ring-ring sm:text-3xl"
            @update:model-value="onTitle"
          />
        </div>

        <p class="flex shrink-0 items-center gap-2 px-6 pt-2 text-xs text-muted-foreground" aria-live="polite">
          <span
            class="h-1.5 w-1.5 rounded-full transition-colors duration-300"
            :class="saveState === 'saved' ? 'bg-emerald-500' : saveState === 'saving' ? 'animate-pulse bg-blue-500' : 'bg-amber-500'"
          />
          <span>{{ saveLabel }}</span>
        </p>

        <div v-if="pageQuery.isPending.value" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-6">
          <Skeleton class="h-6 w-2/3 rounded-md" />
          <Skeleton class="h-6 w-1/2 rounded-md" />
          <Skeleton class="h-28 w-full rounded-xl" />
        </div>

        <RichEditor
          v-else
          class="mt-4 min-h-[28rem] min-w-0 flex-1"
          :model-value="content"
          placeholder="Comece a escrever ou use a barra de ferramentas acima..."
          @update:model-value="onContent"
        />
      </template>

      <div v-else class="grid min-h-[32rem] flex-1 place-items-center px-6 py-12 text-center">
        <div class="flex max-w-sm flex-col items-center gap-3">
          <div class="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
            <FileText class="h-7 w-7" />
          </div>
          <div class="space-y-1">
            <h2 class="font-semibold tracking-tight">Tudo começa com uma página</h2>
            <p class="text-sm leading-6 text-muted-foreground">
              Crie uma página para guardar ideias, anotações e informações deste projeto.
            </p>
          </div>
          <Button
            class="mt-1 gap-2 rounded-xl transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            :disabled="createPage.isPending.value"
            @click="addPage()"
          >
            <Plus class="h-4 w-4" />
            Nova página
          </Button>
        </div>
      </div>
    </section>

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Excluir página?"
      :description="deleteDescription"
      confirm-label="Excluir"
      destructive
      @confirm="doRemovePage"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStorage } from '@vueuse/core';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import RichEditor from '@/components/editor/RichEditor.vue';
import { useProjectDetail } from '@/queries/projects';
import {
  useCreatePage,
  useDeletePage,
  usePage,
  usePages,
  useUpdatePage,
  type Doc,
  type PageSummary,
} from '@/queries/pages';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-vue-next';
import ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue';

const EMPTY_DOC: Doc = { type: 'doc', content: [{ type: 'paragraph' }] };

interface PageFolder {
  id: string;
  name: string;
}

interface PageGroup {
  key: string;
  label: string;
  folderId: string | null;
  pages: PageSummary[];
}

const route = useRoute();
const router = useRouter();

const projectId = computed(() => {
  const n = Number(route.params.projectId);
  return Number.isInteger(n) && n > 0 ? n : null;
});

const { data: detail } = useProjectDetail(projectId);
const project = computed(() => detail.value?.project ?? null);

const pagesQuery = usePages(projectId);
const pages = computed<PageSummary[]>(() => pagesQuery.data.value?.pages ?? []);
const listLoading = computed(() => pagesQuery.isPending.value);

// A estrutura das pastas e a organização das páginas ficam isoladas por projeto.
// No momento, esses metadados são locais ao navegador; veja a observação após o código.
const folderStorageKey = computed(() => `nt-project-folders-v1-${projectId.value ?? 'none'}`);
const pageFolderStorageKey = computed(() => `nt-project-page-folders-v1-${projectId.value ?? 'none'}`);
const folders = useStorage<PageFolder[]>(folderStorageKey, []);
const folderAssignments = useStorage<Record<string, string>>(pageFolderStorageKey, {});

const selectedId = ref<number | null>(null);
const loadedId = ref<number | null>(null);
const title = ref('');
const icon = ref('');
const content = ref<Doc>(EMPTY_DOC);
const saveState = ref<'saved' | 'dirty' | 'saving'>('saved');

const showFolderForm = ref(false);
const newFolderName = ref('');
const movingPageId = ref<number | null>(null);
const draggedPageId = ref<number | null>(null);
const dragOverGroupKey = ref<string | null>(null);
const collapsedGroups = ref<Record<string, boolean>>({});

const pageQuery = usePage(selectedId);
const createPage = useCreatePage();
const updatePage = useUpdatePage();
const deletePage = useDeletePage();

// Declarado antes dos watchers, porque eles podem chamar select() na primeira execução.
let timer: ReturnType<typeof setTimeout> | undefined;

const saveLabel = computed(() => {
  if (saveState.value === 'saving') return 'Salvando...';
  if (saveState.value === 'dirty') return 'Alterações não salvas';
  return 'Tudo salvo';
});

const pageGroups = computed<PageGroup[]>(() => {
  const folderGroups: PageGroup[] = folders.value.map((folder) => ({
    key: `folder-${folder.id}`,
    label: folder.name,
    folderId: folder.id,
    pages: pages.value.filter((page) => folderAssignments.value[String(page.id)] === folder.id),
  }));

  const validFolderIds = new Set(folders.value.map((folder) => folder.id));
  const unfiledPages = pages.value.filter((page) => {
    const folderId = folderAssignments.value[String(page.id)];
    return !folderId || !validFolderIds.has(folderId);
  });

  return [
    ...folderGroups,
    {
      key: 'unfiled-pages',
      label: folders.value.length ? 'Sem pasta' : 'Páginas',
      folderId: null,
      pages: unfiledPages,
    },
  ];
});

function isGroupOpen(key: string): boolean {
  return collapsedGroups.value[key] !== true;
}

function toggleGroup(key: string): void {
  collapsedGroups.value = { ...collapsedGroups.value, [key]: !isGroupOpen(key) };
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Algo deu errado';
}

function toggleFolderForm(): void {
  showFolderForm.value = !showFolderForm.value;
  if (!showFolderForm.value) newFolderName.value = '';
}

function cancelFolderForm(): void {
  showFolderForm.value = false;
  newFolderName.value = '';
}

function createFolder(): void {
  const name = newFolderName.value.trim();
  if (!name) {
    toast.error('Digite um nome para a pasta.');
    return;
  }

  if (folders.value.some((folder) => folder.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    toast.error('Já existe uma pasta com esse nome.');
    return;
  }

  const id = `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  folders.value = [...folders.value, { id, name }];
  collapsedGroups.value = { ...collapsedGroups.value, [`folder-${id}`]: false };
  cancelFolderForm();
  toast.success(`Pasta "${name}" criada.`);
}

function renameFolder(folderId: string): void {
  const folder = folders.value.find((item) => item.id === folderId);
  if (!folder) return;

  const value = window.prompt('Digite o novo nome da pasta:', folder.name);
  if (value === null) return;

  const name = value.trim();
  if (!name) {
    toast.error('O nome da pasta não pode ficar vazio.');
    return;
  }

  if (folders.value.some((item) => item.id !== folderId && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    toast.error('Já existe uma pasta com esse nome.');
    return;
  }

  folders.value = folders.value.map((item) => item.id === folderId ? { ...item, name } : item);
  toast.success('Pasta renomeada.');
}

function removeFolder(folderId: string): void {
  const folder = folders.value.find((item) => item.id === folderId);
  if (!folder) return;

  const confirmed = window.confirm(
    `Excluir a pasta "${folder.name}"? As páginas continuarão existindo e serão movidas para "Sem pasta".`,
  );
  if (!confirmed) return;

  folders.value = folders.value.filter((item) => item.id !== folderId);
  const nextAssignments = { ...folderAssignments.value };
  for (const [pageId, assignedFolderId] of Object.entries(nextAssignments)) {
    if (assignedFolderId === folderId) delete nextAssignments[pageId];
  }
  folderAssignments.value = nextAssignments;
  const nextCollapsed = { ...collapsedGroups.value };
  delete nextCollapsed[`folder-${folderId}`];
  collapsedGroups.value = nextCollapsed;
  toast.success(`Pasta "${folder.name}" excluída. As páginas foram mantidas.`);
}

function movePage(pageId: number, event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;

  const folderId = target.value;
  const nextAssignments = { ...folderAssignments.value };
  if (folderId && folders.value.some((folder) => folder.id === folderId)) {
    nextAssignments[String(pageId)] = folderId;
  } else {
    delete nextAssignments[String(pageId)];
  }
  folderAssignments.value = nextAssignments;
  movingPageId.value = null;
}

// Arrastar uma página (documento do NT-life) para qualquer grupo da lista.
function onPageDragStart(event: DragEvent, page: PageSummary): void {
  draggedPageId.value = page.id;
  dragOverGroupKey.value = null;

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(page.id));
  }
}

function onPageDragEnd(): void {
  draggedPageId.value = null;
  dragOverGroupKey.value = null;
}

function onFolderDragEnter(groupKey: string): void {
  if (draggedPageId.value !== null) dragOverGroupKey.value = groupKey;
}

function onFolderDragOver(event: DragEvent, groupKey: string): void {
  if (draggedPageId.value === null) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  dragOverGroupKey.value = groupKey;
}

function onFolderDragLeave(event: DragEvent, groupKey: string): void {
  const current = event.currentTarget;
  const related = event.relatedTarget;
  // Evita apagar o realce ao passar entre elementos dentro da mesma pasta.
  if (current instanceof HTMLElement && related instanceof Node && current.contains(related)) return;
  if (dragOverGroupKey.value === groupKey) dragOverGroupKey.value = null;
}

function onFolderDrop(event: DragEvent, group: PageGroup): void {
  event.preventDefault();
  event.stopPropagation();

  const transferredId = event.dataTransfer?.getData('text/plain');
  const pageId = draggedPageId.value ?? (transferredId ? Number(transferredId) : null);
  const page = pages.value.find((item) => item.id === pageId);
  if (!page || pageId === null) {
    onPageDragEnd();
    return;
  }

  if (group.folderId && !folders.value.some((folder) => folder.id === group.folderId)) {
    toast.error('Essa pasta não existe mais.');
    onPageDragEnd();
    return;
  }

  const currentFolderId = folderAssignments.value[String(pageId)] || null;
  if (currentFolderId === group.folderId) {
    onPageDragEnd();
    return;
  }

  const nextAssignments = { ...folderAssignments.value };
  if (group.folderId) {
    nextAssignments[String(pageId)] = group.folderId;
    collapsedGroups.value = { ...collapsedGroups.value, [group.key]: false };
  } else {
    delete nextAssignments[String(pageId)];
  }

  folderAssignments.value = nextAssignments;
  if (movingPageId.value === pageId) movingPageId.value = null;
  toast.success(group.folderId
    ? `“${page.title || 'Sem título'}” movida para “${group.label}”.`
    : `“${page.title || 'Sem título'}” movida para “Sem pasta”.`);
  onPageDragEnd();
}

// Salvamento automático: 700 ms depois da última mudança.
function scheduleSave(): void {
  saveState.value = 'dirty';
  clearTimeout(timer);
  timer = setTimeout(() => void flush(), 700);
}

async function flush(): Promise<void> {
  clearTimeout(timer);
  const id = selectedId.value;
  if (!id || saveState.value !== 'dirty') return;

  saveState.value = 'saving';
  try {
    await updatePage.mutateAsync({
      id,
      body: { title: title.value.trim() || 'Sem título', content: content.value },
    });
    if (saveState.value === 'saving') saveState.value = 'saved';
  } catch (e) {
    saveState.value = 'dirty';
    toast.error(errMsg(e));
  }
}

async function select(id: number): Promise<void> {
  if (id === selectedId.value) return;
  await flush();
  loadedId.value = null;
  selectedId.value = id;
}

function onTitle(v: string | number): void {
  title.value = String(v);
  scheduleSave();
}

function onContent(doc: Doc): void {
  content.value = doc;
  scheduleSave();
}

function saveIcon(): void {
  const id = selectedId.value;
  if (!id) return;
  void flush();
  updatePage.mutate(
    { id, body: { icon: icon.value.trim() || null } },
    { onError: (e) => toast.error(errMsg(e)) },
  );
}

function addPage(folderId: string | null = null): void {
  if (!projectId.value || createPage.isPending.value) return;
  createPage.mutate(
    { projectId: projectId.value, title: 'Sem título' },
    {
      onSuccess: (page) => {
        const nextAssignments = { ...folderAssignments.value };
        if (folderId && folders.value.some((folder) => folder.id === folderId)) {
          nextAssignments[String(page.id)] = folderId;
        } else {
          delete nextAssignments[String(page.id)];
        }
        folderAssignments.value = nextAssignments;
        if (folderId) {
          collapsedGroups.value = { ...collapsedGroups.value, [`folder-${folderId}`]: false };
        }
        void select(page.id);
      },
      onError: (e) => toast.error(errMsg(e)),
    },
  );
}

const deleteOpen = ref(false);
const toDelete = ref<PageSummary | null>(null);
const deleteDescription = computed(() =>
  toDelete.value ? `A página "${toDelete.value.title}" será removida permanentemente.` : '',
);

function askRemovePage(page: PageSummary): void {
  toDelete.value = page;
  deleteOpen.value = true;
}

function doRemovePage(): void {
  const page = toDelete.value;
  if (!page) return;

  if (page.id === selectedId.value) {
    clearTimeout(timer);
    saveState.value = 'saved';
  }

  deletePage.mutate(
    { id: page.id, projectId: page.project_id },
    {
      onSuccess: () => {
        if (page.id === selectedId.value) {
          selectedId.value = null;
          loadedId.value = null;
        }
        const nextAssignments = { ...folderAssignments.value };
        delete nextAssignments[String(page.id)];
        folderAssignments.value = nextAssignments;
        if (movingPageId.value === page.id) movingPageId.value = null;
        toast('Página excluída');
      },
      onError: (e) => toast.error(errMsg(e)),
    },
  );
  toDelete.value = null;
}

// Carrega a página no editor quando ela chega do servidor (uma vez por página).
watch(pageQuery.data, (page) => {
  if (!page || page.id === loadedId.value) return;
  loadedId.value = page.id;
  title.value = page.title;
  icon.value = page.icon ?? '';
  content.value = page.content;
  saveState.value = 'saved';
});

// Abre a primeira página automaticamente.
watch(
  pages,
  (list) => {
    if (!selectedId.value && list.length) void select(list[0].id);
  },
  { immediate: true },
);

// Ao trocar de projeto, limpa a seleção e os controles transitórios.
watch(projectId, () => {
  selectedId.value = null;
  loadedId.value = null;
  movingPageId.value = null;
  draggedPageId.value = null;
  dragOverGroupKey.value = null;
  showFolderForm.value = false;
  newFolderName.value = '';
});

// Salva o que estiver pendente ao sair da página.
onBeforeUnmount(() => {
  clearTimeout(timer);
  void flush();
});
</script>

<style scoped>
.folder-form-enter-active,
.folder-form-leave-active {
  transition: opacity 220ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1), max-height 220ms ease;
  overflow: hidden;
}

.folder-form-enter-from,
.folder-form-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(0.985);
  max-height: 0;
}

.folder-form-enter-to,
.folder-form-leave-from {
  max-height: 5rem;
}

.folder-content-enter-active,
.folder-content-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.folder-content-enter-from,
.folder-content-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .folder-form-enter-active,
  .folder-form-leave-active,
  .folder-content-enter-active,
  .folder-content-leave-active {
    transition-duration: 1ms !important;
  }
}
</style>
