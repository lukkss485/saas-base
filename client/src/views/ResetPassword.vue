<template>
  <Card>
    <CardHeader>
      <CardTitle>Nova senha</CardTitle>
    </CardHeader>

    <CardContent>
      <template v-if="!token">
        <p class="text-sm text-destructive">Link incompleto.</p>
        <Button as-child variant="link" class="px-0">
          <RouterLink to="/forgot-password">Solicitar um novo link</RouterLink>
        </Button>
      </template>

      <template v-else-if="!done">
        <form class="grid gap-4" @submit.prevent="submit">
          <div class="grid gap-2">
            <Label for="password">Nova senha</Label>
            <Input id="password" v-model="password" type="password" minlength="6" required :disabled="loading" />
          </div>
          <div class="grid gap-2">
            <Label for="confirm">Confirme a nova senha</Label>
            <Input id="confirm" v-model="confirm" type="password" required :disabled="loading" />
          </div>

          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

          <Button type="submit" class="w-full" :disabled="loading">
            {{ loading ? 'Salvando...' : 'Salvar senha' }}
          </Button>
        </form>
      </template>

      <template v-else>
        <p class="text-sm text-emerald-600">Senha redefinida com sucesso.</p>
        <Button as-child class="mt-4 w-full">
          <RouterLink to="/login">Entrar</RouterLink>
        </Button>
      </template>
    </CardContent>
  </Card>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { api } from '../api.ts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const route = useRoute();
const token = String(route.query.token || '');
const password = ref('');
const confirm = ref('');
const error = ref('');
const loading = ref(false);
const done = ref(false);

async function submit() {
  error.value = '';
  if (password.value !== confirm.value) {
    error.value = 'As senhas não coincidem.';
    return;
  }
  loading.value = true;
  try {
    await api('/auth/reset', { method: 'POST', body: { token, password: password.value } });
    done.value = true;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>