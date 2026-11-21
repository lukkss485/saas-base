<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { createGlassThree } from './createGlassThree';
import type {
  GlassBackgroundSource,
  GlassThreeController,
  GlassThreeOutput,
  GlassThreeVisualOptions,
} from './types';

interface Props extends Partial<GlassThreeVisualOptions> {
  background: GlassBackgroundSource;
  maxPixelRatio?: number;
  transmissionResolutionScale?: number;
  animate?: boolean;
  powerPreference?: 'default' | 'low-power' | 'high-performance';
}

const props = withDefaults(defineProps<Props>(), {
  tint: '#ffffff',
  tintStrength: 0.08,
  transmission: 0.98,
  thickness: 0.42,
  ior: 1.46,
  dispersion: 0.12,
  iridescence: 0.08,
  iridescenceIOR: 1.3,
  roughness: 0.075,
  noise: 0.08,
  noiseScale: 1,
  specular: 0.78,
  fresnel: 0.62,
  edgeLight: 0.34,
  maxPixelRatio: 1.75,
  transmissionResolutionScale: 0.8,
  animate: false,
  powerPreference: 'default',
});

const emit = defineEmits<{
  ready: [output: GlassThreeOutput, controller: GlassThreeController];
  error: [error: Error];
}>();

const host = ref<HTMLElement | null>(null);
let controller: GlassThreeController | null = null;
let disposed = false;

function currentVisualOptions(): GlassThreeVisualOptions {
  return {
    tint: props.tint,
    tintStrength: props.tintStrength,
    transmission: props.transmission,
    thickness: props.thickness,
    ior: props.ior,
    dispersion: props.dispersion,
    iridescence: props.iridescence,
    iridescenceIOR: props.iridescenceIOR,
    roughness: props.roughness,
    noise: props.noise,
    noiseScale: props.noiseScale,
    specular: props.specular,
    fresnel: props.fresnel,
    edgeLight: props.edgeLight,
  };
}

onMounted(async () => {
  if (!host.value) return;

  try {
    const created = await createGlassThree(host.value, {
      background: props.background,
      ...currentVisualOptions(),
      maxPixelRatio: props.maxPixelRatio,
      transmissionResolutionScale: props.transmissionResolutionScale,
      animate: props.animate,
      powerPreference: props.powerPreference,
      onError: (error) => emit('error', error),
    });

    if (disposed) {
      created.dispose();
      return;
    }

    controller = created;
    emit('ready', created.output, created);
  } catch (cause) {
    emit('error', cause instanceof Error ? cause : new Error(String(cause)));
  }
});

watch(
  () => ({
    tint: props.tint,
    tintStrength: props.tintStrength,
    transmission: props.transmission,
    thickness: props.thickness,
    ior: props.ior,
    dispersion: props.dispersion,
    iridescence: props.iridescence,
    iridescenceIOR: props.iridescenceIOR,
    roughness: props.roughness,
    noise: props.noise,
    noiseScale: props.noiseScale,
    specular: props.specular,
    fresnel: props.fresnel,
    edgeLight: props.edgeLight,
  }),
  (next) => controller?.update(next),
);

watch(
  () => props.background,
  async (next) => {
    try {
      await controller?.setBackground(next);
    } catch (cause) {
      emit('error', cause instanceof Error ? cause : new Error(String(cause)));
    }
  },
);

onBeforeUnmount(() => {
  disposed = true;
  controller?.dispose();
  controller = null;
});
</script>

<template>
  <div ref="host" class="glass-three-surface">
    <div class="glass-three-surface__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.glass-three-surface {
  position: relative;
  isolation: isolate;
  width: 100%;
  min-height: 140px;
  overflow: hidden;
  border-radius: inherit;
}

.glass-three-surface__content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
}
</style>
