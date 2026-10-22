import {
  AdditiveBlending,
  BufferGeometry,
  type Camera,
  Float32BufferAttribute,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NoBlending,
  OrthographicCamera,
  type Scene,
  ShaderMaterial,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";

// The post chain for medium and high: the scene renders into a half-float
// target with 4× MSAA, a small bloom picks out what's brighter than white
// (lamp heads, neon, floodlights), and one last pass tone-maps, grades and
// vignettes it onto the canvas. The bloom is a dual-filter pyramid starting
// at half resolution: a few tiny passes, cheap on phone GPUs. Without
// half-float render targets the engine simply draws straight to the canvas.

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }`;

/** Threshold with a soft knee, then a 4-tap box down to half size. */
const PREFILTER = /* glsl */ `
  uniform sampler2D tMap;
  uniform vec2 uTexel;
  uniform float uThreshold, uKnee;
  varying vec2 vUv;
  vec3 pick(vec2 uv) {
    vec3 c = texture2D(tMap, uv).rgb;
    float b = max(c.r, max(c.g, c.b));
    float soft = clamp(b - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 1e-4);
    float w = max(soft, b - uThreshold) / max(b, 1e-4);
    // Keep fireflies (one hot pixel) from strobing
    return min(c * w, vec3(8.0));
  }
  void main() {
    vec2 o = uTexel;
    vec3 c = pick(vUv + vec2(-o.x, -o.y)) + pick(vUv + vec2(o.x, -o.y)) + pick(vUv + vec2(-o.x, o.y)) + pick(vUv + vec2(o.x, o.y));
    gl_FragColor = vec4(c * 0.25, 1.0);
  }`;

/** Dual-filter down: five bilinear taps. */
const DOWN = /* glsl */ `
  uniform sampler2D tMap;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    vec2 o = uTexel;
    vec3 c = texture2D(tMap, vUv).rgb * 4.0;
    c += texture2D(tMap, vUv + vec2(-o.x, -o.y)).rgb;
    c += texture2D(tMap, vUv + vec2(o.x, -o.y)).rgb;
    c += texture2D(tMap, vUv + vec2(-o.x, o.y)).rgb;
    c += texture2D(tMap, vUv + vec2(o.x, o.y)).rgb;
    gl_FragColor = vec4(c / 8.0, 1.0);
  }`;

/** Dual-filter up: a tent of eight taps, added onto the level above. */
const UP = /* glsl */ `
  uniform sampler2D tMap;
  uniform vec2 uTexel;
  uniform float uSpread;
  varying vec2 vUv;
  void main() {
    vec2 o = uTexel * uSpread;
    vec3 c = texture2D(tMap, vUv + vec2(-2.0 * o.x, 0.0)).rgb;
    c += texture2D(tMap, vUv + vec2(2.0 * o.x, 0.0)).rgb;
    c += texture2D(tMap, vUv + vec2(0.0, -2.0 * o.y)).rgb;
    c += texture2D(tMap, vUv + vec2(0.0, 2.0 * o.y)).rgb;
    c += texture2D(tMap, vUv + vec2(-o.x, -o.y)).rgb * 2.0;
    c += texture2D(tMap, vUv + vec2(o.x, -o.y)).rgb * 2.0;
    c += texture2D(tMap, vUv + vec2(-o.x, o.y)).rgb * 2.0;
    c += texture2D(tMap, vUv + vec2(o.x, o.y)).rgb * 2.0;
    gl_FragColor = vec4(c / 12.0, 1.0);
  }`;

/**
 * Bloom on, tone mapping (the renderer's ACES and exposure), then a grade in
 * the site's palette: shadows lean to ink, highlights to paper, a little
 * extra colour, a soft vignette and a whisper of noise against banding.
 */
const FINAL = /* glsl */ `
  uniform sampler2D tScene, tBloom;
  uniform float uBloom, uGrade, uVignette;
  uniform vec2 uAspect;
  varying vec2 vUv;
  float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
  void main() {
    vec3 c = texture2D(tScene, vUv).rgb;
    c += texture2D(tBloom, vUv).rgb * uBloom;
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    c = gl_FragColor.rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    // Split-tone: ink in the shadows, warm paper in the highlights
    vec3 graded = c;
    graded += vec3(-0.004, 0.010, 0.022) * (1.0 - smoothstep(0.0, 0.22, l));
    graded *= mix(vec3(1.0), vec3(1.05, 1.0, 0.9), smoothstep(0.25, 0.95, l));
    graded = mix(vec3(dot(graded, vec3(0.2126, 0.7152, 0.0722))), graded, 1.1);
    c = mix(c, max(graded, 0.0), uGrade);
    vec2 d = (vUv - 0.5) * uAspect;
    c *= 1.0 - uVignette * smoothstep(0.35, 1.05, length(d) * 1.35);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
    gl_FragColor.rgb += (ign(gl_FragCoord.xy) - 0.5) / 255.0;
  }`;

/** Can this browser render into half-float targets? Asked before the renderer exists, so it can skip its own MSAA. */
export function canPost() {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return false;
    const ok = !!gl.getExtension("EXT_color_buffer_float") || !!gl.getExtension("EXT_color_buffer_half_float");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

export function createPost(renderer: WebGLRenderer, opts: { mips: number }) {
  // One big triangle covers the screen
  const tri = new BufferGeometry();
  tri.setAttribute("position", new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const quad = new Mesh(tri);
  quad.frustumCulled = false;
  const cam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const rt = (w: number, h: number, samples = 0) =>
    new WebGLRenderTarget(w, h, { type: HalfFloatType, samples, depthBuffer: samples > 0, minFilter: LinearFilter, magFilter: LinearFilter, generateMipmaps: false });
  const sceneRT = rt(1, 1, 4);
  const mips: WebGLRenderTarget[] = Array.from({ length: Math.max(1, opts.mips) }, () => rt(1, 1));

  const pass = (fragmentShader: string, uniforms: Record<string, { value: unknown }>, additive = false) =>
    new ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false, blending: additive ? AdditiveBlending : NoBlending, toneMapped: false });
  const prefilter = pass(PREFILTER, { tMap: { value: null }, uTexel: { value: new Vector2() }, uThreshold: { value: 2.2 }, uKnee: { value: 0.8 } });
  const down = pass(DOWN, { tMap: { value: null }, uTexel: { value: new Vector2() } });
  const up = pass(UP, { tMap: { value: null }, uTexel: { value: new Vector2() }, uSpread: { value: 1 } }, true);
  const final = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FINAL,
    uniforms: {
      tScene: { value: sceneRT.texture },
      tBloom: { value: mips[0].texture },
      uBloom: { value: 0.45 },
      uGrade: { value: 1 },
      uVignette: { value: 0.32 },
      uAspect: { value: new Vector2(1, 1) },
    },
    depthTest: false,
    depthWrite: false,
  });

  let bloomOn = opts.mips > 0;
  const draw = (mat: ShaderMaterial, target: WebGLRenderTarget | null) => {
    quad.material = mat;
    renderer.setRenderTarget(target);
    // The upsample adds onto what's there: no clear first
    const clear = renderer.autoClear;
    renderer.autoClear = mat !== up;
    renderer.render(quad, cam);
    renderer.autoClear = clear;
  };

  return {
    /** Bloom strength (the engine eases it with the time of day). */
    uniforms: final.uniforms as { uBloom: { value: number }; uGrade: { value: number }; uVignette: { value: number } },
    setBloom(on: boolean) {
      bloomOn = on && opts.mips > 0;
    },
    /** Sizes in device pixels. */
    setSize(w: number, h: number) {
      w = Math.max(1, Math.round(w));
      h = Math.max(1, Math.round(h));
      sceneRT.setSize(w, h);
      let mw = w;
      let mh = h;
      for (const m of mips) {
        mw = Math.max(1, Math.round(mw / 2));
        mh = Math.max(1, Math.round(mh / 2));
        m.setSize(mw, mh);
      }
      final.uniforms.uAspect.value.set(w / Math.max(w, h), h / Math.max(w, h)).multiplyScalar(Math.SQRT2);
    },
    render(scene: Scene, camera: Camera) {
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);
      if (bloomOn) {
        const src = sceneRT;
        prefilter.uniforms.tMap.value = src.texture;
        (prefilter.uniforms.uTexel.value as Vector2).set(0.5 / src.width, 0.5 / src.height);
        draw(prefilter, mips[0]);
        for (let i = 1; i < mips.length; i++) {
          down.uniforms.tMap.value = mips[i - 1].texture;
          (down.uniforms.uTexel.value as Vector2).set(1 / mips[i - 1].width, 1 / mips[i - 1].height);
          draw(down, mips[i]);
        }
        // Back up the pyramid, each level added onto the one above
        for (let i = mips.length - 1; i > 0; i--) {
          up.uniforms.tMap.value = mips[i].texture;
          (up.uniforms.uTexel.value as Vector2).set(0.5 / mips[i].width, 0.5 / mips[i].height);
          draw(up, mips[i - 1]);
        }
      }
      final.uniforms.tBloom.value = mips[0].texture;
      const strength = final.uniforms.uBloom.value as number;
      if (!bloomOn) final.uniforms.uBloom.value = 0;
      draw(final, null);
      final.uniforms.uBloom.value = strength;
    },
    dispose() {
      sceneRT.dispose();
      for (const m of mips) m.dispose();
      for (const m of [prefilter, down, up, final]) m.dispose();
      tri.dispose();
    },
  };
}
export type Post = ReturnType<typeof createPost>;
