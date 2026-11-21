<script setup lang="ts">
import { ref } from 'vue';
import { GlassThreeSurface } from '../index';
import type { GlassThreeController, GlassThreeOutput } from '../types';
import demoBackground from './assets/demo-background.svg?url';

const output = ref<GlassThreeOutput | null>(null);
const lastError = ref('');

function handleReady(result: GlassThreeOutput, _controller: GlassThreeController) {
  output.value = result;
  lastError.value = '';
}

function handleError(error: Error) {
  lastError.value = error.message;
}
</script>

<template>
  <main class="demo">
    <GlassThreeSurface
      :background="demoBackground"
      tint="#b8e8ff"
      :tint-strength="0.13"
      :transmission="0.98"
      :thickness="0.5"
      :ior="1.46"
      :dispersion="0.16"
      :iridescence="0.12"
      :iridescence-ior="1.3"
      :roughness="0.08"
      :noise="0.1"
      :specular="0.9"
      :fresnel="0.7"
      :edge-light="0.42"
      @ready="handleReady"
      @error="handleError"
    >
      <section class="demo-card">
        <p class="eyebrow">THREE.JS · WEBGL</p>
        <h1>Liquid Glass</h1>
        <p>Physically based transmission with a shader-driven highlight layer.</p>
        <div class="demo-pill">Transmission enabled</div>
      </section>
    </GlassThreeSurface>

    <p v-if="lastError" class="error">Renderer error: {{ lastError }}</p>
    <p v-else-if="output" class="status">Renderer ready</p>
  </main>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 12px;
  width: min(620px, 100%);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.demo :deep(.glass-three-surface) {
  min-height: 290px;
  border-radius: 28px;
  box-shadow: 0 22px 70px rgb(0 0 0 / 25%);
}
.demo-card {
  display: grid;
  align-content: center;
  gap: 12px;
  min-height: 290px;
  padding: 38px;
  color: white;
  text-shadow: 0 1px 12px rgb(0 0 0 / 24%);
}
.eyebrow { margin: 0; font-size: 11px; letter-spacing: .18em; opacity: .72; }
h1 { margin: 0; font-size: clamp(30px, 6vw, 54px); letter-spacing: -.055em; }
.demo-card p { max-width: 380px; margin: 0; line-height: 1.55; }
.demo-pill { width: fit-content; margin-top: 8px; padding: 8px 13px; border: 1px solid rgb(255 255 255 / 34%); border-radius: 999px; background: rgb(255 255 255 / 12%); font-size: 12px; }
.status, .error { margin: 0; color: #64748b; font-size: 12px; }
.error { color: #dc2626; }
</style>
