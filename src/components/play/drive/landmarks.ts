import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import type { Glows } from "./glow";
import { Batch, C, rng, std, textTexture, worldMaterial } from "./kit";
import type { Landmark } from "./track";

// The project pavilions round the circuit: a lit plinth in the paddock
// style, a title board facing the track, and one sculpture per project (a
// petri dish for PathoScan, a camera for photography, a concert stage, a
// glowing PC…). Static parts of every pavilion merge into a single draw
// call; only the moving and see-through pieces stay separate.

export interface Animated {
  update: (t: number, dt: number) => void;
}

const SAND = "#e2c18a";
const TRUNK = "#8a5a3c";
const SILVER = "#c9ccd1";

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
      g.add(live(mesh(new CylinderGeometry(6.2, 6.4, 0.7, 40), std("#dfe9ea", { transparent: true, opacity: 0.85, roughness: 0.2 }), 0, 0.35)));
      g.add(mesh(new CylinderGeometry(5.7, 5.7, 0.5, 40), std("#f2d68a"), 0, 0.75));
      g.add(mesh(new TorusGeometry(6.1, 0.16, 8, 48), std("#ffffff"), 0, 1.2).rotateX(Math.PI / 2));
      const colonyColors = ["#5d7b3a", "#a8b54a", "#2e2e2e", "#d9c25a", "#7c8f3e"];
      for (let i = 0; i < 9; i++) {
        const a = r() * Math.PI * 2;
        const d = 1 + r() * 3.6;
        const s = 0.6 + r() * 1.1;
        const c = mesh(new SphereGeometry(s, 10, 8), std(colonyColors[i % colonyColors.length]), Math.cos(a) * d, 1, Math.sin(a) * d);
        c.scale.y = 0.35;
        g.add(c);
      }
      const scan = live(mesh(new TorusGeometry(5.9, 0.08, 6, 48), new MeshBasicMaterial({ color: "#7bd88f" }), 0, 1.4)) as Mesh;
      scan.rotateX(Math.PI / 2);
      g.add(scan);
      animated.push({ update: (t) => (scan.position.y = 1.4 + (Math.sin(t * 1.4) + 1) * 1.2) });
      break;
    }
    case "camera": {
      g.add(mesh(new BoxGeometry(6.4, 4, 3.6), std(C.ink), 0, 2.6));
      g.add(mesh(new BoxGeometry(2.2, 1, 2.4), std(C.ink), -1.6, 5));
      g.add(mesh(new CylinderGeometry(0.5, 0.5, 0.5, 16), std(C.ember), 2, 4.85, 0));
      g.add(mesh(new BoxGeometry(1.4, 0.8, 1), std(C.paper, { emissive: "#fff6e0", emissiveIntensity: 0.6 }), 1.6, 5.1, 0.6));
      const lens = live(new Group()) as Group;
      lens.add(mesh(new CylinderGeometry(1.9, 2.1, 2.6, 28), std("#1d1d1d"), 0, 0, 0).rotateX(Math.PI / 2));
      lens.add(mesh(new CylinderGeometry(1.35, 1.35, 0.2, 28), std(C.sky, { roughness: 0.1, metalness: 0.4 }), 0, 0, 1.35).rotateX(Math.PI / 2));
      lens.position.set(0, 2.6, 2.9);
      g.add(lens);
      animated.push({ update: (t) => (lens.position.z = 2.9 + Math.max(0, Math.sin(t * 0.8)) * 0.6) });
      break;
    }
    case "stage": {
      g.add(mesh(new BoxGeometry(14, 1.2, 8), std(C.ink), 0, 0.6));
      g.add(mesh(new BoxGeometry(12, 6, 0.4), std(C.wine, { emissive: C.wine, emissiveIntensity: 0.6 }), 0, 4.2, -3.6));
      for (const x of [-6.6, 6.6]) g.add(mesh(new BoxGeometry(0.4, 8, 0.4), std(SILVER), x, 4, 3.4));
      g.add(mesh(new BoxGeometry(13.6, 0.4, 0.4), std(SILVER), 0, 8, 3.4));
      const beams: Mesh[] = [];
      [C.ember, C.sky, "#ffd27a", C.ember].forEach((color, i) => {
        const beam = live(mesh(new ConeGeometry(1.2, 7, 16, 1, true), new MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false }), -4.5 + i * 3, 4.4, 3.4)) as Mesh;
        beams.push(beam);
        g.add(beam);
      });
      animated.push({ update: (t) => beams.forEach((b, i) => (b.rotation.z = Math.sin(t * 1.3 + i) * 0.45)) });
      break;
    }
    case "pc": {
      g.add(mesh(new BoxGeometry(3.4, 7.2, 6.4), std("#1b2740"), 0, 3.6));
      g.add(mesh(new BoxGeometry(0.1, 6.2, 5.4), std("#2f5bd3", { emissive: "#2f5bd3", emissiveIntensity: 0.9 }), 1.72, 3.6, 0));
      const fans: Mesh[] = [];
      [1.8, 3.9, 6].forEach((y) => {
        const fan = live(mesh(new TorusGeometry(0.9, 0.14, 8, 24), new MeshBasicMaterial({ color: "#7aa2ff" }), 0, y, 3.22)) as Mesh;
        fans.push(fan);
        g.add(fan);
      });
      animated.push({ update: (t) => fans.forEach((f, i) => (f.rotation.z = t * (3 + i))) });
      break;
    }
    case "memory": {
      const widths = [4.6, 3.2, 4, 2.4, 3.6];
      const colors = [C.ember, C.sky, C.ink, C.wine, SAND];
      widths.forEach((w, i) => g.add(mesh(new BoxGeometry(w, 1.2, 3), std(colors[i]), (r() - 0.5) * 0.8, 0.6 + i * 1.25, 0)));
      break;
    }
    case "shield": {
      const lock = live(new Group()) as Group;
      lock.add(mesh(new BoxGeometry(4, 3.4, 1.6), std(C.ember), 0, 0, 0));
      lock.add(mesh(new TorusGeometry(1.25, 0.35, 10, 24, Math.PI), std(SILVER, { metalness: 0.6, roughness: 0.3 }), 0, 1.7, 0));
      lock.add(mesh(new CylinderGeometry(0.35, 0.35, 0.3, 12), std(C.ink), 0, 0.2, 0.85).rotateX(Math.PI / 2));
      lock.position.y = 3.2;
      g.add(lock);
      g.add(mesh(new CylinderGeometry(2.4, 2.8, 0.8, 8), std(SAND), 0, 0.4));
      animated.push({ update: (t) => ((lock.rotation.y = t * 0.6), (lock.position.y = 3.2 + Math.sin(t * 1.6) * 0.3)) });
      break;
    }
    case "lab": {
      g.add(mesh(new CylinderGeometry(2.3, 2.6, 0.6, 24), std(C.ink), 0, 0.3));
      g.add(live(mesh(new CylinderGeometry(2, 2.2, 5, 24, 1, true), std("#dff3ff", { transparent: true, opacity: 0.35, roughness: 0.05 }), 0, 3.1, 0)));
      g.add(mesh(new CylinderGeometry(1.85, 2.05, 2.6, 24), std("#7bd88f", { emissive: "#2e8b57", emissiveIntensity: 1.2 }), 0, 1.9, 0));
      const bubbles = Array.from({ length: 6 }, (_, i) => live(mesh(new SphereGeometry(0.22 + (i % 3) * 0.08, 8, 6), new MeshBasicMaterial({ color: "#c8ffd6" }), (r() - 0.5) * 2, 1, (r() - 0.5) * 2)) as Mesh);
      bubbles.forEach((b) => g.add(b));
      animated.push({ update: (t) => bubbles.forEach((b, i) => (b.position.y = 0.9 + ((t * 0.8 + i * 0.37) % 1) * 4.6)) });
      break;
    }
    case "mailbox": {
      g.add(mesh(new BoxGeometry(0.45, 2.8, 0.45), std(TRUNK), 0, 1.4));
      g.add(mesh(new BoxGeometry(1.8, 1.3, 2.8), std(C.ember), 0, 3.3));
      g.add(mesh(new CylinderGeometry(0.9, 0.9, 2.8, 16, 1, false, 0, Math.PI), std(C.ember), 0, 3.95, 0).rotateZ(Math.PI / 2).rotateY(Math.PI / 2));
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
      g.add(mesh(new BoxGeometry(4.4, 1, 4.4), std(SAND), 0, 0.5));
      g.add(mesh(new BoxGeometry(1.6, 6.4, 1.6), std(C.paper), 0, 4.2));
      const ring = live(mesh(new TorusGeometry(2.2, 0.22, 10, 40), std(C.ember, { emissive: C.ember, emissiveIntensity: 0.5 }), 0, 8.8, 0)) as Mesh;
      g.add(ring);
      animated.push({ update: (t) => ((ring.rotation.y = t * 0.9), (ring.rotation.x = Math.sin(t * 0.7) * 0.4)) });
      break;
    }
  }
  return g;
}

