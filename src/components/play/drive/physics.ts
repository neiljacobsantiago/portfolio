import { Body, Box, type ContactEquation, ContactMaterial, Cylinder, GSSolver, Heightfield, Material as PhysMaterial, Quaternion as PhysQuat, SAPBroadphase, Sphere, Vec3, World } from "cannon-es";
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DynamicDrawUsage,
  Float32BufferAttribute,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  type Mesh,
  MeshStandardMaterial,
  type BufferGeometry,
  Quaternion,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type Scene,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { part } from "./jeepney";
import type { Static } from "./nature";
import type { StaticBox } from "./places";
import { heightAt, SEA_LEVEL } from "./terrain";
import { CRATE, ISLAND_RADIUS, type PropKind, props as propSpots, racks as rackSpots } from "./world";

// Real rigid bodies (cannon-es) for everything you can knock over: bowling
// pins, slalom cones, crate stacks, oil drums and beach balls. The jeepney is
// a kinematic box the engine moves every step, so it shoves bodies around
// without being pushed back. Props sleep until something hits them, are
// drawn as one InstancedMesh per kind, and quietly put themselves back
// (a pinsetter for the bowling racks, a respawn out of sight for the rest)
// so the island never ends up empty.

export const FIXED = 1 / 60;

/** Where each kind's body origin (its centre of mass) sits above the ground, and how heavy it is. */
const SPEC: Record<PropKind, { lift: number; mass: number }> = {
  pin: { lift: 0.6, mass: 1.5 },
  cone: { lift: 0.45, mass: 0.8 },
  crate: { lift: CRATE / 2, mass: 2.2 },
  drum: { lift: 0.66, mass: 3.4 },
  ball: { lift: 1.1, mass: 1.6 },
};

/** How long a knocked-over prop waits, out of sight, before it's put back. */
const RESPAWN_AFTER = 8;
const PINSETTER_AFTER = 2.6;

interface Prop {
  kind: PropKind;
  body: Body;
  mesh: InstancedMesh | Mesh;
  index: number;
  start: Vec3;
  startQ: PhysQuat;
  rack: number;
  group: number;
  /** Seconds it has been displaced and out of view. */
  away: number;
  /** Respawn grow-in, 0 → 1. */
  pop: number;
  /** Matrix is current and the body sleeps: nothing to do. */
  still: boolean;
  down: boolean;
}

export interface Rack {
  name: string;
  x: number;
  z: number;
  pins: Prop[];
  down: number;
  total: number;
  /** A result (strike or count) was reported for this rack. */
  reported: boolean;
  firstDown: number;
  timer: number;
}

function crateTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#c08a55";
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#a9733f";
  for (let i = 0; i < 4; i++) g.fillRect(0, 8 + i * 30, 128, 3);
  g.strokeStyle = "#7a4f2a";
  g.lineWidth = 12;
  g.strokeRect(6, 6, 116, 116);
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(10, 10);
  g.lineTo(118, 118);
  g.stroke();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function beachBallTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  ["#c1121f", "#fdf0d5", "#669bbc", "#fdf0d5", "#ffd27a", "#fdf0d5"].forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect((i * 256) / 6, 0, 256 / 6 + 1, 64);
  });
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Colours each triangle by where its centre sits, so painted bands stay crisp. */
function paintBands(geo: BufferGeometry, colorAt: (y: number) => string) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c = new Color();
  for (let i = 0; i < p.count; i += 3) {
    c.set(colorAt((p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3));
    for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
  }
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  return g;
}

