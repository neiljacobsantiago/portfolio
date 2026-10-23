import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  type Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  type MeshStandardMaterial,
  type Object3D,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from "three";
import type { Glows } from "./glow";
import { Batch, BoardAtlas, bevelBox, C, RACE, rng, rod, Soup, std, worldMaterial } from "./kit";
import { type Claim, fanZones, lanterns, toWorld } from "./layout";
import type { Landmark } from "./track";

// The project pavilions and the fan zones they stand in. Each fan zone is a
// paved promenade behind the debris fence with three pavilions on it, food
// kiosks and a big screen between them, a gate at either end, festoon
// lights strung between the lamp posts. Each pavilion is a lit plaza with a
// truss gantry carrying its title in the race font, a media wall behind,
// lighting masts, and one sculpture per project (a petri dish for
// PathoScan, a camera for photography, a concert stage…). Everything
// static merges into one draw call; moving and see-through pieces stay
// apart, in a group per pavilion that the engine hides when it's far off.

export interface Animated {
  update: (t: number, dt: number) => void;
}

const SAND = "#e2c18a";
const TRUNK = "#8a5a3c";
const SILVER = "#c9ccd1";

/** Each project's accent, for its media wall and title board. */
const ACCENT: Record<string, [string, string]> = {
  about: [C.ember, C.paper],
  photography: [C.ink, C.paper],
  buildit: ["#1b2740", "#9fb8ff"],
  aurora: [C.wine, "#ffd27a"],
  pathoscan: ["#123a2a", "#bff0cf"],
  memory: [C.sky, C.ink],
  cyber: [C.ink, "#ff8a7a"],
  lab: ["#1d3b2c", "#7bd88f"],
  contact: [C.ember, C.paper],
};