/** All pavilions: returns one group per landmark (for distance culling) plus the shared static meshes. */
export function buildPavilions(list: Landmark[], glows: Glows, animated: Animated[]) {
  const statics = new Batch();
  const groups: Group[] = [];
  const board = textTexture(
    list.map((l, i) => ({ text: l.title.toUpperCase(), bg: i % 2 ? C.ink : C.ember, fg: C.paper, size: 0.5 })),
    512,
    64 * list.length,
  );
  const boardPos: number[] = [];
  const boardUv: number[] = [];
  list.forEach((l, k) => {
    const root = new Group();
    root.position.set(l.x, 0, l.z);
    root.rotation.y = l.heading;
    root.updateMatrixWorld(true);
    // Plinth with an ember edge, lit like the paddock
    const plinth = new Batch();
    plinth.add(new BoxGeometry(18, 0.6, 16).translate(0, 0.3, 0), "#e9e4d8", 0.55);
    plinth.add(new BoxGeometry(18.2, 0.2, 16.2).translate(0, 0.62, 0), C.ember, 0.9);
    // Board posts, in front, facing the track
    for (const x of [-4.6, 4.6]) plinth.add(new BoxGeometry(0.3, 3.6, 0.3).translate(x, 1.8, 9.5), "#6c7580", 0.3);
    plinth.add(new BoxGeometry(10, 1.9, 0.25).translate(0, 3.4, 9.4), "#1d1f24", 0.2);
    statics.add(plinth.build().applyMatrix4(root.matrixWorld), "#ffffff");

    // Board face (atlas row k), just in front of the board box
    const v0 = 1 - (k + 1) / list.length;
    const v1 = 1 - k / list.length;
    const corners = [
      [-4.8, 2.55],
      [4.8, 2.55],
      [4.8, 4.25],
      [-4.8, 4.25],
    ].map(([x, y]) => root.localToWorld(new Vector3(x, y, 9.54)));
    const [a, b, c, d] = corners;
    boardPos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
    boardUv.push(0, v0, 1, v0, 1, v1, 0, v0, 1, v1, 0, v1);

    // The sculpture: static parts merge, live ones stay as they are
    const s = sculpture(l, animated);
    s.position.y = 0.7;
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
      const lit = mat.emissiveIntensity && mat.emissive?.getHex() ? 0.5 + mat.emissiveIntensity : 0.35;
      statics.add(m.geometry.clone().applyMatrix4(m.matrixWorld), "#" + mat.color.getHexString(), lit);
      keep.push(m);
    });
    for (const m of keep) m.removeFromParent();
    groups.push(root);
    glows.add(l.x, 9, l.z, 6, "#ffe9c8", 0.35);
  });
  const staticMesh = new Mesh(statics.build(), worldMaterial({ flatShading: false }));
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(boardPos, 3));
  g.setAttribute("uv", new Float32BufferAttribute(boardUv, 2));
  g.computeBoundingSphere();
  const boards = new Mesh(g, new MeshBasicMaterial({ map: board }));
  return { groups, staticMesh, boards };
}
