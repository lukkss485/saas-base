# Glass Three Plugin

A standalone Three.js renderer module for the existing `glass` UI kit. It is intentionally optional: it does **not** change the current `glass()` CSS-style API or force Three.js into every import of the core package.

## What it renders

- A rounded, textured backing surface.
- A `MeshPhysicalMaterial` glass volume with transmission, thickness, IOR, roughness, clearcoat, chromatic dispersion and subtle iridescence.
- A custom GLSL overlay for procedural grain/noise, Fresnel edge response, specular glints and edge lighting.
- A procedural `RoomEnvironment` converted to a PMREM environment map for reflections.

The renderer needs a background source (`string` URL, `THREE.Texture`, image, canvas or video). That source becomes a texture in the Three.js scene and is what the glass refracts. It does **not** automatically capture arbitrary HTML/DOM behind the component. For a live DOM backdrop, the consuming app must provide an updated canvas/texture snapshot or a separately built capture pipeline.

The supplied `examples/assets/demo-background.svg` is only a sample background texture. It is not the user's previously mentioned prepared Liquid Glass SVG; that asset was not present in the inspected `saas-base-share.zip`.

## Install into this project

Copy the `plugins/three` folder from this package into:

`client/src/components/ui_kit/glass/plugins/three`

Then, from the `client` folder:

```bash
pnpm add three@0.187.0
pnpm add -D @types/three@0.187.0
```

Three.js `0.187.0` is the runtime version used by this package. The matching `@types/three@0.187.0` package is also required because the runtime package does not bundle TypeScript declarations. The official WebGL renderer requires WebGL 2 (WebGL 1 support was removed in r163), so the runtime must have a working WebGL 2 implementation and driver.

No change to `glass/src/glass.ts` or `glass/index.ts` is required. Import this optional plugin directly:

```ts
import { createGlassThree, GlassThreeSurface } from '@/components/ui_kit/glass/plugins/three'
```

## Vue component

```vue
<script setup lang="ts">
import { GlassThreeSurface } from '@/components/ui_kit/glass/plugins/three'
import background from './assets/panel-background.jpg'
import type { GlassThreeController, GlassThreeOutput } from '@/components/ui_kit/glass/plugins/three'

function onGlassReady(output: GlassThreeOutput, controller: GlassThreeController) {
  // Output references are available for inspection; controller exposes update/render/dispose.
  console.log(output.renderer, output.material, output.uniforms)
  controller.update({ noise: 0.1 })
}
</script>

<template>
  <GlassThreeSurface
    :background="background"
    tint="#d8f2ff"
    :tint-strength="0.12"
    :transmission="0.98"
    :thickness="0.42"
    :ior="1.46"
    :dispersion="0.12"
    :iridescence="0.08"
    :iridescence-ior="1.3"
    :roughness="0.075"
    :noise="0.08"
    :specular="0.78"
    :fresnel="0.62"
    :edge-light="0.34"
    @ready="onGlassReady"
    @error="(error) => console.error(error)"
    style="height: 240px; border-radius: 24px"
  >
    <div class="p-6 text-white">Your content</div>
  </GlassThreeSurface>
</template>
```

Set a height on the component or its parent. The slot is rendered above the canvas. The canvas itself does not intercept pointer events.

## Programmatic API

```ts
import { createGlassThree } from '@/components/ui_kit/glass/plugins/three'

const controller = await createGlassThree(hostElement, {
  background: backgroundImageUrl,
  transmission: 0.98,
  ior: 1.46,
  thickness: 0.42,
  dispersion: 0.12,
  iridescence: 0.08,
  iridescenceIOR: 1.3,
  roughness: 0.075,
  transmissionResolutionScale: 0.8,
  tint: '#ffffff',
  tintStrength: 0.08,
  noise: 0.08,
  noiseScale: 1,
  specular: 0.78,
  fresnel: 0.62,
  edgeLight: 0.34,
})

const output = controller.output
controller.update({ noise: 0.12, specular: 0.9 })
await controller.setBackground(nextImageUrl)
controller.render()
controller.dispose()
```

