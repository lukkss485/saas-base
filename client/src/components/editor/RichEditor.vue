
<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden bg-background">
    <!-- Barra de ferramentas -->
    <div
      class="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-0.5 border-b bg-background/95 p-1.5 backdrop-blur"
    >
      <template v-for="(group, gi) in groups" :key="gi">
        <span v-if="gi > 0" class="mx-1 h-5 w-px bg-border" />
        <Button
          v-for="tool in group"
          :key="tool.key"
          variant="ghost"
          size="icon"
          class="h-8 w-8 shrink-0 transition-colors duration-300"
          :class="tool.active?.() ? 'bg-muted text-foreground' : 'text-muted-foreground'"
          :title="tool.label"
          :aria-label="tool.label"
          @click="tool.run()"
        >
          <component :is="tool.icon" class="h-4 w-4" />
        </Button>
      </template>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onImageFile"
      />
    </div>

    <!-- Área de escrita: ocupa o espaço restante -->
    <EditorContent
      :editor="editor"
      class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 sm:px-6"
    />

    <!-- Diálogos (no lugar de prompt e alert) -->
    <PromptDialog
      v-model:open="linkOpen"
      title="Link"
      description="Deixe vazio e aplique para remover o link."
      label="Endereço"
      placeholder="https://..."
      :initial-value="linkInitial"
      confirm-label="Aplicar"
      @submit="onLinkSubmit"
    />

    <PromptDialog
      v-model:open="imageUrlOpen"
      title="Imagem por URL"
      label="Endereço da imagem"
      placeholder="https://..."
      confirm-label="Inserir"
      @submit="onImageUrlSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { watch, ref, type Component } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import { toast } from 'vue-sonner';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Button } from '@/components/ui/button';
import PromptDialog from '@/components/dialogs/PromptDialog.vue';
import type { Doc } from '@/queries/pages';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  SquareCode,
  Minus,
  Link2,
  Image as ImageIcon,
  ImagePlus,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Eraser,
} from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{ modelValue: Doc; placeholder?: string }>(),
  { placeholder: 'Comece a escrever...' }
);

const emit = defineEmits<{ 'update:modelValue': [doc: Doc] }>();

const MAX_UPLOAD_BYTES = 1024 * 1024;
const fileInput = ref<HTMLInputElement | null>(null);

// Estado dos diálogos
const linkOpen = ref(false);
const linkInitial = ref('');
const imageUrlOpen = ref(false);

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({ link: false, underline: false }),
    Underline,
    Link.configure({ openOnClick: false, autolink: true }),
    Image.configure({ allowBase64: true }),
    Highlight,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({ placeholder: props.placeholder }),
  ],
  editorProps: {
    attributes: { class: 'focus:outline-none' },
  },
  onUpdate: ({ editor }) => emit('update:modelValue', editor.getJSON() as Doc),
});

// Atualiza o editor quando a página muda por fora, sem disparar onUpdate.
watch(
  () => props.modelValue,
  (next) => {
    const ed = editor.value;
    if (!ed) return;
    if (JSON.stringify(ed.getJSON()) === JSON.stringify(next)) return;
    ed.commands.setContent(next, { emitUpdate: false });
  }
);

const ed = () => editor.value;
const chain = () => editor.value?.chain().focus();

type Tool = {
  key: string;
  label: string;
  icon: Component;
  run: () => void;
  active?: () => boolean;
};

// Link: abre o diálogo com o link atual.
function openLink(): void {
  linkInitial.value = (ed()?.getAttributes('link').href as string | undefined) ?? '';
  linkOpen.value = true;
}

function onLinkSubmit(url: string): void {
  if (!url) {
    chain()?.unsetLink().run();
    return;
  }
  chain()?.extendMarkRange('link').setLink({ href: url }).run();
}

// Imagem por URL.
function openImageUrl(): void {
  imageUrlOpen.value = true;
}

function onImageUrlSubmit(url: string): void {
  if (url) chain()?.setImage({ src: url }).run();
}

// Imagem enviada do computador.
function pickImage(): void {
  fileInput.value?.click();
}

