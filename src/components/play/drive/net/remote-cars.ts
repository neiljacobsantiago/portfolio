import { CanvasTexture, type Material, Mesh, MeshBasicMaterial, type PerspectiveCamera, PlaneGeometry, type Scene, Vector3 } from "three";
import { buildCar, CAR, type Car, PAINTS, type PaintId } from "../car";
import { BUFFER_MS, createBuffer, type Pose } from "./interp";
import { type CarState, FLAG } from "./protocol";

// The other players' cars: a low-detail build of the same car in each
// player's paint, moved from interpolated snapshots, with a floating name tag
// and a dot on the minimap. Cars don't collide; when one drives through yours
// it turns see-through so neither hides the other.

export interface RemoteFrame {
  dt: number;
  /** Seconds, for the car's own animation. */
  t: number;
  camera: PerspectiveCamera;
  width: number;
  height: number;
  /** Where your own car is drawn. */
  me: { x: number; z: number };
  /** 1 at night, 0 by day. */
  night: number;
}

/** What the engine needs from a multiplayer layer: it owns the scene, the layer owns its cars. */
export interface RemoteLayer {
  mount: (scene: Scene) => void;
  frame: (f: RemoteFrame) => void;
  minimap: (g: CanvasRenderingContext2D, X: (x: number) => number, Z: (z: number) => number) => void;
  unmount: () => void;
}

interface Remote {
  slot: number;
  name: string;
  paint: PaintId;
  car: Car | null;
  buffer: ReturnType<typeof createBuffer>;
  pose: Pose;
  shown: boolean;
  flags: number;
  seen: number;
  opacity: number;
  label: HTMLElement;
  text: HTMLElement;
  honkUntil: number;
}

/** Drop a car from view if we've heard nothing from it for this long (ms). */
const STALE = 3000;

