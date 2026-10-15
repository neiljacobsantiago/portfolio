import { Body, Box, ContactMaterial, Cylinder, GSSolver, Heightfield, Material as PhysMaterial, Quaternion as PhysQuat, SAPBroadphase, Sphere, Vec3, World } from "cannon-es";
import {
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  Group,
  MeshStandardMaterial,
  BoxGeometry,
  Object3D,
  Quaternion,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  type Scene,
} from "three";
import { part, std } from "./jeepney";
import type { Static } from "./nature";
import { heightAt } from "./terrain";
import { BALL, CRATE, crates, cones, ISLAND_RADIUS, pins } from "./world";

// Real rigid bodies (cannon-es) for everything you can knock over: crate
// stacks, bowling pins, slalom cones and a beach ball. The jeepney is a
// kinematic box the engine moves every step, so it shoves bodies around
// without being pushed back.

const FIXED = 1 / 60;

interface Prop {
  body: Body;
  mesh: Object3D;
  kind: "crate" | "pin" | "cone" | "ball";
  start: Vec3;
  startQ: PhysQuat;
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

export function createPhysics(scene: Scene, statics: Static[], opts: { iterations: number; shadows: boolean }) {
  const world = new World({ gravity: new Vec3(0, -22, 0), allowSleep: true });
  world.broadphase = new SAPBroadphase(world);
  (world.solver as GSSolver).iterations = opts.iterations;
  world.defaultContactMaterial.friction = 0.45;
  world.defaultContactMaterial.restitution = 0.15;
  const groundMat = new PhysMaterial("ground");
  const ballMat = new PhysMaterial("ball");
  world.addContactMaterial(new ContactMaterial(groundMat, ballMat, { friction: 0.35, restitution: 0.7 }));

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

  // Trees, lamps and landmarks as static posts
  for (const s of statics) {
    const b = new Body({ mass: 0, shape: new Cylinder(s.r, s.r, 8, 8) });
    b.position.set(s.x, heightAt(s.x, s.z) + 4, s.z);
    world.addBody(b);
  }

  const props: Prop[] = [];
  const add = (kind: Prop["kind"], body: Body, mesh: Object3D) => {
    body.allowSleep = true;
    body.sleepSpeedLimit = 0.25;
    body.sleepTimeLimit = 0.5;
    body.previousPosition.copy(body.position);
    body.previousQuaternion.copy(body.quaternion);
    world.addBody(body);
    scene.add(mesh);
    props.push({ kind, body, mesh, start: body.position.clone(), startQ: body.quaternion.clone() });
  };

  // Crates
  const crateMat = new MeshStandardMaterial({ map: crateTexture(), roughness: 0.85 });
  const crateGeo = new BoxGeometry(CRATE, CRATE, CRATE);
  for (const [x, row, z] of crates) {
    const b = new Body({ mass: 2.2, shape: new Box(new Vec3(CRATE / 2, CRATE / 2, CRATE / 2)), linearDamping: 0.05, angularDamping: 0.1 });
    b.position.set(x, heightAt(x, z) + CRATE / 2 + row * CRATE + 0.001, z);
    add("crate", b, part(crateGeo, crateMat, 0, 0, 0, opts.shadows));
  }

  // Bowling pins
  const pinMat = std("#fffaf0", { roughness: 0.4 });
  const pinGeo = new CylinderGeometry(0.2, 0.3, 1.5, 12);
  const headGeo = new SphereGeometry(0.25, 12, 8);
  const bandGeo = new CylinderGeometry(0.22, 0.22, 0.12, 12);
  const bandMat = std("#c1121f");
  for (const [x, z] of pins) {
    const g = new Group();
    g.add(part(pinGeo, pinMat, 0, 0, 0, opts.shadows), part(headGeo, pinMat, 0, 0.85, 0, opts.shadows), part(bandGeo, bandMat, 0, 0.5, 0, false));
    const b = new Body({ mass: 1.1, shape: new Cylinder(0.2, 0.3, 1.5, 10), angularDamping: 0.2 });
    b.position.set(x, heightAt(x, z) + 0.751, z);
    add("pin", b, g);
  }

  // Cones
  const coneMat = std("#ff7a2e", { roughness: 0.6 });
  const stripeMat = std("#fdf0d5");
  for (const [x, z] of cones) {
    const g = new Group();
    g.add(part(new ConeGeometry(0.45, 1.3, 14), coneMat, 0, 0, 0, opts.shadows), part(new CylinderGeometry(0.24, 0.3, 0.16, 14), stripeMat, 0, 0.05, 0, false), part(new BoxGeometry(1, 0.1, 1), std("#003049"), 0, -0.6, 0, false));
    const b = new Body({ mass: 0.8, shape: new Cylinder(0.06, 0.45, 1.3, 10), angularDamping: 0.2 });
    b.position.set(x, heightAt(x, z) + 0.651, z);
    add("cone", b, g);
  }

  // Beach ball
  const ball = new Body({ mass: 1.6, shape: new Sphere(1.1), material: ballMat, linearDamping: 0.22, angularDamping: 0.3 });
  ball.position.set(BALL[0], heightAt(BALL[0], BALL[1]) + 1.12, BALL[1]);
  add("ball", ball, part(new SphereGeometry(1.1, 28, 18), new MeshStandardMaterial({ map: beachBallTexture(), roughness: 0.35 }), 0, 0, 0, opts.shadows));

  // Everything starts asleep, resting where it was placed, until something hits it.
  for (const p of props) p.body.sleep();

  // The jeepney, moved by the engine
  const car = new Body({ mass: 0, type: Body.KINEMATIC, shape: new Box(new Vec3(1.15, 0.9, 2.5)) });
  car.collisionResponse = true;
  world.addBody(car);

  // Hits on the jeepney, for sound and a little slow-down. Read and cleared by the engine.
  const hits: { strength: number; mass: number }[] = [];
  car.addEventListener("collide", (e: { body: Body; contact: { getImpactVelocityAlongNormal: () => number } }) => {
    if (e.body.type !== Body.DYNAMIC) return;
    hits.push({ strength: Math.abs(e.contact.getImpactVelocityAlongNormal()), mass: e.body.mass });
    // Wake the whole stack it belongs to, so nothing is left floating.
    for (const p of props) if (p.body.position.distanceTo(e.body.position) < 5) p.body.wakeUp();
  });

  const q = new Quaternion();
  const v = new Vector3();
  const up = new Vec3(0, 1, 0);
  const tmpUp = new Vec3();
  const tmpPos = new Vec3();
  const tmpQ = new PhysQuat();

  return {
    world,
    hits,
    /** Moves the kinematic jeepney to the car's state before a physics step. */
    setCar(x: number, y: number, z: number, heading: number, pitch: number, roll: number, vx: number, vy: number, vz: number) {
      car.position.set(x, y + 1.3, z);
      car.quaternion.setFromEuler(pitch, heading, roll, "YXZ");
      car.velocity.set(vx, vy, vz);
    },
    step() {
      world.step(FIXED);
    },
    /** Copies body transforms to meshes, interpolated between the last two steps. */
    sync(alpha: number) {
      let down = 0;
      for (const p of props) {
        const b = p.body;
        b.previousPosition.lerp(b.position, alpha, tmpPos);
        b.previousQuaternion.slerp(b.quaternion, alpha, tmpQ);
        p.mesh.position.set(tmpPos.x, tmpPos.y, tmpPos.z);
        p.mesh.quaternion.copy(q.set(tmpQ.x, tmpQ.y, tmpQ.z, tmpQ.w));
        if (p.kind === "pin") {
          b.quaternion.vmult(up, tmpUp);
          if (tmpUp.y < 0.55) down++;
        }
      }
      return down;
    },
    pinTotal: pins.length,
    ballPosition: () => v.set(ball.position.x, ball.position.y, ball.position.z),
    reset() {
      for (const p of props) {
        p.body.position.copy(p.start);
        p.body.previousPosition.copy(p.start);
        p.body.quaternion.copy(p.startQ);
        p.body.previousQuaternion.copy(p.startQ);
        p.body.velocity.setZero();
        p.body.angularVelocity.setZero();
        p.body.sleep();
      }
    },
    dispose() {
      for (const b of [...world.bodies]) world.removeBody(b);
    },
  };
}

export type Physics = ReturnType<typeof createPhysics>;
export { FIXED };
