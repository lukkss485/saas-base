<template>
  <div class="mx-auto max-w-3xl space-y-6 pb-8">
    <Reveal>
      <header class="space-y-1">
        <div class="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <UserRound class="h-3.5 w-3.5" aria-hidden="true" />
          Minha conta
        </div>
        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Perfil</h1>
        <p class="mt-1 text-sm text-muted-foreground sm:text-base">
          Seus dados pessoais, o uso do plano e a segurança da conta.
        </p>
      </header>
    </Reveal>

    <!-- Cartão de identidade -->
    <Reveal :delay="40">
      <Card class="gap-0 overflow-hidden rounded-3xl border-border/60 py-0 shadow-sm">
        <!-- Capa: gradiente colorido que desvanece na cor do card -->
        <div class="relative h-28 overflow-hidden rounded-t-3xl bg-gradient-to-br from-sky-400/35 via-violet-400/25 to-rose-300/30 dark:from-sky-500/25 dark:via-violet-500/20 dark:to-rose-400/20 sm:h-32" aria-hidden="true">
          <div class="absolute -left-10 -top-12 h-40 w-40 rounded-full bg-sky-300/40 blur-3xl dark:bg-sky-500/20" />
          <div class="absolute -right-8 top-2 h-36 w-36 rounded-full bg-rose-300/40 blur-3xl dark:bg-rose-500/15" />
          <div class="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
        </div>

        <CardContent class="-mt-10 space-y-4 p-4 pb-5 sm:p-6 sm:pb-6 sm:pt-0">
          <div v-if="meLoading" class="flex items-center gap-4">
            <Skeleton class="h-20 w-20 rounded-full" />
            <div class="space-y-2">
              <Skeleton class="h-5 w-40 rounded-xl" />
              <Skeleton class="h-4 w-56 rounded-xl" />
            </div>
          </div>

          <div v-else class="flex flex-wrap items-end gap-4">
            <div class="relative shrink-0">
              <img
                v-if="showAvatar"
                :key="avatarDisplaySrc"
                :src="avatarDisplaySrc"
                alt="Foto de perfil"
                class="h-20 w-20 rounded-full border border-border/60 object-cover shadow-sm ring-4 ring-card"
                @error="avatarFailed = true"
              />
              <div
                v-else
                class="grid h-20 w-20 place-items-center rounded-full border border-border/60 bg-muted text-2xl font-semibold ring-4 ring-card"
                aria-label="Iniciais do perfil"
              >
                {{ initials }}
              </div>
              <button
                type="button"
                class="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Escolher foto"
                :disabled="uploading"
                @click="fileRef?.click()"
              >
                <Camera class="h-3.5 w-3.5" />
              </button>
            </div>

            <div class="min-w-0 flex-1 space-y-1 pb-1 z-10">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate text-lg font-semibold">{{ displayName }}</p>
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="isPro ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'"
                >
                  <Sparkles v-if="isPro" class="h-3 w-3" aria-hidden="true" />
                  {{ isPro ? 'Plano Pro' : 'Plano Free' }}
                </span>
              </div>
              <p class="truncate text-sm text-muted-foreground">{{ me?.email }}</p>
              <p v-if="memberSince" class="text-xs text-muted-foreground">Membro desde {{ memberSince }}</p>
            </div>
          </div>

          <input ref="fileRef" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onFile" />

          <div v-if="avatarDraft" class="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-3" role="status">
            <p class="inline-flex flex-1 items-center gap-1.5 text-xs font-medium text-primary">
              <ImagePlus class="h-3.5 w-3.5" /> Prévia pronta. A foto ainda não foi salva.
            </p>
            <Button size="sm" class="rounded-2xl" :disabled="uploading" @click="uploadAvatar">
              <Upload class="mr-2 h-4 w-4" /> {{ uploading ? 'Enviando...' : 'Salvar foto' }}
            </Button>
            <Button size="sm" variant="outline" class="rounded-2xl" :disabled="uploading" @click="editCurrentPhoto">
              <Pencil class="mr-2 h-4 w-4" /> Editar
            </Button>
            <Button size="sm" variant="ghost" class="rounded-2xl" :disabled="uploading" @click="cancelAvatarDraft">
              <X class="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </div>
          <div v-else-if="me?.avatar" class="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" class="rounded-2xl" :disabled="uploading" @click="editCurrentPhoto">
              <Pencil class="mr-2 h-4 w-4" /> Editar foto
            </Button>
            <Button variant="ghost" size="sm" class="rounded-2xl text-muted-foreground hover:text-destructive" :disabled="uploading" @click="removeAvatarOpen = true">
              Remover foto
            </Button>
          </div>
        </CardContent>
      </Card>
    </Reveal>

    <!-- Estatísticas calculadas com as tarefas que a conta já tem -->
    <Reveal :delay="70">
      <section class="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Resumo das suas tarefas">
        <Card v-for="stat in stats" :key="stat.label" class="gap-0 rounded-3xl border-border/60 py-0 shadow-sm">
          <CardContent class="space-y-1 p-4">
            <div class="flex items-center justify-between">
              <p class="text-xs text-muted-foreground">{{ stat.label }}</p>
              <span class="grid h-7 w-7 place-items-center rounded-xl" :class="stat.tone">
                <component :is="stat.icon" class="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
            <Skeleton v-if="tasksLoading" class="h-7 w-12 rounded-xl" />
            <p v-else class="text-2xl font-semibold tabular-nums">{{ stat.value }}</p>
          </CardContent>
        </Card>
      </section>
    </Reveal>

    <!-- Plano e uso do limite -->
    <Reveal :delay="90">
      <Card class="gap-0 overflow-hidden rounded-3xl border-border/60 py-0 shadow-sm">
        <CardHeader class="gap-1 px-4 pt-5 sm:px-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <CardTitle class="text-base">Seu plano</CardTitle>
              <CardDescription>
                {{ isPro ? 'Tarefas ilimitadas e todos os recursos.' : 'O plano Free tem limite de tarefas.' }}
              </CardDescription>
            </div>
            <Button as-child variant="outline" size="sm" class="shrink-0 rounded-2xl">
              <RouterLink to="/billing">{{ isPro ? 'Gerenciar' : 'Assinar Pro' }}</RouterLink>
            </Button>
          </div>
        </CardHeader>
        <CardContent class="space-y-3 p-4 pt-3 sm:p-6 sm:pt-3">
          <template v-if="limit">
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">Tarefas usadas</span>
              <span class="font-medium tabular-nums">{{ tasks.length }} de {{ limit }}</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" :aria-valuenow="limitUsage" aria-valuemin="0" aria-valuemax="100" aria-label="Uso do limite de tarefas">
              <div class="h-full rounded-full transition-[width] duration-500 ease-out" :class="limitUsage >= 90 ? 'bg-destructive' : limitUsage >= 70 ? 'bg-amber-500' : 'bg-primary'" :style="{ width: `${limitUsage}%` }" />
            </div>
            <p v-if="limitUsage >= 100" class="text-xs text-destructive">Você atingiu o limite do plano Free.</p>
          </template>
          <p v-else class="text-sm text-muted-foreground">Sem limite de tarefas no seu plano.</p>
          <p v-if="planExpires" class="text-xs text-muted-foreground">Válido até {{ planExpires }}</p>
        </CardContent>
      </Card>
    </Reveal>

    <!-- Dados pessoais -->
    <Reveal :delay="110">
      <Card class="gap-0 overflow-hidden rounded-3xl border-border/60 py-0 shadow-sm transition-shadow duration-300 hover:shadow-md">
        <CardHeader class="gap-1 px-4 pt-5 sm:px-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <CardTitle class="text-base">Dados pessoais</CardTitle>
              <CardDescription>Atualize como você aparece no NT-life.</CardDescription>
            </div>
            <span class="shrink-0 text-sm font-semibold tabular-nums" :aria-label="`Perfil ${profileProgress}% completo`">{{ profileProgress }}%</span>
          </div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" :aria-valuenow="profileProgress" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso do perfil">
            <div class="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" :style="{ width: `${profileProgress}%` }" />
          </div>
          <div class="mt-2 grid gap-2 sm:grid-cols-3">
            <div v-for="item in checklist" :key="item.label" class="flex items-center gap-2 text-xs">
              <CheckCircle2 v-if="item.done" class="h-4 w-4 shrink-0 text-emerald-600" />
              <Circle v-else class="h-4 w-4 shrink-0 text-muted-foreground/50" />
              <span :class="item.done ? 'text-foreground' : 'text-muted-foreground'">{{ item.label }}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent class="p-4 pt-4 sm:p-6 sm:pt-4">
          <form class="grid gap-4 sm:max-w-xl" @submit.prevent="saveName">
            <div class="grid gap-2">
              <Label for="pf-name">Nome de exibição</Label>
              <Input id="pf-name" v-model="name" maxlength="80" autocomplete="name" placeholder="Seu nome" class="h-11 rounded-2xl" />
              <p class="text-xs text-muted-foreground">{{ name.trim().length }}/80 caracteres</p>
            </div>

            <div class="grid gap-2">
              <Label for="pf-email">E-mail da conta</Label>
              <div class="flex min-w-0 gap-2">
                <Input id="pf-email" :model-value="me?.email ?? ''" disabled class="h-11 min-w-0 flex-1 rounded-2xl" />
                <Button type="button" variant="outline" size="icon" class="h-11 w-11 shrink-0 rounded-2xl" :disabled="!me?.email" aria-label="Copiar e-mail" title="Copiar e-mail" @click="copyEmail">
                  <Check v-if="emailCopied" class="h-4 w-4 text-emerald-600" />
                  <Copy v-else class="h-4 w-4" />
                </Button>
              </div>
              <p class="text-xs text-muted-foreground">O e-mail é somente leitura nesta tela.</p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <Button type="submit" class="rounded-2xl" :disabled="!nameChanged || !hasName || saving">
                <LoaderCircle v-if="saving" class="mr-2 h-4 w-4 animate-spin" />
                {{ saving ? 'Salvando...' : 'Salvar alterações' }}
              </Button>
              <Button v-if="nameChanged" type="button" variant="ghost" class="rounded-2xl" :disabled="saving" @click="resetName">
                Descartar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Reveal>

    <!-- Senha -->
    <Reveal :delay="130">
      <Card class="gap-0 overflow-hidden rounded-3xl border-border/60 py-0 shadow-sm transition-shadow duration-300 hover:shadow-md">
        <CardHeader class="gap-1 px-4 pt-5 sm:px-6">
          <div class="flex items-center gap-2">
            <span class="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck class="h-4 w-4" /></span>
            <div>
              <CardTitle class="text-base">Alterar senha</CardTitle>
              <CardDescription>Escolha uma senha exclusiva e difícil de adivinhar.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent class="p-4 pt-4 sm:p-6 sm:pt-4">
          <form class="grid gap-4 sm:max-w-xl" @submit.prevent="submitPassword">
            <div class="grid gap-2">
              <Label for="pw-current">Senha atual</Label>
              <div class="relative">
                <Input id="pw-current" v-model="pw.current" :type="passwordVisible.current ? 'text' : 'password'" autocomplete="current-password" class="h-11 rounded-2xl pr-12" required />
                <Button type="button" variant="ghost" size="icon" class="absolute right-1 top-1 h-9 w-9 rounded-xl" :aria-label="passwordVisible.current ? 'Ocultar senha atual' : 'Mostrar senha atual'" @click="passwordVisible.current = !passwordVisible.current">
                  <EyeOff v-if="passwordVisible.current" class="h-4 w-4" />
                  <Eye v-else class="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-2">
                <Label for="pw-next">Nova senha</Label>
                <span v-if="pw.next" class="text-xs font-medium" :class="passwordStrength.tone">{{ passwordStrength.label }}</span>
              </div>
              <div class="relative">
                <Input id="pw-next" v-model="pw.next" :type="passwordVisible.next ? 'text' : 'password'" autocomplete="new-password" minlength="6" class="h-11 rounded-2xl pr-12" required />
                <Button type="button" variant="ghost" size="icon" class="absolute right-1 top-1 h-9 w-9 rounded-xl" :aria-label="passwordVisible.next ? 'Ocultar nova senha' : 'Mostrar nova senha'" @click="passwordVisible.next = !passwordVisible.next">
                  <EyeOff v-if="passwordVisible.next" class="h-4 w-4" />
                  <Eye v-else class="h-4 w-4" />
                </Button>
              </div>
              <div class="grid grid-cols-4 gap-1.5" aria-hidden="true">
                <span v-for="level in 4" :key="level" class="h-1.5 rounded-full transition-colors duration-300" :class="level <= passwordStrength.score ? passwordStrength.bar : 'bg-muted'" />
              </div>
              <ul class="grid gap-1 pt-1 text-xs sm:grid-cols-2" aria-label="Requisitos da senha">
                <li v-for="rule in passwordRules" :key="rule.label" class="flex items-center gap-1.5" :class="rule.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'">
                  <CheckCircle2 v-if="rule.ok" class="h-3.5 w-3.5 shrink-0" />
                  <Circle v-else class="h-3.5 w-3.5 shrink-0 opacity-50" />
                  {{ rule.label }}
                </li>
              </ul>
            </div>

            <div class="grid gap-2">
              <Label for="pw-confirm">Confirme a nova senha</Label>
              <div class="relative">
                <Input id="pw-confirm" v-model="pw.confirm" :type="passwordVisible.confirm ? 'text' : 'password'" autocomplete="new-password" class="h-11 rounded-2xl pr-12" :aria-invalid="Boolean(passwordMismatch)" required />
                <Button type="button" variant="ghost" size="icon" class="absolute right-1 top-1 h-9 w-9 rounded-xl" :aria-label="passwordVisible.confirm ? 'Ocultar confirmação' : 'Mostrar confirmação'" @click="passwordVisible.confirm = !passwordVisible.confirm">
                  <EyeOff v-if="passwordVisible.confirm" class="h-4 w-4" />
                  <Eye v-else class="h-4 w-4" />
                </Button>
              </div>
              <p v-if="passwordMismatch" class="text-xs text-destructive" role="alert">As senhas ainda não coincidem.</p>
              <p v-else-if="pw.confirm && pw.next === pw.confirm" class="inline-flex items-center gap-1 text-xs text-emerald-600" role="status">
                <CheckCircle2 class="h-3.5 w-3.5" /> As senhas coincidem.
              </p>
            </div>

            <p v-if="pwError" class="rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{{ pwError }}</p>

            <div class="flex flex-wrap items-center gap-2">
              <Button type="submit" class="rounded-2xl" :disabled="!passwordFormValid || changing">
                <LoaderCircle v-if="changing" class="mr-2 h-4 w-4 animate-spin" />
                <LockKeyhole v-else class="mr-2 h-4 w-4" />
                {{ changing ? 'Alterando...' : 'Alterar senha' }}
              </Button>
              <Button type="button" variant="ghost" class="rounded-2xl" :disabled="changing || (!pw.current && !pw.next && !pw.confirm)" @click="clearPasswordForm">
                Limpar campos
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Reveal>

    <Reveal :delay="150">
      <Card class="gap-0 rounded-3xl border-border/60 bg-muted/20 py-0 shadow-none">
        <CardContent class="flex items-start gap-3 p-4 sm:p-5">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-background text-primary ring-1 ring-border/60"><ShieldCheck class="h-4 w-4" /></span>
          <div class="space-y-1">
            <p class="text-sm font-semibold">Dicas para manter sua conta segura</p>
            <ul class="list-inside list-disc space-y-1 text-sm leading-6 text-muted-foreground">
              <li>Não compartilhe sua senha ou códigos de verificação.</li>
              <li>Use uma senha exclusiva e atualize-a se suspeitar de acesso indevido.</li>
              <li>Prefira dispositivos pessoais e bloqueie a tela quando sair.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </Reveal>

    <!-- Editor de foto -->
    <Dialog v-model:open="editorOpen">
      <DialogContent class="max-h-[92vh] gap-4 overflow-y-auto rounded-3xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar foto</DialogTitle>
          <DialogDescription>Arraste para enquadrar, use o zoom e escolha um estilo. O círculo mostra como ela vai aparecer.</DialogDescription>
        </DialogHeader>

        <div class="mx-auto w-full max-w-[20rem]">
          <div
            class="relative aspect-square cursor-grab touch-none select-none overflow-hidden rounded-3xl bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
            tabindex="0"
            role="application"
            aria-label="Área de enquadramento da foto. Use as setas para mover e + ou - para o zoom."
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
            @wheel.prevent="onWheel"
            @keydown="onFrameKeydown"
          >
            <canvas ref="previewRef" class="h-full w-full" />
            <div class="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(0,0,0,0.55)]" />
            <div class="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/70" />
          </div>
        </div>

        <!-- Zoom, girar e espelhar -->
        <div class="flex items-center gap-2">
          <ZoomOut class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            v-model.number="zoom"
            type="range"
            min="1"
            max="3"
            step="0.01"
            class="h-2 min-w-0 flex-1 cursor-pointer rounded-full accent-primary"
            aria-label="Zoom"
          />
          <ZoomIn class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div class="ml-1 flex shrink-0 gap-1">
            <Button type="button" variant="outline" size="icon" class="h-9 w-9 rounded-2xl" aria-label="Girar para a esquerda" title="Girar para a esquerda" @click="rotateLeft">
              <RotateCcw class="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" class="h-9 w-9 rounded-2xl" aria-label="Girar para a direita" title="Girar para a direita" @click="rotateRight">
              <RotateCw class="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" class="h-9 w-9 rounded-2xl" :class="flipped ? 'bg-muted' : ''" :aria-pressed="flipped" aria-label="Espelhar" title="Espelhar" @click="flipped = !flipped">
              <FlipHorizontal2 class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p v-if="!canFilter" class="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300" role="status">
          Este navegador não suporta filtros de imagem no editor. Você ainda pode enquadrar, girar e espelhar a foto.
        </p>

        <template v-else>
          <!-- Estilos -->
          <div class="space-y-2">
            <p class="text-sm font-medium">Estilo</p>
            <div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Estilo da foto">
              <button
                v-for="preset in PRESETS"
                :key="preset.id"
                type="button"
                role="radio"
                :aria-checked="presetId === preset.id"
                class="group flex shrink-0 flex-col items-center gap-1.5 rounded-2xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                @click="presetId = preset.id"
              >
                <span
                  class="block h-14 w-14 overflow-hidden rounded-2xl ring-2 transition-all"
                  :class="presetId === preset.id ? 'ring-primary' : 'ring-transparent group-hover:ring-border'"
                >
                  <img :src="thumbUrl" alt="" class="h-full w-full object-cover" :style="{ filter: preset.filter || 'none' }" />
                </span>
                <span class="text-[11px]" :class="presetId === preset.id ? 'font-medium text-foreground' : 'text-muted-foreground'">{{ preset.label }}</span>
              </button>
            </div>
          </div>

          <!-- Ajustes finos -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium">Ajustes</p>
              <Button type="button" variant="ghost" size="sm" class="h-8 rounded-2xl px-3 text-xs" @click="autoEnhance">
                <Sparkles class="mr-1.5 h-3.5 w-3.5" /> Ajuste automático
              </Button>
            </div>
            <div v-for="item in ADJUSTMENTS" :key="item.key" class="grid grid-cols-[5.5rem_minmax(0,1fr)_2.5rem] items-center gap-3">
              <label :for="`adj-${item.key}`" class="text-xs text-muted-foreground">{{ item.label }}</label>
              <input
                :id="`adj-${item.key}`"
                v-model.number="adj[item.key]"
                type="range"
                min="60"
                max="140"
                step="1"
                class="h-2 w-full cursor-pointer rounded-full accent-primary"
              />
              <span class="text-right text-xs tabular-nums text-muted-foreground">{{ adjLabel(adj[item.key]) }}</span>
            </div>
          </div>
        </template>

        <DialogFooter class="gap-2 sm:justify-between sm:gap-2">
          <Button type="button" variant="ghost" class="rounded-2xl" @click="resetEditor">
            <Undo2 class="mr-2 h-4 w-4" /> Redefinir
          </Button>
          <div class="flex gap-2">
            <Button type="button" variant="outline" class="rounded-2xl" @click="editorOpen = false">Cancelar</Button>
            <Button type="button" class="rounded-2xl" :disabled="!source" @click="applyEditor">
              <Check class="mr-2 h-4 w-4" /> Aplicar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      v-model:open="removeAvatarOpen"
      title="Remover foto de perfil?"
      description="Sua foto será removida da conta e as iniciais voltarão a aparecer."
      confirm-label="Remover foto"
      destructive
      @confirm="confirmRemoveAvatar"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch, watchEffect } from 'vue';
