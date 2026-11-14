<template>
  <div class="mx-auto max-w-7xl space-y-8 pb-12">
    <header
      class="relative overflow-hidden rounded-3xl border bg-card px-6 py-8 shadow-sm sm:px-8"
    >
      <div
        class="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-primary/5 blur-3xl"
      />
      <div class="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div class="max-w-2xl">
          <Badge variant="outline" class="mb-4">Design system</Badge>
          <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            UI Kit
          </h1>
          <p class="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Uma vitrine interativa dos componentes, padrões visuais e estados
            disponíveis no client.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Badge variant="secondary">Vue 3</Badge>
          <Badge variant="secondary">Tailwind CSS</Badge>
          <Badge variant="secondary">Reka UI</Badge>
        </div>
      </div>
    </header>

    <nav
      aria-label="Seções do UI Kit"
      class="flex flex-wrap gap-2 rounded-2xl border bg-card/70 p-2"
    >
      <a
        v-for="section in sections"
        :key="section.id"
        :href="`#${section.id}`"
        class="rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {{ section.label }}
      </a>
    </nav>

    <section id="foundations" class="scroll-mt-24 space-y-4">
      <SectionHeading
        eyebrow="01 / Foundations"
        title="Fundamentos visuais"
        description="Tokens semânticos do tema atual e hierarquia tipográfica."
      />
      <div class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Cores semânticas</CardTitle>
            <CardDescription>
              Os tokens se adaptam automaticamente aos temas claro e escuro.
            </CardDescription>
          </CardHeader>
          <CardContent class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div
              v-for="color in colors"
              :key="color.name"
              class="flex items-center gap-3 rounded-xl border p-3"
            >
              <span
                class="size-9 shrink-0 rounded-lg border"
                :class="color.swatch"
              />
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ color.name }}</p>
                <p class="text-xs text-muted-foreground">{{ color.token }}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">Tipografia e superfícies</CardTitle>
            <CardDescription>Escala de texto e níveis de elevação.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-5">
            <div class="space-y-2">
              <p class="text-2xl font-semibold tracking-tight">Título de página</p>
              <p class="text-base font-medium">Título de seção</p>
              <p class="text-sm">Texto padrão para conteúdo e controles.</p>
              <p class="text-xs text-muted-foreground">
                Texto auxiliar e metadados
              </p>
            </div>
            <Separator />
            <div class="flex flex-wrap items-center gap-3">
              <div class="rounded-xl border bg-background px-4 py-3 text-xs">
                Borda
              </div>
              <div class="rounded-xl border bg-card px-4 py-3 text-xs shadow-sm">
                Elevação sutil
              </div>
              <div class="rounded-xl bg-muted px-4 py-3 text-xs">
                Superfície muted
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    <section id="actions" class="scroll-mt-24 space-y-4">
      <SectionHeading
        eyebrow="02 / Actions"
        title="Ações e status"
        description="Variações de botões, tamanhos e badges para diferentes contextos."
      />
      <div class="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Botões</CardTitle>
            <CardDescription>
              Use a variante para indicar hierarquia e intenção.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-5">
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="variant in buttonVariants"
                :key="variant"
                :variant="variant"
              >
                {{ getVariantLabel(variant) }}
              </Button>
            </div>
            <Separator />
            <div class="flex flex-wrap items-center gap-2">
              <Button
                v-for="size in buttonSizes"
                :key="size"
                variant="outline"
                :size="size"
              >
                {{ getSizeLabel(size) }}
              </Button>
              <Button size="icon" variant="outline" aria-label="Adicionar">
                <Plus />
              </Button>
              <Button disabled>Desabilitado</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">Badges</CardTitle>
            <CardDescription>
              Indicadores compactos para estado, categoria ou plano.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-5">
            <div class="flex flex-wrap gap-2">
              <Badge
                v-for="variant in badgeVariants"
                :key="variant"
                :variant="variant"
              >
                {{ getVariantLabel(variant) }}
              </Badge>
            </div>
            <Separator />
            <div class="flex flex-wrap items-center gap-2">
              <Badge class="gap-1.5">
                <span class="size-1.5 rounded-full bg-current" />
                Ativo
              </Badge>
              <Badge variant="secondary">Em andamento</Badge>
              <Badge variant="outline">Rascunho</Badge>
              <Badge variant="destructive">Atenção</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    <section id="forms" class="scroll-mt-24 space-y-4">
      <SectionHeading
        eyebrow="03 / Forms"
        title="Formulários"
        description="Campos com rótulos, ajuda contextual e estados controlados."
      />
      <Card>
        <CardContent class="grid gap-6 pt-6 md:grid-cols-2">
          <div class="space-y-4">
            <div class="grid gap-2">
              <Label for="kit-name">Nome do projeto</Label>
              <Input
                id="kit-name"
                v-model="projectName"
                placeholder="Ex.: Lançamento do produto"
              />
              <p class="text-xs text-muted-foreground">
                {{ projectName.length }}/60 caracteres
              </p>
            </div>
            <div class="grid gap-2">
              <Label for="kit-email">E-mail</Label>
              <Input
                id="kit-email"
                type="email"
                placeholder="nome@empresa.com"
                aria-describedby="kit-email-help"
              />
              <p id="kit-email-help" class="text-xs text-muted-foreground">
                Usaremos este endereço para atualizações do projeto.
              </p>
            </div>
            <div class="grid gap-2">
              <Label for="kit-description">Descrição</Label>
              <Textarea
                id="kit-description"
                v-model="description"
                placeholder="Escreva uma breve descrição..."
                :rows="3"
              />
            </div>
          </div>

          <div class="space-y-5">
            <div class="grid gap-2">
              <Label for="kit-priority">Prioridade</Label>
              <Select v-model="priority">
                <SelectTrigger id="kit-priority" class="w-full">
                  <SelectValue placeholder="Selecione uma prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
              <p class="text-xs text-muted-foreground">
                Selecionada: {{ priorityLabel }}
              </p>
            </div>

            <Separator />

            <label class="flex cursor-pointer items-start gap-3">
              <Checkbox
                :model-value="includeUpdates"
                class="mt-0.5"
                @update:model-value="includeUpdates = !!$event"
              />
              <span class="space-y-1">
                <span class="block text-sm font-medium">Receber novidades</span>
                <span class="block text-xs text-muted-foreground">
                  Envie atualizações importantes para meu e-mail.
                </span>
              </span>
            </label>

            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-sm font-medium">Projeto público</p>
                <p class="text-xs text-muted-foreground">
                  Permite que outras pessoas encontrem este projeto.
                </p>
              </div>
              <Switch
                :model-value="isPublic"
                aria-label="Projeto público"
                @update:model-value="isPublic = !!$event"
              />
            </div>

            <Button class="w-full sm:w-auto" @click="showFormToast">
              <Check />
              Salvar preferências
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>

    <section id="feedback" class="scroll-mt-24 space-y-4">
      <SectionHeading
        eyebrow="04 / Feedback"
        title="Feedback e progresso"
        description="Mensagens claras para sucesso, informação e acompanhamento."
      />
      <div class="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Alertas</CardTitle>
            <CardDescription>
              Mensagens inline com diferentes níveis de ênfase.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <Alert>
              <Info />
              <AlertTitle>Tudo certo por aqui</AlertTitle>
              <AlertDescription>
                Seus dados foram sincronizados recentemente.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>Ação necessária</AlertTitle>
              <AlertDescription>
                Confira os dados de pagamento para evitar interrupções.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">Progresso</CardTitle>
            <CardDescription>
              Valores de progresso podem ser atualizados por estado.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-5">
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span>Onboarding</span>
                <span class="text-muted-foreground">{{ progress }}%</span>
              </div>
              <Progress :model-value="progress" />
            </div>
            <div class="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                @click="progress = Math.max(0, progress - 10)"
              >
                <Minus />
                Reduzir
              </Button>
              <Button
                variant="outline"
                size="sm"
                @click="progress = Math.min(100, progress + 10)"
              >
                <Plus />
                Avançar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    <section id="composition" class="scroll-mt-24 space-y-4">
      <SectionHeading
        eyebrow="05 / Composition"
        title="Composição"
        description="Componentes maiores montados com os mesmos blocos reutilizáveis."
      />
      <div class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader class="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle class="text-base">Visão geral do workspace</CardTitle>
              <CardDescription class="mt-1">
                Um resumo rápido da atividade recente da equipe.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" @click="dialogOpen = true">
              <Eye />
              Ver detalhes
            </Button>
          </CardHeader>
          <CardContent class="space-y-5">
            <Tabs v-model="activeTab">
              <TabsList>
                <TabsTrigger value="overview">Visão geral</TabsTrigger>
                <TabsTrigger value="activity">Atividade</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" class="pt-3">
                <div class="grid gap-3 sm:grid-cols-3">
                  <div
                    v-for="stat in stats"
                    :key="stat.label"
                    class="rounded-2xl border bg-background p-4"
                  >
                    <p class="text-xs text-muted-foreground">{{ stat.label }}</p>
                    <p class="mt-2 text-2xl font-semibold tracking-tight">
                      {{ stat.value }}
                    </p>
                    <p class="mt-1 text-xs text-muted-foreground">
                      {{ stat.note }}
                    </p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="activity" class="pt-3">
                <div class="space-y-4">
                  <div
                    v-for="activity in activities"
                    :key="activity.title"
                    class="flex items-center gap-3"
                  >
                    <Avatar>
                      <AvatarFallback>{{ activity.initials }}</AvatarFallback>
                    </Avatar>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium">
                        {{ activity.title }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {{ activity.meta }}
                      </p>
                    </div>
                    <Badge variant="secondary">{{ activity.status }}</Badge>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card class="flex flex-col">
          <CardHeader>
            <CardTitle class="text-base">Pronto para usar</CardTitle>
            <CardDescription>
              Combine os componentes para criar fluxos consistentes.
            </CardDescription>
          </CardHeader>
          <CardContent class="flex flex-1 flex-col justify-between gap-6">
            <div class="rounded-2xl border bg-muted/40 p-4">
              <div class="flex items-center gap-3">
                <div class="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Layers />
                </div>
                <div>
                  <p class="text-sm font-medium">Biblioteca do client</p>
                  <p class="text-xs text-muted-foreground">
                    Componentes acessíveis e reutilizáveis
                  </p>
                </div>
              </div>
            </div>
            <Button variant="secondary" class="w-full" @click="showToast">
              <Sparkles />
              Testar notificação
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>

    <Dialog v-model:open="dialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalhes do workspace</DialogTitle>
          <DialogDescription>
            Exemplo de diálogo para confirmar ou complementar uma ação.
          </DialogDescription>
        </DialogHeader>
        <div class="rounded-xl border bg-muted/40 p-4 text-sm">
          O diálogo usa os mesmos tokens e se adapta ao tema ativo.
        </div>
        <DialogFooter>
          <Button variant="outline" @click="dialogOpen = false">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import { toast } from 'vue-sonner'
import {
  Check,
  Eye,
  Info,
  Layers,
  Minus,
  Plus,
  Sparkles,
  TriangleAlert,
} from 'lucide-vue-next'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

const buttonVariants = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const
const badgeVariants = ['default', 'secondary', 'outline', 'destructive'] as const
const buttonSizes = ['xs', 'sm', 'default', 'lg'] as const

const variantLabels: Record<(typeof buttonVariants)[number], string> = {
  default: 'Principal',
  secondary: 'Secundário',
  outline: 'Contorno',
  ghost: 'Ghost',
  destructive: 'Destrutivo',
  link: 'Link',
}
const sizeLabels: Record<(typeof buttonSizes)[number], string> = {
  xs: 'Extra pequeno',
  sm: 'Pequeno',
  default: 'Padrão',
  lg: 'Grande',
}

const sections = [
  { id: 'foundations', label: 'Fundamentos' },
  { id: 'actions', label: 'Ações e status' },
  { id: 'forms', label: 'Formulários' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'composition', label: 'Composição' },
]

const colors = [
  { name: 'Fundo', token: 'background', swatch: 'bg-background' },
  { name: 'Texto', token: 'foreground', swatch: 'bg-foreground' },
  { name: 'Primária', token: 'primary', swatch: 'bg-primary' },
  { name: 'Secundária', token: 'secondary', swatch: 'bg-secondary' },
  { name: 'Neutro', token: 'muted', swatch: 'bg-muted' },
  { name: 'Alerta', token: 'destructive', swatch: 'bg-destructive' },
]

const priorityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}

