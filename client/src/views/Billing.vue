<template>
  <Card>
    <CardHeader>
      <CardTitle>Plano</CardTitle>
      <CardDescription>Gerencie sua assinatura</CardDescription>
    </CardHeader>

    <CardContent class="grid gap-4">
      <p v-if="status === 'success'" class="text-sm text-emerald-600">
        Pagamento recebido. Seu plano será atualizado assim que o Mercado Pago confirmar.
      </p>
      <p v-if="status === 'failure'" class="text-sm text-destructive">
        O pagamento não foi concluído.
      </p>

      <div class="flex items-center gap-2">
        <span class="text-sm text-muted-foreground">Plano atual:</span>
        <Badge :variant="plan === 'free' ? 'secondary' : 'default'">
          {{ plan === 'free' ? 'Free' : 'Pro' }}
        </Badge>
      </div>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
    </CardContent>

    <CardFooter v-if="plan === 'free'">
      <Button class="w-full" :disabled="loading" @click="buy">
        {{ loading ? 'Redirecionando...' : `Assinar Pro · R$ ${price.toFixed(2)}` }}
      </Button>
    </CardFooter>
  </Card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api.ts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

const route = useRoute();
const status = route.query.status;
const plan = ref('free');
const price = ref(0);
const loading = ref(false);
const error = ref('');

onMounted(async () => {
  try {
    const plans = await api('/billing/plans');
    price.value = plans.pro.price;
    const me = await api('/auth/me');
    plan.value = me.plan;
  } catch (e) {
    error.value = e.message;
  }
});

async function buy() {
  error.value = '';
  loading.value = true;
  try {
    const { init_point } = await api('/billing/checkout', { method: 'POST', body: { plan: 'pro' } });
    window.location.href = init_point;
  } catch (e) {
    error.value = e.message;
    loading.value = false;
  }
}
</script>