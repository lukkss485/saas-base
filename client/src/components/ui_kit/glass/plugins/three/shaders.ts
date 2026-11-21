export const glassOverlayVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    vNormalView = normalize(normalMatrix * normal);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const glassOverlayFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uNoiseStrength;
  uniform float uNoiseScale;
  uniform float uSpecular;
  uniform float uFresnel;
  uniform float uEdgeLight;
  uniform vec3 uTint;
  uniform float uTintStrength;

  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewPosition;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec3 N = normalize(vNormalView);
    vec3 V = normalize(vViewPosition);
    vec3 L = normalize(vec3(-0.48, 0.72, 0.68));
    vec3 H = normalize(L + V);

    float ndv = max(dot(N, V), 0.0);
    float fresnelTerm = pow(1.0 - ndv, 4.0);

    // A broad specular lobe plus a narrow glint. The physical material below
    // provides the actual environment reflections; this layer adds stylized control.
    float broadSpec = pow(max(dot(N, H), 0.0), 28.0);
    float sharpSpec = pow(max(dot(N, H), 0.0), 96.0);
    float specularTerm = (broadSpec * 0.22 + sharpSpec * 0.78) * uSpecular;

    float edgeDistance = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0;
    float edgeMask = smoothstep(0.52, 0.99, edgeDistance);
    float directionalEdge = 0.55 + 0.45 * smoothstep(-0.25, 0.9, dot(N, L));

    vec2 noiseUv = gl_FragCoord.xy / max(uResolution, vec2(1.0)) * uNoiseScale;
    float grain = valueNoise(noiseUv * 640.0 + vec2(uTime * 0.13, uTime * 0.07)) - 0.5;
    float fineGrain = hash21(gl_FragCoord.xy + floor(uTime * 2.0)) - 0.5;
    float noiseValue = (grain * 0.35 + fineGrain * 0.65) * uNoiseStrength;

    vec3 highlight = vec3(1.0) * (specularTerm + fresnelTerm * uFresnel);
    highlight += uTint * edgeMask * directionalEdge * uEdgeLight * 0.22;

    float alpha = clamp(
      specularTerm * 0.48 + fresnelTerm * uFresnel * 0.38 + edgeMask * uEdgeLight * 0.12,
      0.0,
      0.72
    );

    vec3 grainColor = mix(vec3(0.72), vec3(1.0), step(0.0, noiseValue));
    vec3 outColor = highlight + grainColor * abs(noiseValue) * 0.07;
    outColor = mix(outColor, outColor * uTint, clamp(uTintStrength, 0.0, 1.0) * 0.22);

    if (alpha < 0.004 && abs(noiseValue) < 0.002) discard;
    gl_FragColor = vec4(outColor, alpha);
  }
`;
