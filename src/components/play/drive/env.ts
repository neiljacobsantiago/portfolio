import {
  BackSide,
  BoxGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  Quaternion,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  type Texture,
  Vector3,
  type WebGLRenderer,
} from "three";
import { rng } from "./kit";

// The light that glossy things reflect: a tiny procedural scene of the city
// at night (a dark sky with the city's glow on the horizon, a ring of lit
// windows, a few floodlight banks overhead) prefiltered once into a PMREM.
// Paint, glass, steel and wet-looking asphalt pick up those lights instead
// of a studio. A second, daylight version is made for golden hour and day.

function envScene(night: boolean) {
  const scene = new Scene();
  const sky = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new Color(night ? "#03060d" : "#5f97c7") },
      uHorizon: { value: new Color(night ? "#1d2033" : "#e9e2d2") },
      uGlow: { value: new Color(night ? "#8a5232" : "#fff2d8") },
      uGround: { value: new Color(night ? "#07080b" : "#6a6862") },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uHorizon, uGlow, uGround;
      varying vec3 vDir;
      void main() {
        float y = normalize(vDir).y;
        vec3 c = mix(uHorizon, uTop, smoothstep(0.0, 0.6, y));
        c += uGlow * pow(1.0 - abs(y), 8.0) * 0.8;
        c = mix(c, uGround, smoothstep(0.02, -0.12, y));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  scene.add(new Mesh(new SphereGeometry(50, 32, 16), sky));
  if (night) {
    // A ring of city windows just above the horizon, warm and cool
    const rand = rng(99);
    const count = 260;
    const win = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: "#ffffff" }), count);
    const m = new Matrix4();
    const c = new Color();
    const pos = new Vector3();
    const q = new Quaternion();
    const scl = new Vector3();
    const up = new Vector3(0, 1, 0);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = 40 + rand() * 6;
      const y = -1 + rand() * rand() * 14;
      m.compose(pos.set(Math.cos(a) * r, y, Math.sin(a) * r), q.setFromAxisAngle(up, -a), scl.set(0.4, 0.7 + rand() * 1.6, 1.4 + rand() * 3));
      win.setMatrixAt(i, m);
      c.set(rand() < 0.7 ? "#ffcf96" : "#a9d4ff").multiplyScalar(0.6 + rand() * 1.4);
      win.setColorAt(i, c);
    }
    scene.add(win);
    // Floodlight banks overhead, either side: the bright highlights on the car and the track
    const banks = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: "#ffffff" }), 8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      m.compose(pos.set(Math.cos(a) * 22, 26, Math.sin(a) * 22), q.setFromAxisAngle(up, -a), scl.set(1.5, 1.2, 9));
      banks.setMatrixAt(i, m);
      banks.setColorAt(i, c.set("#fff1d8").multiplyScalar(9));
    }
    scene.add(banks);
  } else {
    // The sun's warm side, a little brighter
    const sun = new Mesh(new SphereGeometry(4, 12, 8), new MeshBasicMaterial({ color: new Color("#fff4e0").multiplyScalar(14) }));
    sun.position.set(26, 32, 20);
    scene.add(sun);
  }
  return scene;
}

/** The night and day environment maps (PMREM), made once. */
export function cityEnvironments(renderer: WebGLRenderer): { night: Texture; day: Texture; dispose: () => void } {
  const pmrem = new PMREMGenerator(renderer);
  const make = (night: boolean) => {
    const s = envScene(night);
    const t = pmrem.fromScene(s, 0.02).texture;
    s.traverse((o) => {
      const m = o as Mesh;
      m.geometry?.dispose();
      (m.material as MeshBasicMaterial | undefined)?.dispose?.();
    });
    return t;
  };
  const night = make(true);
  const day = make(false);
  pmrem.dispose();
  return { night, day, dispose: () => [night, day].forEach((t) => t.dispose()) };
}
