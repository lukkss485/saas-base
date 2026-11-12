<!-- src/views/Landing.vue -->
<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Check,
  ListChecks,
  CreditCard,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Zap,
  Mail,
} from '@lucide/vue';

const APP_NAME = 'NT-life';
const PRO_PRICE = '29,90';

const isLogged = computed(() => !!localStorage.getItem('token'));
const ctaTo = computed(() => (isLogged.value ? '/dashboard' : '/login?mode=register'));
const ctaLabel = computed(() => (isLogged.value ? 'Ir para o painel' : 'Começar grátis'));

const trustPoints = [
  'Sem cartão para começar',
  'Pagamento seguro via Mercado Pago',
  'Crie sua conta em menos de um minuto',
];

const features = [
  {
    icon: ListChecks,
    title: 'Tarefas que cabem na cabeça',
    description: 'Adicione, conclua e remova tarefas em uma lista limpa, sem menus escondidos.',
  },
  {
    icon: CreditCard,
    title: 'Assinatura sem complicação',
    description: 'Pague com Mercado Pago e o plano Pro é liberado assim que o pagamento for aprovado.',
  },
  {
    icon: ShieldCheck,
    title: 'Conta protegida',
    description: 'Login seguro, senha criptografada e recuperação de acesso por e-mail.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Crie sua conta',
    description: 'Cadastro com e-mail e senha. Leva menos de um minuto.',
  },
  {
    number: '02',
    title: 'Adicione suas tarefas',
    description: 'Escreva o que precisa ser feito e marque conforme avança.',
  },
  {
    number: '03',
    title: 'Assine o Pro quando precisar',
    description: 'Quando bater o limite do Free, libere tarefas ilimitadas com um pagamento.',
  },
];

const plans = computed(() => [
  {
    name: 'Free',
    description: 'Para experimentar e organizar o básico.',
    price: '0,00',
    period: 'para sempre',
    highlight: false,
    cta: 'Criar conta grátis',
    to: '/login?mode=register',
    items: ['Até 10 tarefas', 'Cadastro e login', 'Recuperação de senha por e-mail'],
  },
  {
    name: 'Pro',
    description: 'Para quem usa todos os dias.',
    price: PRO_PRICE,
    period: '/ 30 dias',
    highlight: true,
    cta: isLogged.value ? 'Ir para o painel' : 'Assinar Pro',
    to: isLogged.value ? '/dashboard' : '/login?mode=register',
    items: [
      'Tarefas ilimitadas',
      'Acesso por 30 dias, renovável',
      'Pagamento via Mercado Pago',
      'Ativação automática após aprovação',
    ],
  },
]);

const faq = [
  {
    question: 'Preciso pagar para começar?',
    answer: 'Não. O plano Free é gratuito e permite até 10 tarefas. Você pode assinar o Pro quando quiser.',
  },
  {
    question: 'Como funciona a assinatura Pro?',
    answer: 'Você paga pelo Mercado Pago e o plano fica ativo por 30 dias. Depois disso, basta renovar.',
  },
  {
    question: 'Esqueci minha senha. E agora?',
    answer: 'Na tela de login, clique em "Esqueci minha senha" e enviaremos um link para criar uma nova.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim. Como a assinatura é por 30 dias, você simplesmente não renova quando o período acabar.',
  },
];
</script>

