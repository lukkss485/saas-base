<template>
  <main class="mx-auto max-w-xl">
    <Card>
      <CardHeader>
        <CardTitle>{{ mode === 'login' ? 'Entrar' : 'Criar conta' }}</CardTitle>
        <CardDescription>
          {{ mode === 'login' ? 'Acesse sua conta para continuar' : 'Preencha os dados para começar' }}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form class="grid gap-4" @submit.prevent="submit">
          <div v-if="mode === 'register'" class="grid gap-2">
            <Label for="name">Nome</Label>
            <Input id="name" v-model="name" placeholder="Seu nome" />
          </div>

          <div class="grid gap-2">
            <Label for="email">E-mail</Label>
            <Input id="email" v-model="email" type="email" placeholder="voce@exemplo.com" required />
          </div>

          <div class="grid gap-2">
            <div class="flex items-center justify-between">
              <Label for="password">Senha</Label>
              <RouterLink v-if="mode === 'login'" to="/forgot-password" class="text-sm text-primary hover:underline">
                Esqueci minha senha
              </RouterLink>
            </div>
            <PasswordInput id="password" v-model="password" required />
          </div>

          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

          <Button type="submit" class="w-full" :disabled="loading">
            {{ loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Cadastrar' }}
          </Button>
        </form>
      </CardContent>

      <CardFooter class="justify-center">
        <Button variant="link" @click="toggleMode">
          {{ mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre' }}
        </Button>
      </CardFooter>
    </Card>
  </main>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { api } from '../api.ts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import PasswordInput from './PasswordInput.vue';

const router = useRouter();
const mode = ref('login');
const name = ref('');
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login';
  error.value = '';
}

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const path = mode.value === 'login' ? '/auth/login' : '/auth/register';
    const body = mode.value === 'login'
      ? { email: email.value, password: password.value }
      : { email: email.value, password: password.value, name: name.value };
    const data = await api(path, { method: 'POST', body });
    localStorage.setItem('token', data.token);
    router.push('/dashboard');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>