import { onBeforeRouteLeave, RouterLink } from 'vue-router';
import { useEventListener } from '@vueuse/core';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import Reveal from '@/components/motion/Reveal.vue';
import ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue';
import { useMe, useTasks } from '@/queries/tasks';
import { useProfileActions } from '@/queries/extra';
import {
  Camera,
  Check,
  CheckCircle2,
  Circle,
  CircleAlert,
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  FlipHorizontal2,
  ImagePlus,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  Pencil,
  Percent,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Undo2,
  Upload,
  UserRound,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-vue-next';

function errMsg(error: unknown): string {
  return error instanceof Error ? error.message : 'Algo deu errado. Tente novamente.';
}

const { data: me, isPending: meLoading } = useMe();
const { data: tasksData, isPending: tasksLoading } = useTasks();
const { saveProfile, changePassword } = useProfileActions();

/* ---------- Identificação ---------- */
const name = ref('');
const nameInitialized = ref(false);
const nameChanged = computed(() => name.value.trim() !== (me.value?.name ?? '').trim());
watch(me, (value) => {
  if (!value) return;
  if (!nameInitialized.value || !nameChanged.value) name.value = value.name ?? '';
  nameInitialized.value = true;
}, { immediate: true });

const hasName = computed(() => Boolean(name.value.trim()));
const hasEmail = computed(() => Boolean(me.value?.email?.trim()));
const hasAvatar = computed(() => Boolean(avatarDraft.value || me.value?.avatar));
const checklist = computed(() => [
  { label: 'Nome preenchido', done: hasName.value },
  { label: 'E-mail cadastrado', done: hasEmail.value },
  { label: 'Foto adicionada', done: hasAvatar.value },
]);
const profileProgress = computed(() => Math.round((checklist.value.filter((item) => item.done).length / checklist.value.length) * 100));
const saving = computed(() => saveProfile.isPending.value);

const displayName = computed(() => me.value?.name?.trim() || me.value?.email?.split('@')[0] || 'Seu perfil');
const initials = computed(() => {
  const base = me.value?.name || me.value?.email || '';
  const letters = base.split(/[\s@]/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return letters || '?';
});

/* ---------- Plano e datas (campos opcionais: só aparecem se a API os enviar) ---------- */
const isPro = computed(() => me.value?.plan === 'pro');
const extra = computed(() => (me.value ?? {}) as { created_at?: string | null; plan_expires_at?: string | null });
const formatLong = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
};
const memberSince = computed(() => formatLong(extra.value.created_at));
const planExpires = computed(() => (isPro.value ? formatLong(extra.value.plan_expires_at) : ''));

/* ---------- Estatísticas ---------- */
const tasks = computed(() => tasksData.value?.tasks ?? []);
const limit = computed<number | null>(() => (tasksData.value?.limit as number | null | undefined) ?? null);
const limitUsage = computed(() => (limit.value ? Math.min(100, Math.round((tasks.value.length / limit.value) * 100)) : 0));

const todayKey = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const stats = computed(() => {
  const list = tasks.value;
  const done = list.filter((task) => task.done).length;
  const overdue = list.filter((task) => !task.done && task.due_date && task.due_date.slice(0, 10) < todayKey).length;
  const rate = list.length ? Math.round((done / list.length) * 100) : 0;
  return [
    { label: 'Tarefas', value: list.length, icon: ClipboardList, tone: 'bg-primary/10 text-primary' },
    { label: 'Concluídas', value: done, icon: ListChecks, tone: 'bg-emerald-500/10 text-emerald-600' },
    { label: 'Atrasadas', value: overdue, icon: CircleAlert, tone: 'bg-rose-500/10 text-rose-500' },
    { label: 'Conclusão', value: `${rate}%`, icon: Percent, tone: 'bg-amber-500/10 text-amber-600' },
  ];
});

/* ---------- Salvar nome ---------- */
async function saveName(): Promise<void> {
  const nextName = name.value.trim();
  if (!nextName || !nameChanged.value || saving.value) return;
  try {
    await saveProfile.mutateAsync({ name: nextName });
    toast.success('Perfil atualizado');
  } catch (error) {
    toast.error(errMsg(error));
  }
}

function resetName(): void {
  name.value = me.value?.name ?? '';
}

const emailCopied = ref(false);
async function copyEmail(): Promise<void> {
  const email = me.value?.email;
  if (!email) return;
  try {
    await navigator.clipboard.writeText(email);
    emailCopied.value = true;
    toast.success('E-mail copiado');
  } catch {
    toast.error('Não foi possível copiar. Verifique a permissão da área de transferência.');
  }
}

/* ---------- Foto: a prévia só vai ao servidor ao clicar em "Salvar foto" ---------- */
const fileRef = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const avatarDraft = ref<string | null>(null);
const avatarFailed = ref(false);
const removeAvatarOpen = ref(false);
const avatarDisplaySrc = computed(() => avatarDraft.value ?? me.value?.avatar ?? '');
const showAvatar = computed(() => Boolean(avatarDisplaySrc.value) && !avatarFailed.value);
watch(avatarDisplaySrc, () => { avatarFailed.value = false; });

async function onFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    toast.error('Formato não suportado. Escolha JPG, PNG ou WebP.');
    input.value = '';
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.error('Imagem muito grande. O tamanho máximo é 10 MB.');
    input.value = '';
    return;
  }
  if (file.size === 0) {
    toast.error('O arquivo está vazio. Escolha outra imagem.');
    input.value = '';
    return;
  }

  const url = URL.createObjectURL(file);
  try {
    await openEditor(url);
  } finally {
    URL.revokeObjectURL(url);
    input.value = '';
  }
}

