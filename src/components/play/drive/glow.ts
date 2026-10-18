import { AdditiveBlending, Color, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils } from "three";

// Bloom without bloom: every light source (floodlight heads, start lights,
// tower tops, the wheel's rim) gets a soft camera-facing sprite. All of them
// are one instanced draw call; their brightness follows the time of day and
// each keeps a minimum on-screen size so distant lights still sparkle.

export function createGlows(capacity: number) {
  const base = new PlaneGeometry(1, 1);
  const geo = new InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute("position", base.attributes.position);
  geo.setAttribute("uv", base.attributes.uv);
  const offset = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  const color = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  // x: size in metres, y: brightness, z: which "channel" dims it (0 floodlights/city, 1 always on)
  const params = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  geo.setAttribute("aOffset", offset);
  geo.setAttribute("aColor", color);
  geo.setAttribute("aParams", params);
  geo.instanceCount = 0;

  const uniforms = UniformsUtils.merge([UniformsLib.fog, { uNight: { value: 1 }, uMinAngle: { value: 0.0035 } }]);
  const mat = new ShaderMaterial({
    uniforms,
    fog: true,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aOffset;
      attribute vec3 aColor;
      attribute vec3 aParams;
      uniform float uNight, uMinAngle;
      varying vec2 vUv;
      varying vec3 vColor;
      #include <fog_pars_vertex>
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(aOffset, 1.0);
        float size = max(aParams.x, -mvPosition.z * uMinAngle * aParams.x);
        mvPosition.xy += position.xy * size;
        vUv = uv;
        float k = aParams.z > 0.5 ? 1.0 : uNight;
        vColor = aColor * aParams.y * k;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vColor;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float a = exp(-d * d * 5.0) * 0.75 + exp(-d * d * 40.0);
        a *= 1.0 - smoothstep(0.85, 1.0, d);
        gl_FragColor = vec4(vColor * a, 1.0);
        // Additive: fog fades a light towards black (lights carry further than surfaces)
        #ifdef USE_FOG
          #ifdef FOG_EXP2
            float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          #else
            float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
          #endif
          gl_FragColor.rgb *= 1.0 - fogFactor * 0.7;
        #endif
      }`,
  });
  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;

  const c = new Color();
  let count = 0;
  return {
    mesh,
    uniforms: mat.uniforms as { uNight: { value: number }; uMinAngle: { value: number } },
    /** Adds a glow; returns its index (or -1 when full). */
    add(x: number, y: number, z: number, size: number, col: string, brightness = 1, alwaysOn = false) {
      if (count >= capacity) return -1;
      const i = count++;
      offset.setXYZ(i, x, y, z);
      c.set(col);
      color.setXYZ(i, c.r, c.g, c.b);
      params.setXYZ(i, size, brightness, alwaysOn ? 1 : 0);
      geo.instanceCount = count;
      offset.needsUpdate = color.needsUpdate = params.needsUpdate = true;
      return i;
    },
    /** Changes a glow's brightness (start lights switching, the wheel's sweep). */
    set(i: number, brightness: number, col?: string) {
      if (i < 0) return;
      params.setY(i, brightness);
      params.needsUpdate = true;
      if (col) {
        c.set(col);
        color.setXYZ(i, c.r, c.g, c.b);
        color.needsUpdate = true;
      }
    },
    move(i: number, x: number, y: number, z: number) {
      if (i < 0) return;
      offset.setXYZ(i, x, y, z);
      offset.needsUpdate = true;
    },
    get count() {
      return count;
    },
  };
}
export type Glows = ReturnType<typeof createGlows>;