function onImageFile(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  if (file.size > MAX_UPLOAD_BYTES) {
    toast.error('Imagem muito grande (máximo 1 MB).');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => chain()?.setImage({ src: String(reader.result) }).run();
  reader.readAsDataURL(file);
}

const groups: Tool[][] = [
  [
    { key: 'undo', label: 'Desfazer', icon: Undo2, run: () => chain()?.undo().run() },
    { key: 'redo', label: 'Refazer', icon: Redo2, run: () => chain()?.redo().run() },
  ],
  [
    {
      key: 'h1',
      label: 'Título 1',
      icon: Heading1,
      run: () => chain()?.toggleHeading({ level: 1 }).run(),
      active: () => !!ed()?.isActive('heading', { level: 1 }),
    },
    {
      key: 'h2',
      label: 'Título 2',
      icon: Heading2,
      run: () => chain()?.toggleHeading({ level: 2 }).run(),
      active: () => !!ed()?.isActive('heading', { level: 2 }),
    },
    {
      key: 'h3',
      label: 'Título 3',
      icon: Heading3,
      run: () => chain()?.toggleHeading({ level: 3 }).run(),
      active: () => !!ed()?.isActive('heading', { level: 3 }),
    },
  ],
  [
    { key: 'bold', label: 'Negrito', icon: Bold, run: () => chain()?.toggleBold().run(), active: () => !!ed()?.isActive('bold') },
    { key: 'italic', label: 'Itálico', icon: Italic, run: () => chain()?.toggleItalic().run(), active: () => !!ed()?.isActive('italic') },
    { key: 'underline', label: 'Sublinhado', icon: UnderlineIcon, run: () => chain()?.toggleUnderline().run(), active: () => !!ed()?.isActive('underline') },
    { key: 'strike', label: 'Tachado', icon: Strikethrough, run: () => chain()?.toggleStrike().run(), active: () => !!ed()?.isActive('strike') },
    { key: 'code', label: 'Código', icon: Code, run: () => chain()?.toggleCode().run(), active: () => !!ed()?.isActive('code') },
    { key: 'highlight', label: 'Destaque', icon: Highlighter, run: () => chain()?.toggleHighlight().run(), active: () => !!ed()?.isActive('highlight') },
  ],
  [
    { key: 'bullet', label: 'Lista', icon: List, run: () => chain()?.toggleBulletList().run(), active: () => !!ed()?.isActive('bulletList') },
    { key: 'ordered', label: 'Lista numerada', icon: ListOrdered, run: () => chain()?.toggleOrderedList().run(), active: () => !!ed()?.isActive('orderedList') },
    { key: 'tasks', label: 'Lista de tarefas', icon: ListTodo, run: () => chain()?.toggleTaskList().run(), active: () => !!ed()?.isActive('taskList') },
    { key: 'quote', label: 'Citação', icon: Quote, run: () => chain()?.toggleBlockquote().run(), active: () => !!ed()?.isActive('blockquote') },
    { key: 'codeblock', label: 'Bloco de código', icon: SquareCode, run: () => chain()?.toggleCodeBlock().run(), active: () => !!ed()?.isActive('codeBlock') },
    { key: 'hr', label: 'Divisória', icon: Minus, run: () => chain()?.setHorizontalRule().run() },
  ],
  [
    { key: 'left', label: 'Alinhar à esquerda', icon: AlignLeft, run: () => chain()?.setTextAlign('left').run(), active: () => !!ed()?.isActive({ textAlign: 'left' }) },
    { key: 'center', label: 'Centralizar', icon: AlignCenter, run: () => chain()?.setTextAlign('center').run(), active: () => !!ed()?.isActive({ textAlign: 'center' }) },
    { key: 'right', label: 'Alinhar à direita', icon: AlignRight, run: () => chain()?.setTextAlign('right').run(), active: () => !!ed()?.isActive({ textAlign: 'right' }) },
  ],
  [
    { key: 'link', label: 'Link', icon: Link2, run: openLink, active: () => !!ed()?.isActive('link') },
    { key: 'image-url', label: 'Imagem por URL', icon: ImageIcon, run: openImageUrl },
    { key: 'image-file', label: 'Enviar imagem (até 1 MB)', icon: ImagePlus, run: pickImage },
    { key: 'table', label: 'Tabela 3x3', icon: TableIcon, run: () => chain()?.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  ],
  [
    { key: 'clear', label: 'Limpar formatação', icon: Eraser, run: () => chain()?.unsetAllMarks().clearNodes().run() },
  ],
];
</script>