function cancelAvatarDraft(): void {
  avatarDraft.value = null;
  if (fileRef.value) fileRef.value.value = '';
}

async function uploadAvatar(): Promise<void> {
  if (!avatarDraft.value || uploading.value) return;
  uploading.value = true;
  try {
    await saveProfile.mutateAsync({ avatar: avatarDraft.value });
    avatarDraft.value = null;
    toast.success('Foto de perfil atualizada');
  } catch (error) {
    toast.error(errMsg(error));
  } finally {
    uploading.value = false;
  }
}

async function confirmRemoveAvatar(): Promise<void> {
  if (uploading.value) return;
  uploading.value = true;
  try {
    await saveProfile.mutateAsync({ avatar: null });
    avatarDraft.value = null;
    removeAvatarOpen.value = false;
    toast.success('Foto removida');
  } catch (error) {
    toast.error(errMsg(error));
  } finally {
    uploading.value = false;
  }
}

/* ---------- Editor de foto ---------- */
const PREVIEW_SIZE = 400; // resolução interna da prévia
const OUTPUT_SIZE = 256; // tamanho salvo (leve para o banco)
const MAX_SOURCE = 1600; // a imagem original é reduzida uma vez, para a prévia ficar fluida

type Preset = { id: string; label: string; filter: string };
const PRESETS: Preset[] = [
  { id: 'original', label: 'Original', filter: '' },
  { id: 'vivid', label: 'Vívido', filter: 'saturate(1.35) contrast(1.08)' },
  { id: 'warm', label: 'Quente', filter: 'sepia(0.25) saturate(1.2) hue-rotate(-8deg)' },
  { id: 'cool', label: 'Frio', filter: 'saturate(1.1) hue-rotate(12deg) brightness(1.03)' },
  { id: 'bw', label: 'P&B', filter: 'grayscale(1) contrast(1.1)' },
  { id: 'soft', label: 'Suave', filter: 'contrast(0.92) brightness(1.06) saturate(0.9)' },
  { id: 'vintage', label: 'Vintage', filter: 'sepia(0.45) contrast(0.95) saturate(1.1)' },
];

