import { AdditiveBlending, BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SphereGeometry, type Scene } from "three";
import { part, signTexture, std } from "./jeepney";
import type { Static } from "./nature";
import { heightAt } from "./terrain";
import { landmarks, lamps, ramps, ROAD_RADIUS, type Landmark } from "./world";

// Pasada: the jeepney's real job. A passenger waits at a roadside stop; pull
// up beside them (slowly) and they hop on, then name a landmark. A beacon and
// an arrow over the roof lead the way; stop inside the landmark's zone and
// they get off ("Para po!") and pay the fare. It doubles as a guided tour of
// the projects.

export interface Stop {
  name: string;
  x: number;
  z: number;
}

const STOP_R = ROAD_RADIUS + 5.6;

/** Roadside stops, kept clear of landmarks, ramps and lamps. */
export const stops: Stop[] = (() => {
  const out: Stop[] = [];
  for (let i = 0; i < 12; i++) {
    const a = ((i * 30 + 15) * Math.PI) / 180;
    const x = Math.cos(a) * STOP_R;
    const z = Math.sin(a) * STOP_R;
    if (landmarks.some((l) => Math.hypot(l.x - x, l.z - z) < l.radius + 5)) continue;
    if (ramps.some((r) => Math.hypot(r.x - x, r.z - z) < 11)) continue;
    if (lamps.some(([lx, lz]) => Math.hypot(lx - x, lz - z) < 3.5)) continue;
    out.push({ name: `Stop ${String.fromCharCode(65 + out.length)}`, x, z });
  }
  return out;
})();

export type PasadaPhase = "off" | "pickup" | "ride";

export interface PasadaStatus {
  phase: PasadaPhase;
  /** Where to go next: a stop name or a landmark title. */
  target: string;
  distance: number;
  /** Direction to the target relative to the jeepney's nose, radians (0 = straight ahead, + = to the right). */
  bearing: number;
  fares: number;
  delivered: number;
  destination: Landmark | null;
}

export interface PasadaEvent {
  boarded?: Stop;
  delivered?: { landmark: Landmark; fare: number };
}

const SHIRTS = ["#c1121f", "#669bbc", "#ffd27a", "#fdf0d5", "#780000", "#2e8b57"];

function fadeTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 128);
  return new CanvasTexture(c);
}

