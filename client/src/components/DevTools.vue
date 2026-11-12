<template>
  <div v-if="isDev" class="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2 text-sm">
    <Transition name="devtools-pop">
      <section
        v-if="open"
        class="flex max-h-[82vh] w-[min(94vw,58rem)] flex-col overflow-hidden rounded-3xl border border-border/70 bg-background/95 shadow-2xl shadow-black/20 backdrop-blur-2xl"
        aria-label="Painel de ferramentas de desenvolvimento"
      >
        <header class="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-4 py-3">
          <div class="flex min-w-0 items-center gap-2.5">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Activity class="h-4 w-4" /></span>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-semibold tracking-tight">Dev Tools</h2>
                <Badge variant="outline" class="rounded-full text-[10px]">DEV ONLY</Badge>
              </div>
              <p class="max-w-[28rem] truncate text-xs text-muted-foreground">{{ route.fullPath }}</p>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" class="h-8 w-8 rounded-xl" title="Atualizar sessão" aria-label="Atualizar sessão" :disabled="refreshing" @click="refresh">
              <RefreshCw class="h-4 w-4" :class="refreshing ? 'animate-spin' : ''" />
            </Button>
            <Button variant="ghost" size="icon" class="h-8 w-8 rounded-xl" aria-label="Fechar Dev Tools" @click="open = false"><X class="h-4 w-4" /></Button>
          </div>
        </header>

        <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
          <section class="rounded-2xl border border-border/60 bg-card/70 p-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted"><ShieldCheck class="h-5 w-5 text-muted-foreground" /></span>
                <div class="min-w-0">
                  <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Usuário atual</p>
                  <p class="truncate font-medium">{{ me?.name || me?.email || 'Não logado' }}</p>
                  <p v-if="me?.email && me?.name" class="truncate text-xs text-muted-foreground">{{ me.email }}</p>
                  <p v-if="me?.id != null" class="text-xs text-muted-foreground">ID: {{ me.id }}</p>
                </div>
              </div>
              <Badge v-if="me" :variant="me.plan === 'pro' ? 'default' : 'secondary'" class="rounded-full">{{ me.plan }}</Badge>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" class="rounded-xl" :disabled="busy" @click="login('free')">Entrar como Free</Button>
              <Button size="sm" class="rounded-xl" :disabled="busy" @click="login('pro')">Entrar como Pro</Button>
              <Button v-if="hasToken" size="sm" variant="ghost" class="rounded-xl" :disabled="busy" @click="logout">Sair</Button>
            </div>
            <p v-if="error" class="mt-2 text-xs text-destructive" role="alert">{{ error }}</p>
          </section>

          <section class="space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="font-semibold">Tráfego da API</h3>
                <p class="text-xs text-muted-foreground">{{ filteredRecords.length }} de {{ records.length }} chamadas registradas nesta sessão</p>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" class="h-8 rounded-xl" :disabled="!records.length" @click="exportLogs"><Download class="mr-1.5 h-3.5 w-3.5" />Exportar JSON</Button>
                <Button size="sm" variant="ghost" class="h-8 rounded-xl" :disabled="!records.length" @click="clearDevApiRecords"><Trash2 class="mr-1.5 h-3.5 w-3.5" />Limpar</Button>
              </div>
            </div>

            <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <div class="relative">
                <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input v-model="search" class="h-9 rounded-xl pl-9" placeholder="Buscar endpoint, usuário ou payload..." aria-label="Buscar chamadas da API" />
              </div>
              <select v-model="areaFilter" class="h-9 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Filtrar por área da API">
                <option value="all">Todas as APIs</option>
                <option v-for="area in areas" :key="area" :value="area">{{ areaLabel(area) }}</option>
              </select>
            </div>

            <div v-if="!filteredRecords.length" class="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center">
              <Activity class="mx-auto h-6 w-6 text-muted-foreground" />
              <p class="mt-2 font-medium">Nenhuma chamada registrada</p>
              <p class="mt-1 text-xs text-muted-foreground">O monitor registra chamadas fetch das APIs classificadas depois de ser instalado.</p>
            </div>

            <div v-else class="space-y-2">
              <article v-for="record in filteredRecords" :key="record.id" class="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
                <details>
                  <summary class="flex cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-2.5 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
                    <Badge :variant="methodVariant(record.method)" class="min-w-[3.5rem] justify-center rounded-lg font-mono text-[10px]">{{ record.method }}</Badge>
                    <Badge variant="secondary" class="rounded-lg text-[10px]">{{ areaLabel(record.area) }}</Badge>
                    <span class="min-w-0 flex-1 truncate font-mono text-xs" :title="record.url">{{ record.url }}</span>
                    <Badge v-if="record.status !== null" :variant="record.ok ? 'outline' : 'destructive'" class="rounded-lg font-mono text-[10px]">{{ record.status }}</Badge>
                    <Badge v-else variant="secondary" class="rounded-lg text-[10px]">Em andamento</Badge>
                    <span class="shrink-0 text-[10px] tabular-nums text-muted-foreground">{{ record.durationMs === null ? '—' : `${record.durationMs} ms` }}</span>
                  </summary>

                  <div class="space-y-3 border-t border-border/50 bg-muted/15 p-3">
                    <div class="grid gap-2 sm:grid-cols-2">
                      <div class="rounded-xl border border-border/50 bg-background/70 p-2.5">
                        <p class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quem iniciou</p>
                        <p class="break-words text-xs">{{ record.actor }}</p>
                      </div>
                      <div class="rounded-xl border border-border/50 bg-background/70 p-2.5">
                        <p class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Horário</p>
                        <p class="text-xs">{{ dateTime(record.startedAt) }}</p>
                      </div>
                    </div>
                    <p v-if="record.error" class="rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive" role="alert">{{ record.error }}</p>
                    <div class="grid gap-3 lg:grid-cols-2">
                      <div class="min-w-0">
                        <div class="mb-1 flex items-center justify-between gap-2"><h4 class="text-xs font-semibold">Payload enviado à API</h4><span class="text-[10px] text-muted-foreground">request body</span></div>
                        <pre class="max-h-56 overflow-auto rounded-xl border border-border/50 bg-background p-2.5 text-[11px] leading-relaxed">{{ pretty(record.requestBody) }}</pre>
                      </div>
                      <div class="min-w-0">
                        <div class="mb-1 flex items-center justify-between gap-2"><h4 class="text-xs font-semibold">Resposta da API</h4><span class="text-[10px] text-muted-foreground">response body</span></div>
                        <pre class="max-h-56 overflow-auto rounded-xl border border-border/50 bg-background p-2.5 text-[11px] leading-relaxed">{{ pretty(record.responseBody) }}</pre>
                      </div>
                    </div>
                  </div>
                </details>
              </article>
            </div>
            <p class="text-[11px] leading-relaxed text-muted-foreground">Segurança: senhas, tokens, cookies e credenciais são ocultados. Corpos grandes são truncados. O monitor mostra payloads e respostas HTTP; ele não lê o PostgreSQL diretamente nem prova, sozinho, que uma gravação foi persistida.</p>
          </section>

          <section class="rounded-2xl border border-border/60 p-3">
            <div class="mb-2 flex items-center justify-between gap-2"><h3 class="font-semibold">Rotas do aplicativo</h3><Badge variant="outline" class="rounded-full">{{ pages.length }}</Badge></div>
            <div class="max-h-40 space-y-1 overflow-y-auto">
              <button v-for="page in pages" :key="page.path" type="button" class="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted" :class="route.path === page.path ? 'bg-muted font-medium' : ''" @click="navigate(page)">
                <span class="truncate font-mono text-xs">{{ page.path }}</span>
                <span class="shrink-0 text-[10px]" :class="page.auth ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'">{{ page.auth ? 'privada' : 'pública' }}</span>
              </button>
            </div>
          </section>
        </div>
        <footer class="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-4 py-2.5 text-[10px] text-muted-foreground">
          <span>Monitor local de desenvolvimento</span>
          <span>{{ records.length }} chamadas · limite {{ maxRecords }}</span>
        </footer>
      </section>
    </Transition>

    <Button class="h-11 w-11 rounded-full border border-white/30 p-0 shadow-lg shadow-black/15 transition-transform duration-200 hover:scale-105 active:scale-95" aria-label="Abrir Dev Tools" :aria-expanded="open" @click="open = !open">
      <Activity class="h-5 w-5" />
    </Button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Activity, Download, RefreshCw, Search, ShieldCheck, Trash2, X } from 'lucide-vue-next';
