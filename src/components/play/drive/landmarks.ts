import { BoxGeometry, type BufferGeometry, ConeGeometry, CylinderGeometry, Group, type Material, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry } from "three";
import { std } from "./jeepney";
import { heightAt } from "./terrain";
import type { Landmark } from "./world";

// One small sculpture per project: a petri dish for PathoScan, a camera for
// photography, a concert stage, a glowing PC, and so on.

const C = {
  paper: "#fdf0d5",
  sandDark: "#e2c18a",
  ink: "#003049",
  wine: "#780000",
  ember: "#c1121f",
  sky: "#669bbc",
  trunk: "#8a5a3c",
  silver: "#c9ccd1",
};

export interface Animated {
  update: (t: number, dt: number) => void;
}

/** Tiny seeded RNG so the island looks the same on every visit. */
export function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function mesh(geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

export function buildLandmark(l: Landmark, animated: Animated[]): Group {
  const g = new Group();
  const r = rng(l.x * 31 + l.z * 7 + 99);
  switch (l.kind) {
    case "petri": {
      g.add(mesh(new CylinderGeometry(6.2, 6.4, 0.7, 48), std("#dfe9ea", { transparent: true, opacity: 0.85, roughness: 0.2 }), 0, 0.35));
      g.add(mesh(new CylinderGeometry(5.7, 5.7, 0.5, 48), std("#f2d68a"), 0, 0.75));
      g.add(mesh(new TorusGeometry(6.1, 0.16, 8, 64), std("#ffffff", { roughness: 0.1 }), 0, 1.2).rotateX(Math.PI / 2));
      const colonyColors = ["#5d7b3a", "#a8b54a", "#2e2e2e", "#d9c25a", "#7c8f3e"];
      for (let i = 0; i < 9; i++) {
        const a = r() * Math.PI * 2;
        const d = 1 + r() * 3.6;
        const s = 0.6 + r() * 1.1;
        const c = mesh(new SphereGeometry(s, 10, 8), std(colonyColors[i % colonyColors.length]), Math.cos(a) * d, 1, Math.sin(a) * d);
        c.scale.y = 0.35;
        g.add(c);
      }
      // A scanning ring sweeps over the dish.
      const scan = mesh(new TorusGeometry(5.9, 0.08, 6, 64), new MeshStandardMaterial({ color: "#7bd88f", emissive: "#2e8b57", emissiveIntensity: 1.5 }), 0, 1.4, 0, false);
      scan.rotateX(Math.PI / 2);
      g.add(scan);
      animated.push({ update: (t) => (scan.position.y = 1.4 + (Math.sin(t * 1.4) + 1) * 1.2) });
      break;
    }
    case "camera": {
      g.add(mesh(new BoxGeometry(6.4, 4, 3.6), std(C.ink), 0, 2.6));
      g.add(mesh(new BoxGeometry(2.2, 1, 2.4), std(C.ink), -1.6, 5));
      g.add(mesh(new CylinderGeometry(0.5, 0.5, 0.5, 16), std(C.ember), 2, 4.85, 0));
      g.add(mesh(new BoxGeometry(1.4, 0.8, 1), std(C.paper, { emissive: "#fff6e0", emissiveIntensity: 0.4 }), 1.6, 5.1, 0.6));
      const lens = new Group();
      lens.add(mesh(new CylinderGeometry(1.9, 2.1, 2.6, 32), std("#1d1d1d"), 0, 0, 0).rotateX(Math.PI / 2));
      lens.add(mesh(new CylinderGeometry(1.35, 1.35, 0.2, 32), std(C.sky, { roughness: 0.1, metalness: 0.4 }), 0, 0, 1.35).rotateX(Math.PI / 2));
      lens.position.set(0, 2.6, 2.9);
      g.add(lens);
      animated.push({ update: (t) => (lens.position.z = 2.9 + Math.max(0, Math.sin(t * 0.8)) * 0.6) });
      break;
    }
    case "stage": {
      g.add(mesh(new BoxGeometry(14, 1.2, 8), std(C.ink), 0, 0.6));
      g.add(mesh(new BoxGeometry(12, 6, 0.4), std(C.wine, { emissive: C.wine, emissiveIntensity: 0.35 }), 0, 4.2, -3.6));
      for (const x of [-6.6, 6.6]) g.add(mesh(new BoxGeometry(0.4, 8, 0.4), std(C.silver, { metalness: 0.5 }), x, 4, 3.4));
      g.add(mesh(new BoxGeometry(13.6, 0.4, 0.4), std(C.silver, { metalness: 0.5 }), 0, 8, 3.4));
      const beams: Mesh[] = [];
      [C.ember, C.sky, "#ffd27a", C.ember].forEach((color, i) => {
        const beam = mesh(new ConeGeometry(1.2, 7, 16, 1, true), new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, transparent: true, opacity: 0.28, depthWrite: false }), -4.5 + i * 3, 4.4, 3.4, false);
        beams.push(beam);
        g.add(beam);
      });
      animated.push({ update: (t) => beams.forEach((b, i) => (b.rotation.z = Math.sin(t * 1.3 + i) * 0.45)) });
      break;
    }
    case "pc": {
      g.add(mesh(new BoxGeometry(3.4, 7.2, 6.4), std("#1b2740"), 0, 3.6));
      g.add(mesh(new BoxGeometry(0.1, 6.2, 5.4), std("#2f5bd3", { emissive: "#2f5bd3", emissiveIntensity: 0.7, transparent: true, opacity: 0.85 }), 1.72, 3.6, 0));
      const fans: Mesh[] = [];
      [1.8, 3.9, 6].forEach((y) => {
        const fan = mesh(new TorusGeometry(0.9, 0.14, 8, 24), new MeshStandardMaterial({ color: "#7aa2ff", emissive: "#3b6cff", emissiveIntensity: 1.6 }), 0, y, 3.22, false);
        fans.push(fan);
        g.add(fan);
      });
      animated.push({ update: (t) => fans.forEach((f, i) => (f.rotation.z = t * (3 + i))) });
      break;
    }
    case "memory": {
      const widths = [4.6, 3.2, 4, 2.4, 3.6];
      const colors = [C.ember, C.sky, C.ink, C.wine, C.sandDark];
      widths.forEach((w, i) => g.add(mesh(new BoxGeometry(w, 1.2, 3), std(colors[i]), (r() - 0.5) * 0.8, 0.6 + i * 1.25, 0)));
      break;
    }
    case "shield": {
      const lock = new Group();
      lock.add(mesh(new BoxGeometry(4, 3.4, 1.6), std(C.ember), 0, 0, 0));
      lock.add(mesh(new TorusGeometry(1.25, 0.35, 10, 24, Math.PI), std(C.silver, { metalness: 0.6, roughness: 0.3 }), 0, 1.7, 0));
      lock.add(mesh(new CylinderGeometry(0.35, 0.35, 0.3, 12), std(C.ink), 0, 0.2, 0.85).rotateX(Math.PI / 2));
      lock.position.y = 3.2;
      g.add(lock);
      g.add(mesh(new CylinderGeometry(2.4, 2.8, 0.8, 8), std(C.sandDark), 0, 0.4));
      animated.push({ update: (t) => ((lock.rotation.y = t * 0.6), (lock.position.y = 3.2 + Math.sin(t * 1.6) * 0.3)) });
      break;
    }
    case "lab": {
      g.add(mesh(new CylinderGeometry(2.3, 2.6, 0.6, 24), std(C.ink), 0, 0.3));
      g.add(mesh(new CylinderGeometry(2, 2.2, 5, 24, 1, true), std("#dff3ff", { transparent: true, opacity: 0.35, roughness: 0.05 }), 0, 3.1, 0, false));
      g.add(mesh(new CylinderGeometry(1.85, 2.05, 2.6, 24), new MeshStandardMaterial({ color: "#7bd88f", emissive: "#2e8b57", emissiveIntensity: 0.9 }), 0, 1.9, 0, false));
      const bubbles = Array.from({ length: 6 }, (_, i) => mesh(new SphereGeometry(0.22 + (i % 3) * 0.08, 8, 6), new MeshStandardMaterial({ color: "#c8ffd6", emissive: "#7bd88f", emissiveIntensity: 1 }), (r() - 0.5) * 2, 1, (r() - 0.5) * 2, false));
      bubbles.forEach((b) => g.add(b));
      animated.push({ update: (t) => bubbles.forEach((b, i) => (b.position.y = 0.9 + ((t * 0.8 + i * 0.37) % 1) * 4.6)) });
      break;
    }
    case "mailbox": {
      g.add(mesh(new BoxGeometry(0.45, 2.8, 0.45), std(C.trunk), 0, 1.4));
      g.add(mesh(new BoxGeometry(1.8, 1.3, 2.8), std(C.ember), 0, 3.3));
      g.add(mesh(new CylinderGeometry(0.9, 0.9, 2.8, 16, 1, false, 0, Math.PI), std(C.ember), 0, 3.95, 0).rotateZ(Math.PI / 2).rotateY(Math.PI / 2));
      const flag = new Group();
      flag.add(mesh(new BoxGeometry(0.12, 1.6, 0.12), std(C.ink), 0, 0.8, 0));
      flag.add(mesh(new BoxGeometry(0.1, 0.6, 0.8), std(C.ink), 0, 1.3, 0.4));
      flag.position.set(1, 3, 0.6);
      g.add(flag);
      animated.push({ update: (t) => (flag.rotation.x = -0.4 + Math.sin(t * 2.2) * 0.35) });
      break;
    }
    case "monument": {
      g.add(mesh(new BoxGeometry(4.4, 1, 4.4), std(C.sandDark), 0, 0.5));
      g.add(mesh(new BoxGeometry(1.6, 6.4, 1.6), std(C.paper), 0, 4.2));
      const ring = mesh(new TorusGeometry(2.2, 0.22, 10, 40), std(C.ember, { emissive: C.ember, emissiveIntensity: 0.3 }), 0, 8.8, 0);
      g.add(ring);
      animated.push({ update: (t) => ((ring.rotation.y = t * 0.9), (ring.rotation.x = Math.sin(t * 0.7) * 0.4)) });
      break;
    }
    default:
      break;
  }
  g.position.set(l.x, heightAt(l.x, l.z), l.z);
  // Face the plaza, so every landmark shows its best side to the road.
  g.lookAt(0, g.position.y, 0);
  return g;
}