export function createPasada(scene: Scene, statics: Static[], rand: () => number) {
  // Waiting sheds with a "PARA" sign at every stop
  const post = new CylinderGeometry(0.07, 0.07, 2.6, 6);
  const roofMat = std("#c1121f", { roughness: 0.6 });
  const postMat = std("#003049");
  const benchMat = std("#8a5a3c");
  const sign = new MeshStandardMaterial({ map: signTexture("PARA", "#fdf0d5", "#003049", 256, 96), roughness: 0.6 });
  for (const s of stops) {
    const g = new Group();
    for (const [x, z] of [
      [-1.3, -0.5],
      [1.3, -0.5],
      [-1.3, 0.6],
      [1.3, 0.6],
    ])
      g.add(part(post, postMat, x, 1.3, z));
    g.add(part(new BoxGeometry(3.1, 0.12, 1.7), roofMat, 0, 2.62, 0.05));
    g.add(part(new BoxGeometry(2.4, 0.12, 0.45), benchMat, 0, 0.55, 0.35));
    const plate = part(new PlaneGeometry(0.9, 0.34), sign, 1.6, 2.1, -0.6, false);
    g.add(part(new CylinderGeometry(0.04, 0.04, 2.2, 6), postMat, 1.6, 1.1, -0.62));
    g.add(plate);
    g.position.set(s.x, heightAt(s.x, s.z), s.z);
    g.lookAt(0, g.position.y, 0); // open side faces the road
    scene.add(g);
    statics.push({ x: s.x, z: s.z, r: 1.4 });
  }

  // The passenger: a little figure that hails the jeepney
  const passenger = new Group();
  const shirt = std(SHIRTS[0]);
  passenger.add(part(new BoxGeometry(0.34, 0.75, 0.24), std("#1f2a3a"), 0, 0.38, 0));
  passenger.add(part(new CylinderGeometry(0.24, 0.28, 0.75, 8), shirt, 0, 1.12, 0));
  passenger.add(part(new SphereGeometry(0.2, 10, 8), std("#c99f78"), 0, 1.7, 0));
  passenger.add(part(new SphereGeometry(0.21, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), std("#1a1a1a"), 0, 1.74, 0));
  const arm = new Group();
  arm.add(part(new BoxGeometry(0.1, 0.62, 0.1), shirt, 0, 0.31, 0));
  arm.position.set(0.3, 1.4, 0);
  passenger.add(arm);
  passenger.visible = false;
  scene.add(passenger);

  // A beacon of light at the target, and a guide arrow over the jeepney's roof
  const beaconMat = new MeshBasicMaterial({ color: "#669bbc", map: fadeTexture(), transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
  const beacon = new Mesh(new CylinderGeometry(1.6, 1.6, 46, 24, 1, true), beaconMat);
  beacon.renderOrder = 3;
  beacon.visible = false;
  scene.add(beacon);
  const arrow = new Mesh(new ConeGeometry(0.4, 1.15, 4).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: "#ffd27a", emissive: "#ffb347", emissiveIntensity: 0.9, flatShading: true }));
  arrow.visible = false;
  scene.add(arrow);

  const st = {
    phase: "off" as PasadaPhase,
    stop: stops[0],
    dest: null as Landmark | null,
    fares: 0,
    delivered: 0,
    ride: 0,
    lastX: 0,
    lastZ: 0,
  };

  const placeAtStop = (avoid?: Stop) => {
    const options = stops.filter((s) => s !== avoid);
    st.stop = options[Math.floor(rand() * options.length)] ?? stops[0];
    shirt.color.set(SHIRTS[Math.floor(rand() * SHIRTS.length)]);
    // Stand at the kerb side of the shed, facing the road
    const k = (STOP_R - 2.4) / STOP_R;
    passenger.position.set(st.stop.x * k, heightAt(st.stop.x * k, st.stop.z * k), st.stop.z * k);
    passenger.lookAt(0, passenger.position.y, 0);
    passenger.visible = true;
    st.phase = "pickup";
  };

  const target = () => (st.phase === "ride" && st.dest ? { x: st.dest.x, z: st.dest.z, name: st.dest.title } : { x: st.stop.x, z: st.stop.z, name: st.stop.name });

  return {
    setActive(on: boolean) {
      if (on && st.phase === "off") placeAtStop();
      if (!on) {
        st.phase = "off";
        st.dest = null;
        passenger.visible = beacon.visible = arrow.visible = false;
      }
    },
    reset() {
      st.fares = st.delivered = 0;
    },
    /** Per frame while driving. Returns what just happened, if anything. */
    update(t: number, car: { x: number; y: number; z: number; heading: number; speed: number; air: boolean }): PasadaEvent | null {
      if (st.phase === "off") return null;
      let event: PasadaEvent | null = null;
      const slow = Math.abs(car.speed) < 3.6 && !car.air;

      if (st.phase === "pickup") {
        const near = Math.hypot(passenger.position.x - car.x, passenger.position.z - car.z);
        // Wave harder as the jeepney gets close
        arm.rotation.z = -2.6 + Math.sin(t * (near < 25 ? 10 : 3)) * (near < 25 ? 0.45 : 0.15);
        if (near < 5.5 && slow) {
          passenger.visible = false;
          const options = landmarks.filter((l) => Math.hypot(l.x - car.x, l.z - car.z) > 30);
          st.dest = options[Math.floor(rand() * options.length)] ?? landmarks[0];
          st.phase = "ride";
          st.ride = 0;
          st.lastX = car.x;
          st.lastZ = car.z;
          event = { boarded: st.stop };
        }
      } else if (st.phase === "ride" && st.dest) {
        st.ride += Math.hypot(car.x - st.lastX, car.z - st.lastZ);
        st.lastX = car.x;
        st.lastZ = car.z;
        if (Math.hypot(st.dest.x - car.x, st.dest.z - car.z) < st.dest.zone && slow) {
          // Minimum fare plus a little per distance travelled
          const fare = 13 + Math.round(st.ride / 45);
          st.fares += fare;
          st.delivered++;
          event = { delivered: { landmark: st.dest, fare } };
          const from = stops.reduce((a, b) => (Math.hypot(a.x - car.x, a.z - car.z) < Math.hypot(b.x - car.x, b.z - car.z) ? a : b));
          st.dest = null;
          placeAtStop(from);
        }
      }

      // Beacon on the target, arrow over the roof pointing at it
      const tg = target();
      beacon.visible = arrow.visible = true;
      beaconMat.color.set(st.phase === "ride" ? "#ffb347" : "#669bbc");
      beacon.position.set(tg.x, heightAt(tg.x, tg.z) + 23, tg.z);
      beacon.scale.setScalar(1 + Math.sin(t * 2.4) * 0.06);
      const dx = tg.x - car.x;
      const dz = tg.z - car.z;
      arrow.position.set(car.x, car.y + 4.4 + Math.sin(t * 3) * 0.15, car.z);
      arrow.rotation.y = Math.atan2(-dx, -dz);
      arrow.visible = Math.hypot(dx, dz) > 9;
      return event;
    },
    status(car: { x: number; z: number; heading: number }): PasadaStatus {
      const tg = target();
      const dx = tg.x - car.x;
      const dz = tg.z - car.z;
      // Heading of the target from the jeepney, measured like the jeepney's own heading
      const towards = Math.atan2(-dx, -dz);
      const rel = Math.atan2(Math.sin(car.heading - towards), Math.cos(car.heading - towards));
      return { phase: st.phase, target: tg.name, distance: Math.hypot(dx, dz), bearing: rel, fares: st.fares, delivered: st.delivered, destination: st.dest };
    },
  };
}

export type Pasada = ReturnType<typeof createPasada>;