import {
  clearDevApiRecords,
  getDevApiRecords,
  installDevApiMonitor,
  setDevApiActor,
  subscribeDevApiRecords,
  type DevApiActor,
  type DevApiRecord,
} from '../lib/devApiMonitor';

type Me = { id?: number | string; name?: string; email: string; plan: 'free' | 'pro' };
type Page = { path: string; auth: boolean };

const isDev = import.meta.env.DEV;
const route = useRoute();
const router = useRouter();
const open = ref(false);
const busy = ref(false);
const refreshing = ref(false);
const error = ref('');
const me = ref<Me | null>(null);
const hasToken = ref(false);
const search = ref('');
const areaFilter = ref('all');
const records = ref<DevApiRecord[]>(getDevApiRecords());
const maxRecords = 150;
let unsubscribe: (() => void) | null = null;

const pages = computed<Page[]>(() => {
  const unique = new Map<string, Page>();
  for (const record of router.getRoutes()) {
    if (record.redirect || record.path.includes(':')) continue;
    if (!unique.has(record.path)) unique.set(record.path, { path: record.path, auth: Boolean(record.meta.auth) });
  }
  return [...unique.values()].sort((a, b) => a.path.localeCompare(b.path));
});

const areas = computed(() => [...new Set(records.value.map((record) => record.area))].sort());
const filteredRecords = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('pt-BR');
  return records.value.filter((record) => {
    if (areaFilter.value !== 'all' && record.area !== areaFilter.value) return false;
    if (!query) return true;
    const haystack = [record.url, record.method, record.area, record.actor, pretty(record.requestBody), pretty(record.responseBody), record.error ?? ''].join(' ').toLocaleLowerCase('pt-BR');
    return haystack.includes(query);
  });
});

