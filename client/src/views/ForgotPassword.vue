<template>
  <Card class="w-full">
    <CardHeader>
      <CardTitle>{{ titles[step] }}</CardTitle>
      <CardDescription>{{ descriptions[step] }}</CardDescription>
    </CardHeader>

    <CardContent>
      <!-- 1. E-mail -->
      <form v-if="step === 'email'" class="grid gap-4" @submit.prevent="sendCode">
        <div class="grid gap-2">
          <Label for="email">E-mail</Label>
          <Input id="email" v-model="email" type="email" required :disabled="loading" />
        </div>
        <Button type="submit" class="w-full" :disabled="loading">
          {{ loading ? 'Enviando...' : 'Enviar código' }}
        </Button>
      </form>

      <!-- 2. Código -->
      <form v-else-if="step === 'code'" class="grid gap-4" @submit.prevent="verifyCode">
        <p class="text-sm text-muted-foreground">
          Enviamos um código para <span class="font-medium text-foreground">{{ email }}</span>.
        </p>

        <Input
          v-model="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          placeholder="000000"
          class="text-center text-2xl tracking-[0.5em]"
          :disabled="loading"
          autofocus
          @input="onCodeInput"
        />

        <Button type="submit" class="w-full" :disabled="loading || code.length !== 6">
          {{ loading ? 'Verificando...' : 'Verificar código' }}
        </Button>

        <div class="flex items-center justify-between text-sm">
          <button
            type="button"
            class="underline disabled:opacity-50 disabled:no-underline"
            :disabled="resendIn > 0 || loading"
            @click="sendCode"
          >
            {{ resendIn > 0 ? `Reenviar em ${resendIn}s` : 'Reenviar código' }}
          </button>
          <button type="button" class="underline" @click="goTo('email')">Trocar e-mail</button>
        </div>
      </form>

      <!-- 3. Nova senha -->
      <form v-else-if="step === 'password'" class="grid gap-4" @submit.prevent="savePassword">
        <div class="grid gap-2">
          <Label for="password">Nova senha</Label>
          <Input id="password" v-model="password" type="password" minlength="6" required :disabled="loading" />
        </div>
        <div class="grid gap-2">
          <Label for="confirm">Confirme a nova senha</Label>
          <Input id="confirm" v-model="confirm" type="password" required :disabled="loading" />
        </div>
        <Button type="submit" class="w-full" :disabled="loading">
          {{ loading ? 'Salvando...' : 'Salvar senha' }}
        </Button>
      </form>

      <!-- 4. Concluído -->
      <div v-else class="grid gap-4">
        <p class="text-sm text-emerald-600">Senha redefinida com sucesso.</p>
        <Button as-child class="w-full">
          <RouterLink to="/login">Entrar</RouterLink>
        </Button>
      </div>

      <p v-if="info" class="mt-4 text-sm text-emerald-600">{{ info }}</p>
      <p v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>
    </CardContent>

    <CardFooter v-if="step !== 'done'" class="justify-center">
      <Button as-child variant="link">
        <RouterLink to="/login">Voltar para o login</RouterLink>
      </Button>
    </CardFooter>
  </Card>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

type Step = 'email' | 'code' | 'password' | 'done';

const titles: Record<Step, string> = {
  email: 'Esqueci minha senha',
  code: 'Digite o código',
  password: 'Nova senha',
  done: 'Pronto',
};

const descriptions: Record<Step, string> = {
  email: 'Informe o e-mail da sua conta. Enviaremos um código de verificação.',
  code: 'O código vale por 10 minutos.',
  password: 'Escolha uma nova senha para a sua conta.',
  done: '',
};

const step = ref<Step>('email');
const email = ref('');
const code = ref('');
const resetToken = ref('');
const password = ref('');
const confirm = ref('');
const info = ref('');
const error = ref('');
const loading = ref(false);
const resendIn = ref(0);

let timer: ReturnType<typeof setInterval> | undefined;

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Algo deu errado';
}

function goTo(next: Step): void {
  step.value = next;
  error.value = '';
  info.value = '';
  code.value = '';
}

function startCooldown(seconds = 30): void {
  resendIn.value = seconds;
  clearInterval(timer);
  timer = setInterval(() => {
    resendIn.value--;
    if (resendIn.value <= 0) clearInterval(timer);
  }, 1000);
}

function onCodeInput(): void {
  code.value = code.value.replace(/\D/g, '').slice(0, 6);
}

async function sendCode(): Promise<void> {
  error.value = '';
  info.value = '';
  loading.value = true;
  try {
    const d = await api<{ message: string }>('/auth/forgot', {
      method: 'POST',
      body: { email: email.value },
    });
    info.value = d.message;
    step.value = 'code';
    startCooldown();
  } catch (e) {
    error.value = msg(e);
  } finally {
    loading.value = false;
  }
}

async function verifyCode(): Promise<void> {
  if (loading.value) return;
  error.value = '';
  loading.value = true;
  try {
    const d = await api<{ verified: boolean; resetToken?: string }>('/auth/forgot/verify', {
      method: 'POST',
      body: { email: email.value, code: code.value },
    });
    if (d.verified && d.resetToken) {
      resetToken.value = d.resetToken;
      goTo('password');
    } else {
      error.value = 'Código inválido ou expirado';
      code.value = '';
    }
  } catch {
    // A API responde 400 quando o código está errado ou expirou
    error.value = 'Código inválido ou expirado';
    code.value = '';
  } finally {
    loading.value = false;
  }
}

async function savePassword(): Promise<void> {
  error.value = '';
  if (password.value !== confirm.value) {
    error.value = 'As senhas não coincidem';
    return;
  }
  loading.value = true;
  try {
    await api('/auth/forgot/reset', {
      method: 'POST',
      body: { resetToken: resetToken.value, password: password.value },
    });
    step.value = 'done';
  } catch (e) {
    error.value = msg(e);
    if (msg(e).includes('expirad') || msg(e).includes('inválida')) goTo('email');
  } finally {
    loading.value = false;
  }
}

// Envia automaticamente ao digitar o sexto dígito
watch(code, (value) => {
  if (value.length === 6 && step.value === 'code' && !loading.value) verifyCode();
});

onUnmounted(() => clearInterval(timer));
</script>