/** A bowling pin, lathed from a profile, with two red neck stripes. Origin at its centre of mass. */
function pinGeometry() {
  const profile = [
    [0, 0],
    [0.2, 0],
    [0.27, 0.15],
    [0.32, 0.45],
    [0.3, 0.7],
    [0.22, 0.95],
    [0.15, 1.1],
    [0.13, 1.18],
    [0.13, 1.24],
    [0.14, 1.3],
    [0.19, 1.45],
    [0.18, 1.58],
    [0.1, 1.68],
    [0, 1.7],
  ].map(([r, y]) => new Vector2(r, y));
  const g = paintBands(new LatheGeometry(profile, 10), (y) => ((y > 1.1 && y < 1.18) || (y > 1.24 && y < 1.3) ? "#c1121f" : "#fffaf0"));
  g.computeVertexNormals();
  return g.translate(0, -SPEC.pin.lift, 0);
}

function coneGeometry() {
  const cone = paintBands(new ConeGeometry(0.45, 1.3, 12).translate(0, 0.2, 0), (y) => (y > 0.18 && y < 0.42 ? "#fdf0d5" : "#ff7a2e"));
  const base = paintBands(new BoxGeometry(1, 0.1, 1).translate(0, -0.4, 0), () => "#003049");
  return mergeGeometries([cone, base]);
}

function drumGeometry() {
  // White body (tinted per instance) with two darker hoops and a dark lid
  const body = paintBands(new CylinderGeometry(0.55, 0.55, 1.3, 12, 4), (y) => (Math.abs(Math.abs(y) - 0.32) < 0.06 ? "#7a7a7a" : y > 0.64 ? "#9a9a9a" : "#ffffff"));
  body.computeVertexNormals();
  return body;
}

