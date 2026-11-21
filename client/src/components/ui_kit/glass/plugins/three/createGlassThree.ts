import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  CanvasTexture,
  ClampToEdgeWrapping,
  Color,
  LinearFilter,
  LinearMipmapLinearFilter,
  ShaderMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  OrthographicCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  VideoTexture,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { glassOverlayFragmentShader, glassOverlayVertexShader } from './shaders';
import type {
  GlassBackgroundSource,
  GlassOverlayUniforms,
  GlassThreeController,
  GlassThreeOptions,
  GlassThreeOutput,
  GlassThreeVisualOptions,
} from './types';

const DEFAULTS: GlassThreeVisualOptions = {
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
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function getSourceSize(source: Texture | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement) {
  const image = source instanceof Texture ? source.image : source;
  const width = Number(
    (image as HTMLVideoElement).videoWidth ||
    (image as HTMLImageElement).naturalWidth ||
    (image as HTMLCanvasElement).width ||
    1,
  );
  const height = Number(
    (image as HTMLVideoElement).videoHeight ||
    (image as HTMLImageElement).naturalHeight ||
    (image as HTMLCanvasElement).height ||
    1,
  );
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

async function createOwnedTexture(source: GlassBackgroundSource): Promise<Texture> {
  let texture: Texture;

  if (typeof source === 'string') {
    const loader = new TextureLoader();
    loader.setCrossOrigin('anonymous');
    texture = await loader.loadAsync(source);
  } else if (source instanceof Texture) {
    // Clone so the plugin can set UV crop/color-space and dispose safely.
    texture = source.clone();
    texture.needsUpdate = true;
  } else if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) {
    texture = new CanvasTexture(source);
  } else if (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement) {
    texture = new VideoTexture(source);
  } else {
    texture = new Texture(source);
    texture.needsUpdate = true;
  }

  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function applyCover(texture: Texture, textureSize: { width: number; height: number }, hostWidth: number, hostHeight: number) {
  const textureAspect = textureSize.width / textureSize.height;
  const hostAspect = Math.max(1, hostWidth) / Math.max(1, hostHeight);

  texture.repeat.set(1, 1);
  texture.offset.set(0, 0);

  if (textureAspect > hostAspect) {
    const visibleWidth = hostAspect / textureAspect;
    texture.repeat.x = visibleWidth;
    texture.offset.x = (1 - visibleWidth) / 2;
  } else {
    const visibleHeight = textureAspect / hostAspect;
    texture.repeat.y = visibleHeight;
    texture.offset.y = (1 - visibleHeight) / 2;
  }
  texture.needsUpdate = true;
}

/**
 * Mounts a physically-based transmissive Three.js glass surface into a host element.
 * The background is a supplied texture/image/canvas/video, not an automatic DOM capture.
 */
export async function createGlassThree(
  host: HTMLElement,
  options: GlassThreeOptions,
): Promise<GlassThreeController> {
  if (!host) throw new Error('createGlassThree: host element is required.');
  if (!options?.background) throw new Error('createGlassThree: a background texture/source is required.');

  const settings: GlassThreeVisualOptions = { ...DEFAULTS, ...options };
  let backgroundTexture: Texture | null = null;
  let renderer: WebGLRenderer | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let animationFrame = 0;
  let disposed = false;
  let previousPosition = '';
  let changedHostPosition = false;
  let appendedCanvas: HTMLCanvasElement | null = null;
  let environmentTarget: WebGLRenderTarget | null = null;
  let roomEnvironment: RoomEnvironment | null = null;
  let pmremGenerator: PMREMGenerator | null = null;
  const maxPixelRatio = clamp(options.maxPixelRatio ?? 1.75, 0.5, 3);

  try {
    const initialBackgroundTexture = await createOwnedTexture(options.background);
    backgroundTexture = initialBackgroundTexture;

    const width = Math.max(1, host.clientWidth || 320);
    const height = Math.max(1, host.clientHeight || 180);
    const aspect = width / height;

    const oldPosition = getComputedStyle(host).position;
    if (oldPosition === 'static') {
      previousPosition = host.style.position;
      host.style.position = 'relative';
      changedHostPosition = true;
    }

    renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: options.powerPreference ?? 'default',
      premultipliedAlpha: true,
    });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.transmissionResolutionScale = clamp(options.transmissionResolutionScale ?? 0.8, 0.25, 1);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
    renderer.setSize(width, height, false);

    const canvas = renderer.domElement;
    appendedCanvas = canvas;
    canvas.className = 'glass-three__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.tabIndex = -1;
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      display: 'block',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '0',
    });
    host.appendChild(canvas);

    const scene = new Scene();
    const camera = new OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    roomEnvironment = new RoomEnvironment();
    pmremGenerator = new PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    environmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.04);
    scene.environment = environmentTarget.texture;
    pmremGenerator.dispose();
    pmremGenerator = null;
    roomEnvironment.dispose();
    roomEnvironment = null;

    const surfaceWidth = aspect * 1.92;
    const surfaceHeight = 1.92;
    const cornerRadius = clamp(Math.min(surfaceWidth, surfaceHeight) * 0.11, 0.06, 0.2);
    const geometry = new RoundedBoxGeometry(surfaceWidth, surfaceHeight, 0.16, cornerRadius, 8);

    applyCover(initialBackgroundTexture, getSourceSize(initialBackgroundTexture), width, height);
    const backgroundMaterial = new MeshBasicMaterial({ map: initialBackgroundTexture, toneMapped: false });
    const backgroundMesh = new Mesh(geometry, backgroundMaterial);
    backgroundMesh.position.z = -0.13;
    backgroundMesh.renderOrder = 0;
    scene.add(backgroundMesh);

    const material = new MeshPhysicalMaterial({
      color: new Color(settings.tint).lerp(new Color('#ffffff'), 1 - clamp(settings.tintStrength, 0, 1)),
      metalness: 0,
      roughness: clamp(settings.roughness, 0, 1),
      transmission: clamp(settings.transmission, 0, 1),
      thickness: Math.max(0, settings.thickness),
      ior: clamp(settings.ior, 1, 2.333),
      dispersion: Math.max(0, settings.dispersion),
      iridescence: clamp(settings.iridescence, 0, 1),
      iridescenceIOR: clamp(settings.iridescenceIOR, 1, 2.333),
      clearcoat: 1,
      clearcoatRoughness: 0.045,
      envMapIntensity: 1.35,
      transparent: false,
      opacity: 1,
    });
    const glassMesh = new Mesh(geometry, material);
    glassMesh.position.z = 0.015;
    glassMesh.renderOrder = 1;
    scene.add(glassMesh);

    const tintColor = new Color(settings.tint);
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
    const overlayMaterial = new ShaderMaterial({
      vertexShader: glassOverlayVertexShader,
      fragmentShader: glassOverlayFragmentShader,
      uniforms, // < erro: Type 'GlassOverlayUniforms' is not assignable to type 'IUniform<any>[]'.ts(2322)
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    const overlayMesh = new Mesh(geometry, overlayMaterial);
    overlayMesh.position.z = 0.022;
    overlayMesh.renderOrder = 2;
    scene.add(overlayMesh);

    const output: GlassThreeOutput = {
      canvas,
      renderer,
      scene,
      camera,
      backgroundMesh,
      glassMesh,
      material,
      overlayMesh,
      overlayMaterial,
      uniforms,
      backgroundTexture: initialBackgroundTexture,
    };

    const render = () => {
      if (disposed || !renderer) return;
      renderer.render(scene, camera);
    };

    const resize = () => {
      if (disposed || !renderer) return;
      const nextWidth = Math.max(1, host.clientWidth || width);
      const nextHeight = Math.max(1, host.clientHeight || height);
      const nextAspect = nextWidth / nextHeight;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
      renderer.setSize(nextWidth, nextHeight, false);
      camera.left = -nextAspect;
      camera.right = nextAspect;
      camera.top = 1;
      camera.bottom = -1;
      camera.updateProjectionMatrix();

      const nextSurfaceWidth = nextAspect * 1.92;
      const nextRadius = clamp(Math.min(nextSurfaceWidth, surfaceHeight) * 0.11, 0.06, 0.2);
      const nextGeometry = new RoundedBoxGeometry(nextSurfaceWidth, surfaceHeight, 0.16, nextRadius, 8);
      backgroundMesh.geometry.dispose();
      backgroundMesh.geometry = nextGeometry;
      glassMesh.geometry = nextGeometry;
      overlayMesh.geometry = nextGeometry;
      uniforms.uResolution.value.set(nextWidth, nextHeight);
      if (backgroundTexture) {
        applyCover(backgroundTexture, getSourceSize(backgroundTexture), nextWidth, nextHeight);
      }
      render();
    };

    const update = (patch: Partial<GlassThreeVisualOptions>) => {
      Object.assign(settings, patch);
      const tint = new Color(settings.tint);
      material.color.copy(tint).lerp(new Color('#ffffff'), 1 - clamp(settings.tintStrength, 0, 1));
      material.transmission = clamp(settings.transmission, 0, 1);
      material.thickness = Math.max(0, settings.thickness);
      material.ior = clamp(settings.ior, 1, 2.333);
      material.dispersion = Math.max(0, settings.dispersion);
      material.iridescence = clamp(settings.iridescence, 0, 1);
      material.iridescenceIOR = clamp(settings.iridescenceIOR, 1, 2.333);
      material.roughness = clamp(settings.roughness, 0, 1);
      uniforms.uNoiseStrength.value = clamp(settings.noise, 0, 1);
      uniforms.uNoiseScale.value = Math.max(0.05, settings.noiseScale);
      uniforms.uSpecular.value = clamp(settings.specular, 0, 2);
      uniforms.uFresnel.value = clamp(settings.fresnel, 0, 2);
      uniforms.uEdgeLight.value = clamp(settings.edgeLight, 0, 2);
      uniforms.uTint.value.copy(tint);
      uniforms.uTintStrength.value = clamp(settings.tintStrength, 0, 1);
      render();
    };

    const setBackground = async (source: GlassBackgroundSource) => {
      const nextTexture = await createOwnedTexture(source);
      if (disposed) {
        nextTexture.dispose();
        return;
      }
      applyCover(nextTexture, getSourceSize(nextTexture), host.clientWidth || width, host.clientHeight || height);
      const previous = backgroundMesh.material as MeshBasicMaterial;
      previous.map = nextTexture;
      previous.needsUpdate = true;
      output.backgroundTexture = nextTexture;
      backgroundTexture?.dispose();
      backgroundTexture = nextTexture;
      render();
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      options.onError?.(new Error('WebGL context was lost. The glass renderer cannot render until the context is restored.'));
    };
    canvas.addEventListener('webglcontextlost', onContextLost, false);

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
    } else {
      window.addEventListener('resize', resize);
    }

    const animate = (timestamp: number) => {
      if (disposed) return;
      uniforms.uTime.value = timestamp * 0.001;
      render();
      animationFrame = window.requestAnimationFrame(animate);
    };
    if (options.animate) animationFrame = window.requestAnimationFrame(animate);
    else render();

    return {
      output,
      update,
      setBackground,
      resize,
      render,
      dispose: () => {
        if (disposed) return;
        disposed = true;
        if (animationFrame) window.cancelAnimationFrame(animationFrame);
        resizeObserver?.disconnect();
        if (typeof ResizeObserver === 'undefined') window.removeEventListener('resize', resize);
        canvas.removeEventListener('webglcontextlost', onContextLost);
        scene.environment = null;
        environmentTarget?.dispose();
        backgroundMesh.geometry.dispose();
        backgroundMaterial.dispose();
        material.dispose();
        overlayMaterial.dispose();
        backgroundTexture?.dispose();
        renderer?.dispose();
        renderer?.forceContextLoss();
        canvas.remove();
        if (changedHostPosition) host.style.position = previousPosition;
      },
    };
  } catch (error) {
    backgroundTexture?.dispose();
    environmentTarget?.dispose();
    pmremGenerator?.dispose();
    roomEnvironment?.dispose();
    renderer?.dispose();
    appendedCanvas?.remove();
    if (changedHostPosition) host.style.position = previousPosition;
    throw normalizeError(error);
  }
}