function actorFromMe(value: Me | null): DevApiActor {
  return value ? { id: value.id, email: value.email, name: value.name, plan: value.plan } : null;
}

async function refresh(): Promise<void> {
  if (!isDev) return;
  refreshing.value = true;
  hasToken.value = Boolean(localStorage.getItem('token'));
  if (!hasToken.value) {
    me.value = null;
    setDevApiActor(null);
    refreshing.value = false;
    return;
  }
  try {
    me.value = await api<Me>('/auth/me');
    setDevApiActor(actorFromMe(me.value));
  } catch {
    me.value = null;
    setDevApiActor(null);
  } finally {
    refreshing.value = false;
  }
}

async function login(plan: 'free' | 'pro'): Promise<void> {
  if (!isDev || busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    const result = await api<{ token: string }>('/dev/login', { method: 'POST', body: { plan } });
    localStorage.setItem('token', result.token);
    hasToken.value = true;
    await refresh();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Erro ao entrar';
  } finally {
    busy.value = false;
  }
}

async function logout(): Promise<void> {
  localStorage.removeItem('token');
  hasToken.value = false;
  me.value = null;
  setDevApiActor(null);
  await router.push('/login');
}

async function navigate(page: Page): Promise<void> {
  if (page.auth && !localStorage.getItem('token')) {
    await login('free');
    if (!localStorage.getItem('token')) return;
  }
  await router.push(page.path);
}

function pretty(value: unknown): string {
  if (value === undefined) return '—';
  try {
    return JSON.stringify(value, null, 2) ?? '—';
  } catch {
    return String(value);
  }
}

function dateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
}

function areaLabel(area: string): string {
  const labels: Record<string, string> = {
    auth: 'Autenticação',
    finance: 'Financeiro',
    'tasks/calendar': 'Tarefas / Calendário',
    dashboard: 'Dashboard',
    team: 'Equipe',
    reports: 'Relatórios',
    'projects/notes': 'Projetos / Notas',
    'profile/settings': 'Perfil / Configurações',
    'notifications/activity': 'Notificações / Atividade',
    'api (não classificada)': 'API não classificada',
    outros: 'Outros',
  };
  return labels[area] ?? area;
}

function methodVariant(method: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (method === 'POST') return 'default';
  if (method === 'DELETE') return 'destructive';
  if (method === 'PATCH' || method === 'PUT') return 'secondary';
  return 'outline';
}

function exportLogs(): void {
  const blob = new Blob([JSON.stringify(records.value, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `nt-life-api-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

watch(me, (value) => setDevApiActor(actorFromMe(value)), { deep: true });
watch(() => route.fullPath, () => { void refresh(); });

onMounted(() => {
  if (!isDev) return;
  installDevApiMonitor();
  unsubscribe = subscribeDevApiRecords((snapshot) => { records.value = snapshot; });
  void refresh();
});

onBeforeUnmount(() => { unsubscribe?.(); });
</script>

<style scoped>
.devtools-pop-enter-active,
.devtools-pop-leave-active {
  transition: opacity 180ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
.devtools-pop-enter-from,
.devtools-pop-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
}
@media (prefers-reduced-motion: reduce) {
  .devtools-pop-enter-active,
  .devtools-pop-leave-active { transition-duration: 1ms !important; }
}
</style>
