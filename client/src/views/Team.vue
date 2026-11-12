<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-3xl font-bold tracking-tight">Equipe</h1>
      <p class="mt-1 text-muted-foreground">Convide pessoas e defina o que cada uma pode fazer.</p>
    </header>

    <div class="grid gap-4 xl:grid-cols-3">
      <Card class="xl:col-span-2">
        <CardHeader>
          <CardTitle class="text-base">Membros</CardTitle>
          <CardDescription>
            {{ members.length + 1 }} {{ members.length ? 'pessoas' : 'pessoa' }} no espaço
          </CardDescription>
        </CardHeader>

        <CardContent class="space-y-4">
          <form class="grid gap-2 sm:grid-cols-[1fr_11rem_auto]" @submit.prevent="invite">
            <Input v-model="email" type="email" placeholder="E-mail da pessoa" required />
            <Select :model-value="newRole" @update:model-value="(v) => (newRole = v as Role)">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value">
                  {{ r.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" :disabled="!email.trim() || invitePending">
              <UserPlus class="h-4 w-4" />
              Convidar
            </Button>
          </form>

          <ul class="divide-y">
            <li class="flex items-center gap-3 py-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">
                  {{ me?.email }} <span class="text-muted-foreground">(você)</span>
                </p>
                <p class="text-xs text-muted-foreground">Proprietário do espaço</p>
              </div>
              <Badge>Proprietário</Badge>
            </li>

            <li v-for="m in members" :key="m.id" class="flex items-center gap-3 py-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{{ m.email }}</p>
                <p class="text-xs text-muted-foreground">Convidado {{ timeAgo(m.invited_at) }}</p>
              </div>

              <Badge :variant="m.status === 'ativo' ? 'default' : 'outline'">
                {{ m.status === 'ativo' ? 'Ativo' : 'Pendente' }}
              </Badge>

              <Select :model-value="m.role" @update:model-value="(v) => setRole(m.id, v as Role)">
                <SelectTrigger class="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value">
                    {{ r.label }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" size="icon" :aria-label="`Remover ${m.email}`" @click="askRemoveMember(m)">
                <Trash2 class="h-4 w-4" />
              </Button>
            </li>
          </ul>

          <p v-if="!members.length" class="py-6 text-center text-sm text-muted-foreground">
            Ninguém convidado ainda.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Permissões</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4 text-sm">
          <div v-for="r in ROLE_OPTIONS" :key="r.value">
            <p class="font-medium">{{ r.label }}</p>
            <p class="text-muted-foreground">{{ r.description }}</p>
          </div>
          <p class="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Por enquanto, os convidados ainda não acessam seus dados. Espaços compartilhados entram na próxima etapa.
          </p>
        </CardContent>
      </Card>
    </div>
    <ConfirmDialog v-model:open="removeOpen" title="Remover membro?" :description="removeDescription"
      confirm-label="Remover" destructive @confirm="doRemoveMember" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { timeAgo } from '@/lib/format';
import { useMe } from '@/queries/tasks';
import { useTeam, useTeamActions, type Role, type TeamMember } from '@/queries/extra';
import { Trash2, UserPlus } from 'lucide-vue-next';
import ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue';

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: 'admin', label: 'Administrador', description: 'Gerencia projetos, tarefas e membros.' },
  { value: 'membro', label: 'Membro', description: 'Cria e edita tarefas e projetos.' },
  { value: 'visualizador', label: 'Visualizador', description: 'Só consulta, sem editar.' },
];

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Algo deu errado';
}

const { data: me } = useMe();
const { data: teamData } = useTeam();
const actions = useTeamActions();

const members = computed<TeamMember[]>(() => teamData.value?.members ?? []);

const email = ref('');
const newRole = ref<Role>('membro');
const invitePending = computed(() => actions.invite.isPending.value);

function invite(): void {
  actions.invite.mutate(
    { email: email.value.trim(), role: newRole.value },
    {
      onSuccess: () => {
        email.value = '';
        toast.success('Convite enviado');
      },
      onError: (e) => toast.error(errMsg(e)),
    }
  );
}

function setRole(id: number, role: Role): void {
  actions.setRole.mutate({ id, role }, { onError: (e) => toast.error(errMsg(e)) });
}

const removeOpen = ref(false);
const toRemove = ref<TeamMember | null>(null);
const removeDescription = computed(() =>
  toRemove.value ? `${toRemove.value.email} deixará de fazer parte da equipe.` : ''
);

function askRemoveMember(m: TeamMember): void {
  toRemove.value = m;
  removeOpen.value = true;
}

function doRemoveMember(): void {
  const m = toRemove.value;
  if (!m) return;
  actions.remove.mutate(m.id, {
    onSuccess: () => toast('Membro removido'),
    onError: (e) => toast.error(errMsg(e)),
  });
  toRemove.value = null;
}
</script>