function mesh(geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0) {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

/** Builds a project's sculpture; anything animated or see-through is marked `live` and kept apart. */
function sculpture(l: Landmark, animated: Animated[]): Group {
  const g = new Group();
  const r = rng(Math.round(l.x * 31 + l.z * 7 + 99));
  const live = (o: Object3D) => ((o.userData.live = true), o);
  switch (l.kind) {
    case "petri": {
      g.add(live(mesh(new CylinderGeometry(6.2, 6.4, 0.7, 48), std("#dfe9ea", { transparent: true, opacity: 0.8, roughness: 0.08, metalness: 0.1 }), 0, 0.35)));
      g.add(mesh(new CylinderGeometry(5.7, 5.7, 0.5, 48), std("#f2d68a"), 0, 0.75));
      g.add(mesh(new TorusGeometry(6.1, 0.16, 8, 64), std("#ffffff"), 0, 1.2).rotateX(Math.PI / 2));
      const colonyColors = ["#5d7b3a", "#a8b54a", "#2e2e2e", "#d9c25a", "#7c8f3e"];
      for (let i = 0; i < 9; i++) {
        const a = r() * Math.PI * 2;
        const d = 1 + r() * 3.6;
        const s = 0.6 + r() * 1.1;
        const c = mesh(new SphereGeometry(s, 14, 10), std(colonyColors[i % colonyColors.length]), Math.cos(a) * d, 1, Math.sin(a) * d);
        c.scale.y = 0.35;
        g.add(c);
      }
      const scan = live(mesh(new TorusGeometry(5.9, 0.08, 6, 64), new MeshBasicMaterial({ color: "#7bd88f" }), 0, 1.4)) as Mesh;
      scan.rotateX(Math.PI / 2);
      g.add(scan);
      animated.push({ update: (t) => (scan.position.y = 1.4 + (Math.sin(t * 1.4) + 1) * 1.2) });
      break;
    }
    case "camera": {
      g.add(mesh(bevelBox(6.4, 4, 3.6, 0.3), std(C.ink, { roughness: 0.35 }), 0, 2.6));
      g.add(mesh(bevelBox(2.2, 1, 2.4, 0.15), std(C.ink, { roughness: 0.35 }), -1.6, 5));
      g.add(mesh(new CylinderGeometry(0.5, 0.5, 0.5, 20), std(C.ember), 2, 4.85, 0));
      g.add(mesh(bevelBox(1.4, 0.8, 1, 0.08), std(C.paper, { emissive: "#fff6e0", emissiveIntensity: 0.6 }), 1.6, 5.1, 0.6));
      const lens = live(new Group()) as Group;
      lens.add(mesh(new CylinderGeometry(1.9, 2.1, 2.6, 36), std("#1d1d1d", { roughness: 0.3 }), 0, 0, 0).rotateX(Math.PI / 2));
      lens.add(mesh(new CylinderGeometry(1.35, 1.35, 0.2, 36), std(C.sky, { roughness: 0.05, metalness: 0.6 }), 0, 0, 1.35).rotateX(Math.PI / 2));
      lens.position.set(0, 2.6, 2.9);
      g.add(lens);
      animated.push({ update: (t) => (lens.position.z = 2.9 + Math.max(0, Math.sin(t * 0.8)) * 0.6) });
      break;
    }
    case "stage": {
      g.add(mesh(bevelBox(14, 1.2, 8, 0.1), std(C.ink), 0, 0.6));
      g.add(mesh(bevelBox(12, 6, 0.4, 0.08), std(C.wine, { emissive: C.wine, emissiveIntensity: 0.6 }), 0, 4.2, -3.6));
      for (const x of [-6.6, 6.6]) g.add(mesh(bevelBox(0.4, 8, 0.4, 0.06), std(SILVER, { metalness: 0.6, roughness: 0.35 }), x, 4, 3.4));
      g.add(mesh(bevelBox(13.6, 0.4, 0.4, 0.06), std(SILVER, { metalness: 0.6, roughness: 0.35 }), 0, 8, 3.4));
      const beams: Mesh[] = [];
      [C.ember, C.sky, "#ffd27a", C.ember].forEach((color, i) => {
        const beam = live(mesh(new ConeGeometry(1.2, 7, 20, 1, true), new MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false }), -4.5 + i * 3, 4.4, 3.4)) as Mesh;
        beams.push(beam);
        g.add(beam);
      });
      animated.push({ update: (t) => beams.forEach((b, i) => (b.rotation.z = Math.sin(t * 1.3 + i) * 0.45)) });
      break;
    }
    case "pc": {
      g.add(mesh(bevelBox(3.4, 7.2, 6.4, 0.2), std("#1b2740", { roughness: 0.3, metalness: 0.3 }), 0, 3.6));
      g.add(mesh(new BoxGeometry(0.1, 6.2, 5.4), std("#2f5bd3", { emissive: "#2f5bd3", emissiveIntensity: 0.9 }), 1.72, 3.6, 0));
      const fans: Mesh[] = [];
      [1.8, 3.9, 6].forEach((y) => {
        const fan = live(mesh(new TorusGeometry(0.9, 0.14, 8, 28), new MeshBasicMaterial({ color: "#7aa2ff" }), 0, y, 3.22)) as Mesh;
        fans.push(fan);
        g.add(fan);
      });
      animated.push({ update: (t) => fans.forEach((f, i) => (f.rotation.z = t * (3 + i))) });
      break;
    }
    case "memory": {
      const widths = [4.6, 3.2, 4, 2.4, 3.6];
      const colors = [C.ember, C.sky, C.ink, C.wine, SAND];
      widths.forEach((w, i) => g.add(mesh(bevelBox(w, 1.2, 3, 0.1), std(colors[i]), (r() - 0.5) * 0.8, 0.6 + i * 1.25, 0)));
      break;
    }
    case "shield": {
      const lock = live(new Group()) as Group;
      lock.add(mesh(bevelBox(4, 3.4, 1.6, 0.2), std(C.ember, { roughness: 0.35 }), 0, 0, 0));
      lock.add(mesh(new TorusGeometry(1.25, 0.35, 12, 28, Math.PI), std(SILVER, { metalness: 0.8, roughness: 0.25 }), 0, 1.7, 0));
      lock.add(mesh(new CylinderGeometry(0.35, 0.35, 0.3, 14), std(C.ink), 0, 0.2, 0.85).rotateX(Math.PI / 2));
      lock.position.y = 3.2;
      g.add(lock);
      g.add(mesh(new CylinderGeometry(2.4, 2.8, 0.8, 10), std(SAND), 0, 0.4));
      animated.push({ update: (t) => ((lock.rotation.y = t * 0.6), (lock.position.y = 3.2 + Math.sin(t * 1.6) * 0.3)) });
      break;
    }
    case "lab": {
      g.add(mesh(new CylinderGeometry(2.3, 2.6, 0.6, 28), std(C.ink), 0, 0.3));
      g.add(live(mesh(new CylinderGeometry(2, 2.2, 5, 28, 1, true), std("#dff3ff", { transparent: true, opacity: 0.35, roughness: 0.05 }), 0, 3.1, 0)));
      g.add(mesh(new CylinderGeometry(1.85, 2.05, 2.6, 28), std("#7bd88f", { emissive: "#2e8b57", emissiveIntensity: 1.2 }), 0, 1.9, 0));
      const bubbles = Array.from({ length: 6 }, (_, i) => live(mesh(new SphereGeometry(0.22 + (i % 3) * 0.08, 8, 6), new MeshBasicMaterial({ color: "#c8ffd6" }), (r() - 0.5) * 2, 1, (r() - 0.5) * 2)) as Mesh);
      bubbles.forEach((b) => g.add(b));
      animated.push({ update: (t) => bubbles.forEach((b, i) => (b.position.y = 0.9 + ((t * 0.8 + i * 0.37) % 1) * 4.6)) });
      break;
    }
    case "mailbox": {
      g.add(mesh(bevelBox(0.45, 2.8, 0.45, 0.05), std(TRUNK), 0, 1.4));
      g.add(mesh(bevelBox(1.8, 1.3, 2.8, 0.1), std(C.ember, { roughness: 0.35 }), 0, 3.3));
      g.add(mesh(new CylinderGeometry(0.9, 0.9, 2.8, 20, 1, false, 0, Math.PI), std(C.ember, { roughness: 0.35 }), 0, 3.95, 0).rotateZ(Math.PI / 2).rotateY(Math.PI / 2));
      const flag = live(new Group()) as Group;
      flag.add(mesh(new BoxGeometry(0.12, 1.6, 0.12), std(C.ink), 0, 0.8, 0));
      flag.add(mesh(new BoxGeometry(0.1, 0.6, 0.8), std(C.ink), 0, 1.3, 0.4));
      flag.position.set(1, 3, 0.6);
      g.add(flag);
      animated.push({ update: (t) => (flag.rotation.x = -0.4 + Math.sin(t * 2.2) * 0.35) });
      g.scale.setScalar(1.5);
      break;
    }
    case "monument": {
      g.add(mesh(bevelBox(4.4, 1, 4.4, 0.12), std(SAND), 0, 0.5));
      g.add(mesh(bevelBox(1.6, 6.4, 1.6, 0.12), std(C.paper), 0, 4.2));
      const ring = live(mesh(new TorusGeometry(2.2, 0.22, 12, 48), std(C.ember, { emissive: C.ember, emissiveIntensity: 0.5 }), 0, 8.8, 0)) as Mesh;
      g.add(ring);
      animated.push({ update: (t) => ((ring.rotation.y = t * 0.9), (ring.rotation.x = Math.sin(t * 0.7) * 0.4)) });
      break;
    }
  }
  return g;
}