## Output variables

`controller.output` (also emitted by the Vue component as `@ready`) contains:

| Output | Type | Purpose |
|---|---|---|
| `canvas` | `HTMLCanvasElement` | Rendered WebGL layer |
| `renderer` | `WebGLRenderer` | Three.js renderer and GPU capabilities |
| `scene` | `Scene` | Complete Three.js scene |
| `camera` | `OrthographicCamera` | Surface camera |
| `backgroundMesh` | `Mesh` | Texture that acts as the refracted background |
| `glassMesh` | `Mesh` | Main transmissive glass volume |
| `material` | `MeshPhysicalMaterial` | PBR glass material controls |
| `overlayMesh` | `Mesh` | Procedural highlight/noise layer |
| `overlayMaterial` | `ShaderMaterial` | Custom GLSL material |
| `uniforms` | `GlassOverlayUniforms` | Live shader uniform values |
| `backgroundTexture` | `Texture` | Current plugin-owned texture clone |

### Shader uniforms

| Uniform | Type | Meaning |
|---|---|---|
| `uTime` | `number` | Animation time; changes when `animate: true` |
| `uResolution` | `Vector2` | Renderer size in pixels |
| `uNoiseStrength` | `number` | Procedural grain intensity |
| `uNoiseScale` | `number` | Noise frequency multiplier |
| `uSpecular` | `number` | Procedural highlight intensity |
| `uFresnel` | `number` | Edge response from view angle |
| `uEdgeLight` | `number` | Additional edge-light intensity |
| `uTint` | `Color` | Shader tint color |
| `uTintStrength` | `number` | Tint blend amount |

### Controls

| Option | Default | Range / note |
|---|---:|---|
| `transmission` | `0.98` | `0–1`, physical transmission |
| `thickness` | `0.42` | `0+`, scene units |
| `ior` | `1.46` | Clamped to `1–2.333` |
| `dispersion` | `0.12` | `0+`, Three.js chromatic dispersion |
| `iridescence` | `0.08` | `0–1`, angle-dependent color shift |
| `iridescenceIOR` | `1.3` | `1–2.333`, iridescence layer IOR |
| `transmissionResolutionScale` | `0.8` | `0.25–1`, lower values can improve performance |
| `roughness` | `0.075` | `0–1` |
| `tint` | `#ffffff` | CSS color |
| `tintStrength` | `0.08` | `0–1` |
| `noise` | `0.08` | `0–1` |
| `noiseScale` | `1` | Positive multiplier |
| `specular` | `0.78` | `0–2` |
| `fresnel` | `0.62` | `0–2` |
| `edgeLight` | `0.34` | `0–2` |
| `maxPixelRatio` | `1.75` | Caps render-target resolution |
| `animate` | `false` | Enables continuous animation loop |

## Honest limitations

- The physical material handles the main transmission/refraction inside the Three.js scene. This is real-time rendered material transmission, not a ray-traced optical simulation. The Three.js documentation notes that `MeshPhysicalMaterial` has a higher per-pixel cost and recommends an environment map; the plugin builds one from `RoomEnvironment`.
- The refracted backdrop is the supplied texture/image/canvas/video in the scene. Arbitrary Vue/HTML content is not captured automatically.
- A supplied canvas/video texture can be updated by the application; call `controller.render()` after updating it when `animate` is false.
- WebGL 2 and a working graphics driver are required. If renderer construction or texture loading fails, the `createGlassThree` promise rejects and the Vue component emits `error`.
- GPU performance varies. Keep `maxPixelRatio` conservative and disable `animate` for static surfaces.
- The old CSS `glass()` output remains unchanged and is not silently replaced by this WebGL renderer.

## Included source files

- `index.ts` — plugin exports.
- `types.ts` — complete public API and output types.
- `createGlassThree.ts` — renderer creation, lifecycle and public controller.
- `shaders.ts` — custom GLSL highlight/noise shader.
- `GlassThreeSurface.vue` — Vue 3 component wrapper.
- `examples/GlassThreeExample.vue` and `examples/assets/demo-background.svg` — sample integration.