const stats = [
  { label: 'Projetos ativos', value: '12', note: '+2 este mês' },
  { label: 'Tarefas concluídas', value: '84%', note: 'Neste ciclo' },
  { label: 'Membros', value: '08', note: 'Em 3 equipes' },
]

const activities = [
  { initials: 'AC', title: 'Ana atualizou o roadmap', meta: 'Há 12 minutos', status: 'Projeto' },
  { initials: 'RM', title: 'Rafael concluiu uma tarefa', meta: 'Há 1 hora', status: 'Tarefa' },
  { initials: 'JL', title: 'Julia entrou no workspace', meta: 'Ontem', status: 'Equipe' },
]

const projectName = ref('')
const description = ref('')
const priority = ref<'low' | 'medium' | 'high'>('medium')
const priorityLabel = computed(() => priorityLabels[priority.value])
const includeUpdates = ref(true)
const isPublic = ref(false)
const progress = ref(68)
const activeTab = ref('overview')
const dialogOpen = ref(false)

const SectionHeading = defineComponent({
  props: {
    eyebrow: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
  },
  setup(props) {
    return () =>
      h('header', { class: 'space-y-1' }, [
        h(
          'p',
          {
            class:
              'text-xs font-semibold uppercase tracking-[0.16em] text-primary',
          },
          props.eyebrow,
        ),
        h('h2', { class: 'text-xl font-semibold tracking-tight' }, props.title),
        h('p', { class: 'text-sm text-muted-foreground' }, props.description),
      ])
  },
})

function getVariantLabel(variant: keyof typeof variantLabels) {
  return variantLabels[variant]
}

function getSizeLabel(size: keyof typeof sizeLabels) {
  return sizeLabels[size]
}

function showToast() {
  toast.success('Notificação de exemplo', {
    description: 'Os componentes de feedback também podem ser acionados por eventos.',
  })
}

function showFormToast() {
  toast.success('Preferências salvas', {
    description: `Prioridade ${priorityLabel.value} selecionada.`,
  })
}
</script>

<style scoped>
:global(html) {
  scroll-behavior: smooth;
}
</style>