/** The big screens in the fan zones: a live-timing look in the site's palette. */
function screenTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 288;
  const g = c.getContext("2d")!;
  const draw = () => {
    const bg = g.createLinearGradient(0, 0, 512, 288);
    bg.addColorStop(0, "#071a2b");
    bg.addColorStop(1, "#0d2f47");
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 288);
    g.fillStyle = C.ember;
    g.fillRect(0, 0, 512, 40);
    g.fillStyle = C.paper;
    g.font = `italic 900 26px ${RACE.family}`;
    g.textBaseline = "middle";
    g.fillText("BAY STREET CIRCUIT · LIVE", 16, 21);
    // A timing tower
    const rows = [
      ["1", "NJS", "1:32.418"],
      ["2", "GHO", "+0.214"],
      ["3", "ITS", "+0.902"],
      ["4", "CLS", "+1.377"],
      ["5", "BSI", "+2.051"],
    ];
    rows.forEach(([p, n, t], k) => {
      const y = 56 + k * 40;
      g.fillStyle = k === 0 ? C.paper : "rgba(253,240,213,0.12)";
      g.fillRect(16, y, 210, 34);
      g.fillStyle = k === 0 ? C.ink : C.paper;
      g.font = `900 22px ${RACE.family}`;
      g.fillText(p, 26, y + 18);
      g.fillText(n, 58, y + 18);
      g.font = `600 20px ${RACE.family}`;
      g.fillText(t, 128, y + 18);
    });
    g.fillStyle = C.paper;
    g.font = `italic 900 58px ${RACE.family}`;
    g.fillText("FAN", 262, 120);
    g.fillStyle = "#ff8a7a";
    g.fillText("ZONE", 262, 178);
    g.fillStyle = "rgba(253,240,213,0.7)";
    g.font = `600 18px ${RACE.family}`;
    g.fillText("Neil's projects, trackside", 264, 230);
    g.fillStyle = "rgba(0,0,0,0.25)";
    for (let x = 0; x < 512; x += 3) g.fillRect(x, 0, 1, 288);
    for (let y = 0; y < 288; y += 3) g.fillRect(0, y, 512, 1);
  };
  draw();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  let alive = true;
  t.addEventListener("dispose", () => (alive = false));
  RACE.ready().then(() => {
    if (!alive) return;
    draw();
    t.needsUpdate = true;
  });
  return t;
}