<template>
  <div class="min-h-screen bg-background text-foreground scroll-smooth">

    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div
        class="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-96 max-w-3xl rounded-full bg-primary/20 blur-3xl" />

      <div class="mx-auto max-w-4xl px-6 pb-16 pt-24 text-center">
        <Badge variant="secondary" class="mb-6 gap-1.5 px-3 py-1">
          <Sparkles class="h-3.5 w-3.5" />
          {{ APP_NAME }}: tarefas organizadas em um só lugar
        </Badge>

        <h1 class="text-4xl font-bold tracking-tight sm:text-6xl">
          Organize seu dia sem o
          <span class="text-primary">caos</span>
        </h1>

        <p class="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {{ APP_NAME }} é um jeito simples de acompanhar o que precisa ser feito. Conta segura,
          assinatura pronta para usar e nada que atrapalhe.
        </p>

        <div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button as-child size="lg" class="w-full sm:w-auto">
            <RouterLink :to="ctaTo">
              {{ ctaLabel }}
              <ArrowRight class="ml-1 h-4 w-4" />
            </RouterLink>
          </Button>
          <Button as-child variant="outline" size="lg" class="w-full sm:w-auto">
            <a href="#planos">Ver planos</a>
          </Button>
        </div>

        <ul class="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <li v-for="point in trustPoints" :key="point" class="flex items-center gap-1.5">
            <ShieldCheck class="h-3.5 w-3.5 text-primary" />
            {{ point }}
          </li>
        </ul>
      </div>

      <!-- Preview do app: o pai corta o topo da imagem (overflow-hidden) e a imagem sobe com margem negativa -->
      <div class="relative mx-auto max-w-5xl px-6 pb-16">
        <div class="relative overflow-hidden rounded-2xl border shadow-2xl">
          <img
            src="/heroPreview.png"
            :alt="`Painel do ${APP_NAME} com tarefas, estatísticas e navegação lateral`"
            width="1380"
            height="1000"
            class="-mt-px block h-auto w-full"
          />
        </div>
      </div>
    </section>

    <!-- Recursos -->
    <section id="recursos" class="scroll-mt-20 px-6 py-24">
      <div class="mx-auto max-w-6xl">
        <div class="mx-auto mb-16 max-w-2xl text-center">
          <h2 class="text-3xl font-bold tracking-tight">Tudo o que você precisa, nada além disso</h2>
          <p class="mt-3 text-muted-foreground">
            Um app focado em fazer você terminar o que começou.
          </p>
        </div>

        <div class="grid gap-6 md:grid-cols-3">
          <Card v-for="feature in features" :key="feature.title" class="transition-shadow hover:shadow-lg">
            <CardHeader>
              <div class="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <component :is="feature.icon" class="h-5 w-5" />
              </div>
              <CardTitle class="text-lg">{{ feature.title }}</CardTitle>
              <CardDescription class="leading-relaxed">{{ feature.description }}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </section>

    <!-- Como funciona -->
    <section id="como-funciona" class="scroll-mt-20 border-y bg-muted/30 px-6 py-24">
      <div class="mx-auto max-w-5xl">
        <h2 class="mb-16 text-center text-3xl font-bold tracking-tight">Como funciona</h2>

        <ol class="grid gap-10 md:grid-cols-3">
          <li v-for="step in steps" :key="step.number" class="relative">
            <span class="text-sm font-semibold text-primary">{{ step.number }}</span>
            <h3 class="mt-2 text-lg font-semibold">{{ step.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{{ step.description }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Planos -->
    <section id="planos" class="scroll-mt-20 px-6 py-24">
      <div class="mx-auto max-w-4xl">
        <div class="mb-14 text-center">
          <h2 class="text-3xl font-bold tracking-tight">Planos simples</h2>
          <p class="mt-3 text-muted-foreground">Comece grátis e assine quando precisar de mais espaço.</p>
        </div>

        <div class="grid items-stretch gap-6 md:grid-cols-2">
          <Card v-for="plan in plans" :key="plan.name"
            :class="plan.highlight ? 'relative border-primary shadow-lg ring-1 ring-primary' : ''"
            class="flex flex-col">
            <CardHeader>
              <div class="flex items-center justify-between">
                <CardTitle class="text-xl">{{ plan.name }}</CardTitle>
                <Badge v-if="plan.highlight">Recomendado</Badge>
              </div>
              <CardDescription>{{ plan.description }}</CardDescription>

              <p class="pt-6">
                <span class="text-4xl font-bold">R$ {{ plan.price }}</span>
                <span class="text-sm text-muted-foreground"> {{ plan.period }}</span>
              </p>
            </CardHeader>

            <CardContent class="flex-1">
              <ul class="grid gap-3 text-sm">
                <li v-for="item in plan.items" :key="item" class="flex items-start gap-2">
                  <Check class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{{ item }}</span>
                </li>
              </ul>
            </CardContent>

            <CardFooter>
              <Button as-child class="w-full" :variant="plan.highlight ? 'default' : 'outline'">
                <RouterLink :to="plan.to">{{ plan.cta }}</RouterLink>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="scroll-mt-20 px-6 pb-24">
      <div class="mx-auto max-w-2xl">
        <h2 class="mb-10 text-center text-3xl font-bold tracking-tight">
          Perguntas frequentes
        </h2>

        <Accordion type="single" collapsible class="rounded-[1.725rem]">
          <AccordionItem v-for="(item, index) in faq" :key="item.question" :value="`item-${index}`">
            <AccordionTrigger>
              {{ item.question }}
            </AccordionTrigger>

            <AccordionContent>
              {{ item.answer }}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <p class="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Mail class="h-4 w-4" />
          Ainda tem dúvidas? Fale com a gente pelo seu e-mail de cadastro.
        </p>
      </div>
    </section>

    <!-- Chamada final -->
    <section class="px-6 pb-24">
      <div
        class="relative mx-auto max-w-3xl overflow-hidden rounded-2xl bg-primary px-8 py-16 text-center text-primary-foreground">
        <Zap class="mx-auto mb-4 h-8 w-8 opacity-80" />
        <h2 class="text-3xl font-bold tracking-tight">Pronto para começar?</h2>
        <p class="mx-auto mt-3 max-w-xl opacity-90">
          Crie sua conta em menos de um minuto e comece a organizar seu dia.
        </p>
        <Button as-child variant="secondary" size="lg" class="mt-8">
          <RouterLink :to="ctaTo">
            {{ ctaLabel }}
            <ArrowRight class="ml-1 h-4 w-4" />
          </RouterLink>
        </Button>
      </div>
    </section>
  </div>
</template>