export function createRemoteCars(opts: { labels: HTMLElement; clock: () => number }) {
  const remotes = new Map<number, Remote>();
  let scene: Scene | null = null;
  const blobGeo = new PlaneGeometry(2.4, 6);
  const blobMat = (() => {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 64;
    const g = c.getContext("2d");
    if (g) {
      const grad = g.createRadialGradient(16, 32, 2, 16, 32, 31);
      grad.addColorStop(0, "rgba(0,0,0,0.7)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 32, 64);
    }
    return new MeshBasicMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.7 });
  })();

  const build = (r: Remote) => {
    if (!scene || r.car) return;
    const car = buildCar({ shadows: false, detail: 0.3 });
    car.paint(r.paint);
    const blob = new Mesh(blobGeo, blobMat);
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.05;
    blob.renderOrder = 1;
    car.car.add(blob);
    car.car.visible = false;
    car.car.traverse((o) => {
      const m = (o as Mesh).material as Material | Material[] | undefined;
      for (const x of Array.isArray(m) ? m : m ? [m] : []) if (x !== blobMat) x.userData.baseTransparent = x.transparent;
    });
    scene.add(car.car);
    r.car = car;
  };

  const destroy = (r: Remote) => {
    if (r.car) {
      r.car.car.removeFromParent();
      r.car.car.traverse((o) => {
        const m = o as Mesh;
        if (m.geometry && m.geometry !== blobGeo) m.geometry.dispose();
        const mat = m.material as Material | Material[] | undefined;
        for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) {
          if (x === blobMat) continue;
          (x as MeshBasicMaterial).map?.dispose();
          x.dispose();
        }
      });
      r.car = null;
    }
  };

  const setOpacity = (r: Remote, a: number) => {
    if (!r.car || Math.abs(a - r.opacity) < 0.01) return;
    r.opacity = a;
    r.car.car.traverse((o) => {
      const m = (o as Mesh).material as Material | Material[] | undefined;
      for (const x of Array.isArray(m) ? m : m ? [m] : []) {
        if (x === blobMat) continue;
        const see = a < 0.99;
        if (x.transparent !== (see || x.userData.baseTransparent)) {
          x.transparent = see || !!x.userData.baseTransparent;
          x.needsUpdate = true;
        }
        x.opacity = a;
        x.depthWrite = !see;
      }
    });
  };

  const tag = (name: string, paint: PaintId) => {
    const el = document.createElement("div");
    el.className = "absolute top-0 left-0 opacity-0 transition-opacity duration-200 will-change-transform";
    el.setAttribute("aria-hidden", "true");
    const pill = document.createElement("span");
    pill.className =
      "race-cap flex items-center gap-1.5 bg-[#06121c]/85 py-1 pr-2 pl-1 leading-none whitespace-nowrap text-paper shadow-lg ring-1 ring-paper/15 transition-transform duration-150 data-[honk=true]:scale-125 data-[honk=true]:bg-ember";
    const dot = document.createElement("span");
    dot.className = "h-3 w-1 shrink-0";
    dot.style.background = PAINTS[paint].primary;
    const text = document.createElement("span");
    // A nickname is only ever text
    text.textContent = name;
    pill.append(dot, text);
    el.append(pill);
    opts.labels.append(el);
    return { el, text, dot, pill };
  };

  const v = new Vector3();

  const layer: RemoteLayer = {
    mount(s) {
      scene = s;
      for (const r of remotes.values()) build(r);
    },
    unmount() {
      for (const r of remotes.values()) destroy(r);
      scene = null;
    },
    frame(f) {
      const now = opts.clock();
      const renderAt = now - BUFFER_MS;
      f.camera.updateMatrixWorld();
      for (const r of remotes.values()) {
        if (!r.car) build(r);
        const car = r.car;
        const live = r.buffer.size > 0 && performance.now() - r.seen < STALE && (r.flags & FLAG.driving) !== 0;
        r.shown = live && r.buffer.sample(renderAt, r.pose);
        if (!car) continue;
        car.car.visible = r.shown;
        if (!r.shown) {
          r.label.style.opacity = "0";
          continue;
        }
        const p = r.pose;
        car.car.position.set(p.x, 0, p.z);
        car.car.rotation.set(0, p.heading, 0);
        car.wheels.forEach((w) => (w.rotation.x -= (p.speed * f.dt) / CAR.wheelR));
        car.steerers.forEach((s) => (s.rotation.y = -p.steer * (0.44 / (1 + Math.abs(p.speed) / 21))));
        car.animate(f.t, { drs: r.flags & FLAG.drs ? 1 : 0, flash: (r.flags & FLAG.pit) !== 0, braking: (r.flags & FLAG.braking) !== 0, night: f.night });
        // Overlapping your car: see-through
        const gap = Math.hypot(p.x - f.me.x, p.z - f.me.z);
        setOpacity(r, gap < 4 ? 0.3 : gap < 8 ? 0.3 + ((gap - 4) / 4) * 0.7 : 1);

        // Name tag above the car
        v.set(p.x, 2.1, p.z).project(f.camera);
        const dist = f.camera.position.distanceTo(car.car.position);
        const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && dist < 600;
        r.label.style.opacity = on ? String(Math.max(0.35, Math.min(1, (600 - dist) / 150))) : "0";
        if (on) r.label.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * f.width}px, ${((1 - v.y) / 2) * f.height}px)`;
        const honk = performance.now() < r.honkUntil;
        if ((r.label.firstElementChild as HTMLElement).dataset.honk !== String(honk)) (r.label.firstElementChild as HTMLElement).dataset.honk = String(honk);
      }
    },
    minimap(g, X, Z) {
      for (const r of remotes.values()) {
        if (!r.shown) continue;
        g.fillStyle = PAINTS[r.paint].primary;
        g.strokeStyle = "#fdf0d5";
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(X(r.pose.x), Z(r.pose.z), 4, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
    },
  };

  return {
    layer,
    /** Adds or updates a player (name and paint). */
    set(slot: number, name: string, paint: PaintId) {
      const r = remotes.get(slot);
      if (!r) {
        const t = tag(name, paint);
        const next: Remote = { slot, name, paint, car: null, buffer: createBuffer(), pose: { x: 0, z: 0, heading: 0, speed: 0, steer: 0 }, shown: false, flags: 0, seen: 0, opacity: 1, label: t.el, text: t.text, honkUntil: 0 };
        remotes.set(slot, next);
        build(next);
        return;
      }
      if (r.name !== name) {
        r.name = name;
        r.text.textContent = name;
      }
      if (r.paint !== paint) {
        r.paint = paint;
        r.car?.paint(paint);
        const dot = r.label.querySelector<HTMLElement>("span > span");
        if (dot) dot.style.background = PAINTS[paint].primary;
      }
    },
    remove(slot: number) {
      const r = remotes.get(slot);
      if (!r) return;
      destroy(r);
      r.label.remove();
      remotes.delete(slot);
    },
    has: (slot: number) => remotes.has(slot),
    slots: () => [...remotes.keys()],
    /** A state packet from the network. */
    push(s: CarState) {
      const r = remotes.get(s.slot);
      if (!r) return;
      r.flags = s.flags;
      r.seen = performance.now();
      r.buffer.push({ t: s.t, x: s.x, z: s.z, heading: s.heading, speed: s.speed, steer: s.steer });
    },
    /** Forget positions (a new session starts everyone somewhere else). */
    reset() {
      for (const r of remotes.values()) {
        r.buffer.clear();
        r.shown = false;
        r.flags = 0;
      }
    },
    honk(slot: number) {
      const r = remotes.get(slot);
      if (r) r.honkUntil = performance.now() + 600;
    },
    /** Where a remote car is drawn, if it is. */
    pose(slot: number): Pose | null {
      const r = remotes.get(slot);
      return r?.shown ? r.pose : null;
    },
    dispose() {
      for (const slot of [...remotes.keys()]) this.remove(slot);
      blobGeo.dispose();
      blobMat.map?.dispose();
      blobMat.dispose();
    },
  };
}
export type RemoteCars = ReturnType<typeof createRemoteCars>;
