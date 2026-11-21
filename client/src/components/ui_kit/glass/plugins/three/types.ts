import type {
  OrthographicCamera,
  Color,
  Vector2,
  Mesh,
  MeshPhysicalMaterial,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderer,
} from 'three';

export type GlassBackgroundSource =
  | string
  | Texture
  | HTMLImageElement
  | HTMLCanvasElement
  | HTMLVideoElement;

export interface GlassThreeVisualOptions {
  /** Material tint, CSS color format. */
  tint: string;
  /** 0 = no tint, 1 = full tint. */
  tintStrength: number;
  /** Three.js physical transmission, from 0 to 1. */
  transmission: number;
  /** Screen-visible glass thickness in scene units. */
  thickness: number;
  /** Index of refraction. MeshPhysicalMaterial supports 1.0–2.333. */
  ior: number;
  /** Chromatic dispersion for transmissive material. */
  dispersion: number;
  /** Angle-dependent color shift from the physical iridescence layer. */
  iridescence: number;
  /** IOR used by the iridescence layer. */
  iridescenceIOR: number;
  /** Surface roughness, from 0 to 1. */
  roughness: number;
  /** Procedural grain amount, from 0 to 1. */
  noise: number;
  /** Procedural grain frequency. */
  noiseScale: number;
  /** Overlay specular highlight strength, from 0 to 2. */
  specular: number;
  /** Fresnel rim intensity, from 0 to 2. */
  fresnel: number;
  /** Additional edge-light intensity, from 0 to 2. */
  edgeLight: number;
}

export interface GlassThreeOptions extends Partial<GlassThreeVisualOptions> {
  /** A URL, Three.js Texture, image, canvas, or video used as the captured background. */
  background: GlassBackgroundSource;
  /** Cap the device pixel ratio to avoid oversized framebuffers. Default: 1.75. */
  maxPixelRatio?: number;
  /** Transmission render-target scale. Lower values can improve performance. Default: 0.8. */
  transmissionResolutionScale?: number;
  /** Animate the procedural grain. Static rendering is used by default. */
  animate?: boolean;
  /** WebGL power hint. Default: 'default'. */
  powerPreference?: 'default' | 'low-power' | 'high-performance';
  /** Called for asynchronous renderer errors after initialization. */
  onError?: (error: Error) => void;
}

/**
 * Three.js ShaderMaterial uniform definitions.
 * The index signature makes the object compatible with
 * ShaderMaterial's uniforms map.
 */
export interface GlassOverlayUniforms
  extends Record<string, { value: unknown }> {
  uTime: { value: number };
  uResolution: { value: Vector2 };
  uNoiseStrength: { value: number };
  uNoiseScale: { value: number };
  uSpecular: { value: number };
  uFresnel: { value: number };
  uEdgeLight: { value: number };
  uTint: { value: Color };
  uTintStrength: { value: number };
}

export interface GlassThreeOutput {
  /** The WebGL canvas appended to the host element. */
  canvas: HTMLCanvasElement;
  renderer: WebGLRenderer;
  scene: Scene;
  camera: OrthographicCamera;
  /** Textured backing surface sampled by the physical glass transmission pass. */
  backgroundMesh: Mesh;
  /** Main physically-based transmissive surface. */
  glassMesh: Mesh;
  material: MeshPhysicalMaterial;
  /** Additional shader layer for procedural noise, Fresnel and highlights. */
  overlayMesh: Mesh;
  overlayMaterial: ShaderMaterial;
  uniforms: GlassOverlayUniforms;
  /** The plugin-owned clone/texture currently used by the background mesh. */
  backgroundTexture: Texture;
}

export interface GlassThreeController {
  /** Stable references to the renderer objects and shader outputs. */
  readonly output: GlassThreeOutput;
  /** Change supported visual controls without rebuilding the renderer. */
  update(options: Partial<GlassThreeVisualOptions>): void;
  /** Replace the image/canvas/video/texture used behind the glass. */
  setBackground(source: GlassBackgroundSource): Promise<void>;
  /** Resize to the host element's current dimensions and render once. */
  resize(): void;
  /** Render one frame manually (useful for externally updated CanvasTextures). */
  render(): void;
  /** Release observers, animation frames, materials, textures and GPU resources. */
  dispose(): void;
}