type AdjKey = 'brightness' | 'contrast' | 'saturation';
const ADJUSTMENTS: { key: AdjKey; label: string }[] = [
  { key: 'brightness', label: 'Brilho' },
  { key: 'contrast', label: 'Contraste' },
  { key: 'saturation', label: 'Saturação' },
];

// Navegadores sem ctx.filter (ex.: Safari antigo) ainda enquadram, giram e espelham
const canFilter =
  typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;

const editorOpen = ref(false);
const previewRef = ref<HTMLCanvasElement | null>(null);
const source = shallowRef<HTMLCanvasElement | null>(null);
const thumbUrl = ref('');

const zoom = ref(1);
const offX = ref(0);
const offY = ref(0);
const rotation = ref(0); // 0, 90, 180 ou 270
const flipped = ref(false);
const presetId = ref('original');
const adj = reactive<Record<AdjKey, number>>({ brightness: 100, contrast: 100, saturation: 100 });

const adjLabel = (value: number) => (value === 100 ? '0' : value > 100 ? `+${value - 100}` : String(value - 100));

const filterString = computed(() => {
  const preset = PRESETS.find((item) => item.id === presetId.value)?.filter ?? '';
  return `${preset} brightness(${adj.brightness / 100}) contrast(${adj.contrast / 100}) saturate(${adj.saturation / 100})`.trim();
});