/** All pavilions and their fan zones: one group per pavilion (for distance culling) plus the shared static meshes. */
export function buildPavilions(list: Landmark[], glows: Glows, animated: Animated[]) {
  const statics = new Batch();
  const groups: Group[] = [];
  const boards = new BoardAtlas();
  const at = (c: { x: number; z: number; ry: number }) => new Matrix4().makeRotationY(c.ry).setPosition(c.x, 0, c.z);
  /** A board standing in a claim's frame, facing its +z (the track). */
  const face = (c: { x: number; z: number; ry: number }, row: number, lx: number, y: number, lz: number, w: number, h: number) => {
    const p = toWorld(c, lx, lz);
    boards.upright(row, p.x, y, p.z, w, h, Math.sin(c.ry), Math.cos(c.ry));
  };

  list.forEach((l) => {
    const root = new Group();
    root.position.set(l.x, 0, l.z);
    root.rotation.y = l.heading;
    root.updateMatrixWorld(true);
    const [bg, fg] = ACCENT[l.id] ?? [C.ink, C.paper];
    const b = new Batch();
    // The plaza: stone paving with an ember inlay, a raised stage for the sculpture
    b.add(bevelBox(26, 0.22, 20, 0.05).translate(0, 0.11, 0), "#cfc7b6", 0.5);
    for (const [w, d, x, z] of [
      [26, 0.35, 0, 9.82],
      [26, 0.35, 0, -9.82],
      [0.35, 20, 12.82, 0],
      [0.35, 20, -12.82, 0],
    ])
      b.add(new BoxGeometry(w, 0.04, d).translate(x, 0.24, z), C.ember, 0.9);
    b.add(new CylinderGeometry(7.4, 7.6, 0.5, 40).translate(0, 0.47, -1.2), "#2a3440", 0.4);
    b.add(new CylinderGeometry(7.62, 7.62, 0.06, 40).translate(0, 0.73, -1.2), bg, 1.1);
    // Media wall behind, in the project's colour, with a light band across it
    b.add(bevelBox(22, 6.5, 0.6, 0.1).translate(0, 3.25, -9.2), "#1a1f27", 0.3);
    b.add(bevelBox(21, 5.2, 0.1, 0.03).translate(0, 3.4, -8.88), bg, 0.9);
    b.add(bevelBox(21, 0.18, 0.12, 0.03).translate(0, 1.0, -8.84), fg, 2.2);
    for (const s of [-1, 1]) b.add(bevelBox(4, 5.5, 0.5, 0.08).translate(s * 12.2, 2.75, -7.8).applyMatrix4(new Matrix4().makeRotationY(-s * 0.5)), "#1a1f27", 0.3);
    // The title gantry: two truss legs and a beam across the front, lights under it
    for (const s of [-1, 1]) {
      for (const [dx, dz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) b.add(new CylinderGeometry(0.05, 0.05, 6.8, 5).translate(s * 10.5 + dx, 3.4, 8.6 + dz), SILVER, 0.5);
      for (let y = 0.6; y < 6.6; y += 0.8) b.add(rod(new Vector3(s * 10.5 - 0.25, y, 8.35), new Vector3(s * 10.5 + 0.25, y + 0.8, 8.85), 0.025, 3), SILVER, 0.5);
      b.add(bevelBox(0.9, 0.2, 0.9).translate(s * 10.5, 0.32, 8.6), "#3a4048", 0.3);
    }
    b.add(bevelBox(21.6, 0.6, 0.6, 0.05).translate(0, 6.7, 8.6), SILVER, 0.5);
    b.add(bevelBox(14.4, 2.0, 0.22, 0.05).translate(0, 5.3, 8.6), "#0c0e12", 0.2);
    b.add(bevelBox(14.2, 0.1, 0.1, 0.02).translate(0, 4.2, 8.75), fg, 2.4);
    // Lighting masts at the back corners
    for (const s of [-1, 1]) {
      b.add(bevelBox(0.25, 8.5, 0.25, 0.04).translate(s * 12, 4.25, -6.5), "#5a6068", 0.3);
      b.add(bevelBox(1.4, 0.6, 0.4, 0.06).translate(s * 12, 8.4, -6.3).applyMatrix4(new Matrix4().makeRotationX(0.4)), "#2b3036", 0.2);
      b.add(bevelBox(1.2, 0.45, 0.05).translate(s * 12, 8.4, -6.08).applyMatrix4(new Matrix4().makeRotationX(0.4)), "#fff6e0", 2.6);
      const p = root.localToWorld(new Vector3(s * 12, 8.6, -6.0));
      glows.add(p.x, p.y, p.z, 4.5, "#fff3d6", 0.7);
    }
    // Feather flags at the front corners
    for (const s of [-1, 1]) {
      b.add(new CylinderGeometry(0.035, 0.035, 4.6, 5).translate(s * 12.4, 2.3, 7.4), "#9aa1a9", 0.4);
      b.add(new BoxGeometry(0.03, 3.4, 0.9).translate(s * 12.4, 2.8, 6.95), s > 0 ? bg : C.ember, 0.8);
    }
    statics.add(b.build().applyMatrix4(root.matrixWorld), "#ffffff");
    const title = boards.row({ text: l.title.toUpperCase(), bg, fg, accent: fg === C.paper ? C.ember : fg, cell: 0.5, size: 0.62, led: true });
    face({ x: l.x, z: l.z, ry: l.heading }, title, 0, 5.3, 8.73, 14, 1.75);
    // The board under the lights faces back as well, for the plaza
    {
      const p = toWorld({ x: l.x, z: l.z, ry: l.heading }, 0, 8.47);
      boards.upright(title, p.x, 5.3, p.z, 14, 1.75, -Math.sin(l.heading), -Math.cos(l.heading));
    }
    for (const x of [-5, 0, 5]) {
      const p = root.localToWorld(new Vector3(x, 4.1, 8.8));
      glows.add(p.x, p.y, p.z, 2.4, "#fff1d6", 0.5);
    }

    // The sculpture: static parts merge, live ones stay as they are
    const s = sculpture(l, animated);
    s.position.set(0, 0.76, -1.2);
    root.add(s);
    root.updateMatrixWorld(true);
    const keep: Object3D[] = [];
    s.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      let liveAncestor = false;
      for (let p: Object3D | null = m; p && p !== s; p = p.parent) if (p.userData.live) liveAncestor = true;
      if (liveAncestor) return;
      const mat = m.material as MeshStandardMaterial;
      const lit = mat.emissiveIntensity && mat.emissive?.getHex() ? 0.5 + mat.emissiveIntensity : 0.42;
      statics.add(m.geometry.clone().applyMatrix4(m.matrixWorld), "#" + mat.color.getHexString(), lit);
      keep.push(m);
    });
    for (const m of keep) m.removeFromParent();
    groups.push(root);
    glows.add(l.x, 9, l.z, 6, "#ffe9c8", 0.25);
  });

  /* ── the fan zones: promenade paving, kiosks, screens, gates, festoon lights ── */
  const pave = new Soup();
  const screens: { c: Claim }[] = [];
  const kioskNames = ["STREET FOOD", "PIT STOP CAFE", "MERCH", "COLD DRINKS"];
  const stripes = [C.ember, C.ink, C.sky, C.wine];
  fanZones.forEach((zn, zi) => {
    for (const p of zn.paving) {
      const corners = [toWorld(p, -p.hw, -p.hd), toWorld(p, p.hw, -p.hd), toWorld(p, p.hw, p.hd), toWorld(p, -p.hw, p.hd)];
      pave.quad(corners.map((q) => [q.x, 0.03, q.z] as [number, number, number]), "#a59f94", 0.55, undefined, undefined, [0, 1, 0]);
      // A kerb line along the fence side
      const e = [toWorld(p, -p.hw, p.hd - 0.25), toWorld(p, p.hw, p.hd - 0.25), toWorld(p, p.hw, p.hd), toWorld(p, -p.hw, p.hd)];
      pave.quad(e.map((q) => [q.x, 0.05, q.z] as [number, number, number]), C.ember, 0.8, undefined, undefined, [0, 1, 0]);
    }
    zn.kiosks.forEach((k, ki) => {
      const b = new Batch();
      const col = stripes[(ki + zi) % stripes.length];
      b.add(bevelBox(5.4, 2.4, 4.2, 0.08).translate(0, 1.2, -0.4), "#e9e4d8", 0.45);
      b.add(bevelBox(5.6, 0.9, 0.5, 0.05).translate(0, 1.0, 1.85), "#2b3036", 0.35);
      b.add(bevelBox(5.0, 1.0, 0.06, 0.02).translate(0, 1.95, 1.72), "#ffe2b0", 1.8);
      // A striped awning
      for (let k = 0; k < 6; k++) b.add(new BoxGeometry(1.0, 0.06, 2.0).translate(-2.5 + k + 0.5, 0, 0).applyMatrix4(new Matrix4().makeRotationX(0.28).setPosition(0, 3.0, 2.3)), k % 2 ? col : C.paper, 0.7);
      b.add(bevelBox(5.6, 0.5, 4.6, 0.06).translate(0, 2.65, -0.4), col, 0.6);
      statics.add(b.build().applyMatrix4(at(k)), "#ffffff");
      const row = boards.row({ text: kioskNames[ki % kioskNames.length], bg: col, fg: C.paper, cell: 0.5, size: 0.6 });
      face(k, row, 0, 2.65, 1.86, 4.4, 0.55);
      const q = toWorld(k, 0, 2.4);
      glows.add(q.x, 2.4, q.z, 3, "#ffd9a0", 0.45);
      // Tables in front
      for (const s of [-1.6, 1.6]) {
        const t = toWorld(k, s, 4.6);
        const tb = new Batch();
        tb.add(new CylinderGeometry(0.5, 0.5, 0.05, 12).translate(0, 1.05, 0), "#e9e4d8", 0.4);
        tb.add(new CylinderGeometry(0.04, 0.04, 1.05, 5).translate(0, 0.52, 0), "#4a4f57", 0.3);
        tb.add(new CylinderGeometry(0.02, 1.2, 0.35, 8).translate(0, 2.4, 0), s > 0 ? col : C.paper, 0.6);
        tb.add(new CylinderGeometry(0.025, 0.025, 1.4, 4).translate(0, 1.7, 0), "#4a4f57", 0.3);
        statics.add(tb.build().applyMatrix4(new Matrix4().makeTranslation(t.x, 0, t.z)), "#ffffff");
      }
    });
    for (const sc of zn.screens) {
      const b = new Batch();
      for (const s of [-1, 1]) b.add(bevelBox(0.5, 9.4, 0.5, 0.06).translate(s * 5.3, 4.7, -0.6), "#3a4048", 0.3);
      b.add(bevelBox(11.6, 6.8, 0.5, 0.08).translate(0, 5.6, -0.3), "#14171c", 0.2);
      b.add(bevelBox(11.8, 0.3, 0.7).translate(0, 9.2, -0.3), C.ember, 0.9);
      statics.add(b.build().applyMatrix4(at(sc)), "#ffffff");
      screens.push({ c: sc });
    }
    zn.gates.forEach((gt, gi) => {
      // Two pylons and a banner across the promenade, facing the traffic coming at it
      const b = new Batch();
      for (const s of [-1, 1]) b.add(bevelBox(0.7, 6.4, 0.7, 0.08).translate(0, 3.2, s * 2.9), "#20252c", 0.35);
      b.add(bevelBox(0.5, 1.4, 6.6, 0.06).translate(0, 5.8, 0), "#20252c", 0.35);
      statics.add(b.build().applyMatrix4(at(gt)), "#ffffff");
      const row = boards.row({ text: zn.name.toUpperCase(), bg: C.ink, fg: C.paper, accent: C.ember, cell: 0.5, led: true });
      // Its two faces look up and down the track (local ±x)
      for (const s of [-1, 1]) {
        const p = toWorld(gt, s * 0.27, 0);
        const fx = Math.cos(gt.ry) * s;
        const fz = -Math.sin(gt.ry) * s;
        boards.upright(row, p.x, 5.8, p.z, 5.4, 0.675, fx, fz);
      }
      void gi;
    });
    // Festoon lights strung between the promenade's lamp posts
    const posts = lanterns.filter((l) => l.group === zn.id);
    for (let k = 0; k < posts.length - 1; k++) {
      const a = posts[k];
      const c = posts[k + 1];
      const d = Math.hypot(c.x - a.x, c.z - a.z);
      if (d > 30) continue;
      const n = Math.max(4, Math.round(d / 2.2));
      for (let q = 1; q < n; q++) {
        const t = q / n;
        const y = 3.25 - Math.sin(Math.PI * t) * 0.9;
        glows.add(a.x + (c.x - a.x) * t, y, a.z + (c.z - a.z) * t, 0.9, q % 3 ? "#ffd69a" : "#ffb3a8", 0.85);
      }
    }
  });

  const staticMesh = new Mesh(statics.build(), worldMaterial({ flatShading: false }));
  staticMesh.name = "pavilions";
  const boardMesh = boards.build(1024, 64);
  boardMesh.name = "pavilion-boards";
  const extras: Object3D[] = [];
  {
    const m = new Mesh(pave.build(), worldMaterial({ polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    m.name = "promenades";
    extras.push(m);
  }
  if (screens.length) {
    const pos: number[] = [];
    const uv: number[] = [];
    for (const { c } of screens) {
      const P = (lx: number, y: number) => {
        const q = toWorld(c, lx, -0.03);
        return [q.x, y, q.z];
      };
      const [a, b, cc, d] = [P(-5.4, 2.6), P(5.4, 2.6), P(5.4, 8.67), P(-5.4, 8.67)];
      pos.push(...a, ...b, ...cc, ...a, ...cc, ...d);
      uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    g.computeBoundingSphere();
    const m = new Mesh(g, new MeshBasicMaterial({ map: screenTexture() }));
    m.name = "fan-screens";
    extras.push(m);
  }
  return { groups, staticMesh, boards: boardMesh, extras };
}