export function createPhysics(
  scene: Scene,
  statics: Static[],
  boxes: StaticBox[],
  opts: { iterations: number; shadows: boolean; tier: 0 | 1 | 2; maxAwake: number },
  onHit: (kind: PropKind, strength: number, byCar: boolean, mass: number, x: number, y: number, z: number) => void,
) {
  const world = new World({ gravity: new Vec3(0, -22, 0), allowSleep: true });
  world.broadphase = new SAPBroadphase(world);
  (world.solver as GSSolver).iterations = opts.iterations;
  world.defaultContactMaterial.friction = 0.42;
  world.defaultContactMaterial.restitution = 0.18;
  const groundMat = new PhysMaterial("ground");
  const ballMat = new PhysMaterial("ball");
  const pinMat = new PhysMaterial("pin");
  world.addContactMaterial(new ContactMaterial(groundMat, ballMat, { friction: 0.35, restitution: 0.7 }));
  // Pins clatter off each other and slide on the lane
  world.addContactMaterial(new ContactMaterial(pinMat, pinMat, { friction: 0.25, restitution: 0.35 }));
  world.addContactMaterial(new ContactMaterial(groundMat, pinMat, { friction: 0.3, restitution: 0.2 }));

  // The island as a heightfield (cannon's heightfields lie in XY, so rotate them flat).
  const size = (ISLAND_RADIUS + 12) * 2;
  const step = 2;
  const n = Math.round(size / step) + 1;
  const matrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    matrix.push([]);
    for (let j = 0; j < n; j++) matrix[i].push(heightAt(-size / 2 + i * step, size / 2 - j * step));
  }
  const ground = new Body({ mass: 0, material: groundMat });
  ground.addShape(new Heightfield(matrix, { elementSize: step }));
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  ground.position.set(-size / 2, 0, size / 2);
  world.addBody(ground);

  // Trees, lamps and landmarks as static posts; walls (the lane's backstop, the pier) as boxes
  for (const s of statics) {
    const b = new Body({ mass: 0, shape: new Cylinder(s.r, s.r, 8, 8) });
    b.position.set(s.x, heightAt(s.x, s.z) + 4, s.z);
    world.addBody(b);
  }
  for (const s of boxes) {
    const b = new Body({ mass: 0, shape: new Box(new Vec3(s.hx, s.hy, s.hz)), material: groundMat });
    b.position.set(s.x, s.y, s.z);
    b.quaternion.setFromEuler(0, s.ry, 0);
    world.addBody(b);
  }

  /* Meshes: one InstancedMesh per kind */
  const spots = propSpots.filter((s) => s.tier <= opts.tier);
  const countOf = (k: PropKind) => spots.filter((s) => s.kind === k).length;
  const instanced = (geo: BufferGeometry, mat: MeshStandardMaterial, count: number) => {
    const m = new InstancedMesh(geo, mat, Math.max(1, count));
    m.count = count;
    m.instanceMatrix.setUsage(DynamicDrawUsage);
    m.castShadow = opts.shadows;
    m.receiveShadow = true;
    // Props fly anywhere; they're cheap enough to always draw
    m.frustumCulled = false;
    scene.add(m);
    return m;
  };
  const meshes: Record<Exclude<PropKind, "ball">, InstancedMesh> = {
    pin: instanced(pinGeometry(), new MeshStandardMaterial({ vertexColors: true, roughness: 0.35 }), countOf("pin")),
    cone: instanced(coneGeometry(), new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6 }), countOf("cone")),
    crate: instanced(new BoxGeometry(CRATE, CRATE, CRATE), new MeshStandardMaterial({ map: crateTexture(), roughness: 0.85 }), countOf("crate")),
    drum: instanced(drumGeometry(), new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.45, metalness: 0.25 }), countOf("drum")),
  };
  const drumColors = ["#669bbc", "#c1121f", "#003049", "#780000"].map((c) => new Color(c));
  const ballGeo = new SphereGeometry(1.1, 24, 16);
  const ballMatVis = new MeshStandardMaterial({ map: beachBallTexture(), roughness: 0.35 });

  /* Bodies */
  const props: Prop[] = [];
  const propOf = new Map<number, Prop>();
  const used: Record<PropKind, number> = { pin: 0, cone: 0, crate: 0, drum: 0, ball: 0 };
  const balls: Body[] = [];
  const shapeFor = (b: Body, kind: PropKind) => {
    if (kind === "pin") b.addShape(new Cylinder(0.17, 0.3, 1.7, 8), new Vec3(0, 0.85 - SPEC.pin.lift, 0));
    else if (kind === "cone") {
      b.addShape(new Cylinder(0.06, 0.45, 1.3, 8), new Vec3(0, 0.2, 0));
      b.addShape(new Box(new Vec3(0.5, 0.05, 0.5)), new Vec3(0, -0.4, 0));
    } else if (kind === "crate") b.addShape(new Box(new Vec3(CRATE / 2, CRATE / 2, CRATE / 2)));
    else if (kind === "drum") b.addShape(new Cylinder(0.55, 0.55, 1.3, 10));
    else b.addShape(new Sphere(1.1));
  };
  const onCollide = (e: { body: Body; target: Body; contact: ContactEquation }) => {
    const p = propOf.get(e.target.id);
    if (!p) return;
    const s = Math.abs(e.contact.getImpactVelocityAlongNormal());
    const b = p.body;
    if (e.body === car) {
      // A little extra lift and spin, so a good hit sends things flying instead of just sliding
      if (p.kind !== "ball" && s > 3) {
        const k = p.kind === "pin" || p.kind === "cone" ? 0.32 : 0.16;
        b.velocity.y += Math.min(7, s * k);
        b.angularVelocity.x += (Math.random() - 0.5) * s * 0.7;
        b.angularVelocity.z += (Math.random() - 0.5) * s * 0.7;
      }
      // Wake the whole stack or rack it belongs to, so nothing is left floating
      for (let i = 0; i < props.length; i++) if (props[i].group === p.group) props[i].body.wakeUp();
      onHit(p.kind, s, true, b.mass, b.position.x, b.position.y, b.position.z);
    } else if (s > 2.5) onHit(p.kind, s, false, b.mass, b.position.x, b.position.y, b.position.z);
  };
  for (const spot of spots) {
    const spec = SPEC[spot.kind];
    const b = new Body({
      mass: spec.mass,
      material: spot.kind === "ball" ? ballMat : spot.kind === "pin" ? pinMat : undefined,
      linearDamping: spot.kind === "ball" ? 0.22 : 0.06,
      angularDamping: spot.kind === "ball" ? 0.3 : 0.18,
      allowSleep: true,
      sleepSpeedLimit: 0.3,
      sleepTimeLimit: 0.6,
    });
    shapeFor(b, spot.kind);
    b.position.set(spot.x, heightAt(spot.x, spot.z) + spec.lift + (spot.row ?? 0) * CRATE + 0.002, spot.z);
    // Racks face their run-up; everything else gets a little turn so rows don't look stamped out
    b.quaternion.setFromEuler(0, spot.kind === "crate" ? 0 : (props.length * 1.7) % (Math.PI * 2), 0);
    b.previousPosition.copy(b.position);
    b.previousQuaternion.copy(b.quaternion);
    b.addEventListener("collide", onCollide);
    world.addBody(b);
    let mesh: InstancedMesh | Mesh;
    let index = 0;
    if (spot.kind === "ball") {
      mesh = part(ballGeo, ballMatVis, 0, 0, 0, opts.shadows);
      scene.add(mesh);
      balls.push(b);
    } else {
      const im = meshes[spot.kind];
      index = used[spot.kind]++;
      if (spot.kind === "drum") im.setColorAt(index, drumColors[index % drumColors.length]);
      mesh = im;
    }
    const p: Prop = { kind: spot.kind, body: b, mesh, index, start: b.position.clone(), startQ: b.quaternion.clone(), rack: spot.rack ?? -1, group: props.length, away: 0, pop: 1, still: false, down: false };
    props.push(p);
    propOf.set(b.id, p);
  }
  // Groups: props of a kind that touch (a crate stack, a rack, a cluster of drums) come back together
  for (const p of props)
    for (const q of props) {
      if (q === p || q.kind !== p.kind || q.group === p.group || p.kind === "ball") continue;
      if (Math.hypot(q.start.x - p.start.x, q.start.z - p.start.z) < 2.1) {
        const from = q.group;
        for (const r of props) if (r.group === from) r.group = p.group;
      }
    }
  // Everything starts asleep, resting where it was placed, until something hits it.
  for (const p of props) p.body.sleep();

  const racks: Rack[] = rackSpots.map((r, i) => {
    const pins = props.filter((p) => p.rack === i);
    return { name: r.name, x: r.x, z: r.z, pins, down: 0, total: pins.length, reported: false, firstDown: 0, timer: 0 };
  });

  // The jeepney, moved by the engine. It must never fall asleep: a sleeping
  // kinematic body is skipped by the broadphase against sleeping props, which
  // is exactly how everything used to feel hollow.
  const car = new Body({ mass: 0, type: Body.KINEMATIC, shape: new Box(new Vec3(1.15, 0.95, 2.5)), allowSleep: false });
  world.addBody(car);

  const m4 = new Matrix4();
  const tv = new Vector3();
  const tq = new Quaternion();
  const ts = new Vector3();
  const tmpPos = new Vec3();
  const tmpQ = new PhysQuat();
  const sleeping = Body.SLEEPING;

  const place = (p: Prop) => {
    const b = p.body;
    b.position.copy(p.start);
    b.previousPosition.copy(p.start);
    b.interpolatedPosition.copy(p.start);
    b.quaternion.copy(p.startQ);
    b.previousQuaternion.copy(p.startQ);
    b.interpolatedQuaternion.copy(p.startQ);
    b.velocity.setZero();
    b.angularVelocity.setZero();
    b.force.setZero();
    b.torque.setZero();
    b.aabbNeedsUpdate = true;
    b.sleep();
    p.pop = 0;
    p.still = false;
    p.away = 0;
    p.down = false;
  };
  const respawnGroup = (group: number) => {
    for (let i = 0; i < props.length; i++) if (props[i].group === group) place(props[i]);
  };
  const displaced = (p: Prop) => {
    const b = p.body;
    const dx = b.position.x - p.start.x;
    const dy = b.position.y - p.start.y;
    const dz = b.position.z - p.start.z;
    if (dx * dx + dy * dy + dz * dz > 0.3) return true;
    const q = b.quaternion;
    const s = p.startQ;
    return Math.abs(q.x * s.x + q.y * s.y + q.z * s.z + q.w * s.w) < 0.985;
  };

  let frame = 0;

  return {
    world,
    props,
    racks,
    balls,
    /** Moves the kinematic jeepney to the car's state before a physics step. */
    setCar(x: number, y: number, z: number, heading: number, pitch: number, roll: number, vx: number, vy: number, vz: number) {
      car.position.set(x, y + 1.25, z);
      car.quaternion.setFromEuler(pitch, heading, roll, "YXZ");
      car.velocity.set(vx, vy, vz);
      car.aabbNeedsUpdate = true;
    },
    step() {
      world.step(FIXED);
    },
    /** Copies body transforms to the instances, interpolated between the last two steps. */
    sync(alpha: number) {
      let dirtyPin = false;
      let dirtyCone = false;
      let dirtyCrate = false;
      let dirtyDrum = false;
      for (let i = 0; i < props.length; i++) {
        const p = props[i];
        const b = p.body;
        const asleep = b.sleepState === sleeping;
        if (p.kind === "pin") {
          // Up vector's y from the quaternion: below ~57° from upright counts as down
          const q = b.quaternion;
          p.down = 1 - 2 * (q.x * q.x + q.z * q.z) < 0.55 || Math.abs(b.position.x - p.start.x) + Math.abs(b.position.z - p.start.z) > 3;
        }
        if (p.still && asleep) continue;
        b.previousPosition.lerp(b.position, alpha, tmpPos);
        b.previousQuaternion.slerp(b.quaternion, alpha, tmpQ);
        // Respawned props grow back in with a little overshoot
        const k = p.pop;
        const s = k >= 1 ? 1 : 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;
        if (p.kind === "ball") {
          p.mesh.position.set(tmpPos.x, tmpPos.y, tmpPos.z);
          p.mesh.quaternion.set(tmpQ.x, tmpQ.y, tmpQ.z, tmpQ.w);
          p.mesh.scale.setScalar(Math.max(0.001, s));
        } else {
          m4.compose(tv.set(tmpPos.x, tmpPos.y, tmpPos.z), tq.set(tmpQ.x, tmpQ.y, tmpQ.z, tmpQ.w), ts.setScalar(Math.max(0.001, s)));
          (p.mesh as InstancedMesh).setMatrixAt(p.index, m4);
          if (p.kind === "pin") dirtyPin = true;
          else if (p.kind === "cone") dirtyCone = true;
          else if (p.kind === "crate") dirtyCrate = true;
          else dirtyDrum = true;
        }
        p.still = asleep && k >= 1;
      }
      if (dirtyPin) meshes.pin.instanceMatrix.needsUpdate = true;
      if (dirtyCone) meshes.cone.instanceMatrix.needsUpdate = true;
      if (dirtyCrate) meshes.crate.instanceMatrix.needsUpdate = true;
      if (dirtyDrum) meshes.drum.instanceMatrix.needsUpdate = true;
    },
    /**
     * Housekeeping, once a frame: grow respawned props back in, run the
     * pinsetters, put knocked-over props back once nobody's looking, and keep
     * the number of awake bodies under the budget.
     * Calls `onRack` when a rack is cleared (a strike) or settles with some pins down.
     */
    update(dt: number, t: number, car: { x: number; z: number }, cam: { x: number; z: number; fx: number; fz: number }, onRack: (rack: Rack) => void) {
      frame++;
      let awake = 0;
      let farthest: Prop | null = null;
      let farD = 25 * 25;
      for (let i = 0; i < props.length; i++) {
        const p = props[i];
        const b = p.body;
        if (p.pop < 1) {
          p.pop = Math.min(1, p.pop + dt * 3.2);
          p.still = false;
        }
        // Fell off the island: stop simulating it and bring it back soon
        if (b.position.y < SEA_LEVEL - 4 && b.sleepState !== sleeping) {
          b.sleep();
          p.away = Math.max(p.away, RESPAWN_AFTER - 2);
        }
        if (b.sleepState !== sleeping) {
          awake++;
          const dx = b.position.x - car.x;
          const dz = b.position.z - car.z;
          const d2 = dx * dx + dz * dz;
          if (d2 > farD) {
            farD = d2;
            farthest = p;
          }
        }
        // Respawn checks are spread over four frames
        if (p.rack >= 0 || (i & 3) !== (frame & 3)) continue;
        if (!displaced(p)) {
          p.away = 0;
          continue;
        }
        const dx = b.position.x - cam.x;
        const dz = b.position.z - cam.z;
        const d = Math.hypot(dx, dz);
        const sx = p.start.x - car.x;
        const sz = p.start.z - car.z;
        const carNear = sx * sx + sz * sz < 36 || (b.position.x - car.x) ** 2 + (b.position.z - car.z) ** 2 < 100;
        const unseen = d > 75 || (dx * cam.fx + dz * cam.fz < -0.15 * d && d > 8) || b.position.y < SEA_LEVEL - 1;
        if (unseen && !carNear && b.sleepState === sleeping) p.away += dt * 4;
        else if (b.position.y >= SEA_LEVEL - 1) p.away = 0;
        if (p.away > RESPAWN_AFTER) {
          // The whole group comes back together, once every displaced member is ready
          let ready = true;
          for (let j = 0; j < props.length; j++) {
            const q = props[j];
            if (q === p || q.group !== p.group || !displaced(q) || q.body.position.y < SEA_LEVEL - 1) continue;
            if (q.away < RESPAWN_AFTER - 1 || q.body.sleepState !== sleeping) {
              ready = false;
              break;
            }
          }
          if (ready) respawnGroup(p.group);
        }
      }
      // Budget: too many bodies awake at once, so settle the farthest one
      if (awake > opts.maxAwake && farthest) {
        if (farthest.rack < 0 && displaced(farthest)) respawnGroup(farthest.group);
        else farthest.body.sleep();
      }

      // Pinsetters
      for (const r of racks) {
        let down = 0;
        let settled = true;
        for (const p of r.pins) {
          if (p.down) down++;
          // Resting (or rocking gently against a neighbour), or lost in the sea
          const b = p.body;
          if (b.sleepState !== sleeping && b.position.y > SEA_LEVEL - 1 && b.velocity.lengthSquared() + b.angularVelocity.lengthSquared() > 0.36) settled = false;
        }
        if (down > 0 && r.down === 0) r.firstDown = t;
        r.down = down;
        if (!r.reported && down > 0 && (down === r.total || (settled && t - r.firstDown > 0.8))) {
          r.reported = true;
          onRack(r);
        }
        const cdx = car.x - r.x;
        const cdz = car.z - r.z;
        if (r.reported && settled && cdx * cdx + cdz * cdz > 100) r.timer += dt;
        else r.timer = 0;
        if (r.timer > PINSETTER_AFTER) {
          for (const p of r.pins) place(p);
          r.reported = false;
          r.timer = 0;
          r.down = 0;
        }
      }
    },
    /** Every prop back where it started (with the grow-in), and the racks set up. */
    reset() {
      for (const p of props) place(p);
      for (const r of racks) {
        r.reported = false;
        r.timer = 0;
        r.down = 0;
      }
    },
    dispose() {
      for (const b of [...world.bodies]) world.removeBody(b);
    },
  };
}

export type Physics = ReturnType<typeof createPhysics>;