// Quanto a imagem pode se mover sem deixar bordas vazias dentro do quadro
const maxOffset = computed(() => {
  const s = source.value;
  if (!s) return { x: 0, y: 0 };
  const odd = rotation.value % 180 !== 0;
  const rw = odd ? s.height : s.width;
  const rh = odd ? s.width : s.height;
  const base = zoom.value / Math.min(rw, rh);
  return { x: Math.max(0, (rw * base - 1) / 2), y: Math.max(0, (rh * base - 1) / 2) };
});

function setOffsets(x: number, y: number): void {
  offX.value = Math.min(maxOffset.value.x, Math.max(-maxOffset.value.x, x));
  offY.value = Math.min(maxOffset.value.y, Math.max(-maxOffset.value.y, y));
}

watch([zoom, rotation], () => setOffsets(offX.value, offY.value));

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível ler a imagem. Escolha um JPG, PNG ou WebP válido.'));
    image.src = src;
  });
}

async function openEditor(src: string): Promise<void> {
  try {
    const image = await loadImage(src);
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('A imagem não contém dimensões válidas.');

    // Reduz uma vez para a prévia ficar fluida mesmo com fotos grandes
    const ratio = Math.min(1, MAX_SOURCE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas indisponível neste navegador.');
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Miniatura quadrada (recorte central) usada nos estilos
    const thumb = document.createElement('canvas');
    thumb.width = 112;
    thumb.height = 112;
    const thumbContext = thumb.getContext('2d');
    if (thumbContext) {
      const side = Math.min(canvas.width, canvas.height);
      thumbContext.drawImage(canvas, (canvas.width - side) / 2, (canvas.height - side) / 2, side, side, 0, 0, 112, 112);
      thumbUrl.value = thumb.toDataURL('image/jpeg', 0.8);
    }

    resetEditor();
    source.value = canvas;
    editorOpen.value = true;
  } catch (error) {
    toast.error(errMsg(error));
  }
}

function editCurrentPhoto(): void {
  if (avatarDisplaySrc.value) void openEditor(avatarDisplaySrc.value);
}

function resetEditor(): void {
  zoom.value = 1;
  offX.value = 0;
  offY.value = 0;
  rotation.value = 0;
  flipped.value = false;
  presetId.value = 'original';
  Object.assign(adj, { brightness: 100, contrast: 100, saturation: 100 });
}

function autoEnhance(): void {
  presetId.value = 'original';
  Object.assign(adj, { brightness: 104, contrast: 110, saturation: 112 });
}

const rotateRight = () => { rotation.value = (rotation.value + 90) % 360; };
const rotateLeft = () => { rotation.value = (rotation.value + 270) % 360; };

// A mesma função desenha a prévia e o arquivo final, então o resultado é idêntico ao que se vê
function draw(canvas: HTMLCanvasElement, size: number): void {
  const s = source.value;
  const ctx = canvas.getContext('2d');
  if (!s || !ctx) return;
  if (canvas.width !== size) {
    canvas.width = size;
    canvas.height = size;
  }

  const odd = rotation.value % 180 !== 0;
  const rw = odd ? s.height : s.width;
  const rh = odd ? s.width : s.height;
  const base = (zoom.value * size) / Math.min(rw, rh);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (canFilter) ctx.filter = 'none';
  ctx.fillStyle = '#f4f4f5';
  ctx.fillRect(0, 0, size, size);

  if (canFilter) ctx.filter = filterString.value;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(size / 2 + offX.value * size, size / 2 + offY.value * size);
  ctx.scale(flipped.value ? -1 : 1, 1);
  ctx.rotate((rotation.value * Math.PI) / 180);
  ctx.scale(base, base);
  ctx.drawImage(s, -s.width / 2, -s.height / 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// Redesenha a prévia sempre que qualquer controle mudar
watchEffect(() => {
  const canvas = previewRef.value;
  if (!canvas || !source.value) return;
  draw(canvas, PREVIEW_SIZE);
}, { flush: 'post' });

/* Arrastar, roda do mouse e teclado */
let drag: { x: number; y: number; ox: number; oy: number } | null = null;

function onPointerDown(event: PointerEvent): void {
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  drag = { x: event.clientX, y: event.clientY, ox: offX.value, oy: offY.value };
}

function onPointerMove(event: PointerEvent): void {
  if (!drag) return;
  const size = (event.currentTarget as HTMLElement).clientWidth || 1;
  setOffsets(drag.ox + (event.clientX - drag.x) / size, drag.oy + (event.clientY - drag.y) / size);
}

function onPointerUp(): void {
  drag = null;
}

function onWheel(event: WheelEvent): void {
  zoom.value = Math.min(3, Math.max(1, Number((zoom.value - event.deltaY * 0.002).toFixed(3))));
}

function onFrameKeydown(event: KeyboardEvent): void {
  const step = 0.02;
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  };
  if (event.key in moves) {
    event.preventDefault();
    const [dx, dy] = moves[event.key];
    setOffsets(offX.value + dx, offY.value + dy);
  } else if (event.key === '+' || event.key === '=') {
    event.preventDefault();
    zoom.value = Math.min(3, Number((zoom.value + 0.1).toFixed(2)));
  } else if (event.key === '-') {
    event.preventDefault();
    zoom.value = Math.max(1, Number((zoom.value - 0.1).toFixed(2)));
  }
}

function applyEditor(): void {
  if (!source.value) return;
  try {
    const out = document.createElement('canvas');
    draw(out, OUTPUT_SIZE);
    avatarDraft.value = out.toDataURL('image/jpeg', 0.88);
    editorOpen.value = false;
    toast('Foto pronta. Confirme em "Salvar foto".');
  } catch {
    toast.error('Não foi possível exportar esta imagem. Tente escolher o arquivo novamente.');
  }
}

// Libera a imagem da memória quando o editor fecha
watch(editorOpen, (open) => {
  if (open) return;
  source.value = null;
  thumbUrl.value = '';
  drag = null;
});

/* ---------- Senha ---------- */
const pw = reactive({ current: '', next: '', confirm: '' });
const passwordVisible = reactive({ current: false, next: false, confirm: false });
const pwError = ref('');
const changing = ref(false);
const passwordMismatch = computed(() => Boolean(pw.confirm) && pw.next !== pw.confirm);

const passwordRules = computed(() => [
  { label: 'Pelo menos 6 caracteres', ok: pw.next.length >= 6 },
  { label: 'Pelo menos 10 caracteres (recomendado)', ok: pw.next.length >= 10 },
  { label: 'Letras maiúsculas e minúsculas', ok: /[a-z]/.test(pw.next) && /[A-Z]/.test(pw.next) },
  { label: 'Número ou símbolo', ok: /\d/.test(pw.next) || /[^A-Za-z0-9]/.test(pw.next) },
]);

const passwordSameAsCurrent = computed(() => Boolean(pw.next) && pw.next === pw.current);
const passwordFormValid = computed(
  () =>
    Boolean(pw.current) &&
    pw.next.length >= 6 &&
    Boolean(pw.confirm) &&
    pw.next === pw.confirm &&
    !passwordSameAsCurrent.value,
);

const passwordStrength = computed(() => {
  const score = pw.next ? passwordRules.value.filter((rule) => rule.ok).length : 0;
  if (!pw.next) return { score: 0, label: '', tone: 'text-muted-foreground', bar: 'bg-muted' };
  if (score <= 1) return { score, label: 'Fraca', tone: 'text-destructive', bar: 'bg-destructive' };
  if (score === 2) return { score, label: 'Razoável', tone: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' };
  if (score === 3) return { score, label: 'Boa', tone: 'text-primary', bar: 'bg-primary' };
  return { score, label: 'Forte', tone: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' };
});

watch(() => [pw.current, pw.next, pw.confirm], () => { pwError.value = ''; });

function clearPasswordForm(): void {
  Object.assign(pw, { current: '', next: '', confirm: '' });
  Object.assign(passwordVisible, { current: false, next: false, confirm: false });
  pwError.value = '';
}

async function submitPassword(): Promise<void> {
  pwError.value = '';
  if (!pw.current) {
    pwError.value = 'Informe sua senha atual.';
    return;
  }
  if (pw.next.length < 6) {
    pwError.value = 'A nova senha precisa ter pelo menos 6 caracteres.';
    return;
  }
  if (passwordSameAsCurrent.value) {
    pwError.value = 'A nova senha precisa ser diferente da atual.';
    return;
  }
  if (pw.next !== pw.confirm) {
    pwError.value = 'As senhas não coincidem.';
    return;
  }
  if (changing.value) return;

  changing.value = true;
  try {
    await changePassword.mutateAsync({ current: pw.current, next: pw.next });
    clearPasswordForm();
    toast.success('Senha alterada com sucesso');
  } catch (error) {
    pwError.value = errMsg(error);
  } finally {
    changing.value = false;
  }
}

/* ---------- Alterações não salvas ---------- */
const hasUnsavedChanges = computed(
  () => nameChanged.value || Boolean(avatarDraft.value) || Boolean(pw.current || pw.next || pw.confirm),
);

onBeforeRouteLeave(() => {
  if (!hasUnsavedChanges.value) return true;
  return window.confirm('Você tem alterações não salvas. Deseja sair mesmo assim?');
});

useEventListener(window, 'beforeunload', (event: BeforeUnloadEvent) => {
  if (!hasUnsavedChanges.value) return;
  event.preventDefault();
  event.returnValue = '';
});

/* ---------- Limpeza ---------- */
let copyResetTimer: number | undefined;
watch(emailCopied, (copied) => {
  if (copyResetTimer !== undefined) window.clearTimeout(copyResetTimer);
  if (copied) copyResetTimer = window.setTimeout(() => { emailCopied.value = false; }, 1600);
});
onBeforeUnmount(() => {
  if (copyResetTimer !== undefined) window.clearTimeout(copyResetTimer);
});
</script>