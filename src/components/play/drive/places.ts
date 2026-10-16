import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { C, part, signTexture, std } from "./jeepney";
import type { Animated } from "./landmarks";
import type { Static } from "./nature";
import { heightAt, tint } from "./terrain";
import { COVE, LANE, LOOKOUT, PIER, type Segment, spokes, TOWN, TRAIL_HALF, trailAt } from "./world";

// Everything on the island that isn't a project: the dirt trail and its
// spokes, Bayan (houses round a square with a bandstand, and a bowling lane),
// the beach and the pier with a bangka tied up, the lookout on the hill and
// the secret cove. Solid parts are pushed onto `statics` for the jeepney, and
// the few flat walls props should bounce off are returned as `boxes` for the
// physics.

export interface StaticBox {
  x: number;
  y: number;
  z: number;
  hx: number;
  hy: number;
  hz: number;
  /** Rotation about Y. */
  ry: number;
}

const DIRT = "#d8b682";

/** A strip laid over the terrain along a polyline (points + unit tangents). */
function ribbon(points: { x: number; z: number; tx: number; tz: number }[], half: number, lift: number, closed: boolean) {
  const pos: number[] = [];
  const edge = (p: (typeof points)[number], side: number): [number, number, number] => {
    const x = p.x + p.tz * half * side;
    const z = p.z - p.tx * half * side;
    return [x, heightAt(x, z) + lift, z];
  };
  const n = closed ? points.length : points.length - 1;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const a1 = edge(a, -1);
    const a2 = edge(a, 1);
    const b1 = edge(b, -1);
    const b2 = edge(b, 1);
    pos.push(...a1, ...b1, ...a2, ...a2, ...b1, ...b2);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function segmentPoints(s: Segment, step: number) {
  const len = Math.hypot(s.x2 - s.x1, s.z2 - s.z1);
  const tx = (s.x2 - s.x1) / len;
  const tz = (s.z2 - s.z1) / len;
  const n = Math.max(1, Math.ceil(len / step));
  return Array.from({ length: n + 1 }, (_, i) => ({ x: s.x1 + (s.x2 - s.x1) * (i / n), z: s.z1 + (s.z2 - s.z1) * (i / n), tx, tz }));
}

/** Polished maple boards, a foul line, aiming arrows and dark gutters. */
function laneTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#e7c48f";
  g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 2 ? "rgba(160,110,60,0.13)" : "rgba(255,240,210,0.18)";
    g.fillRect(0, 14 + i * 6.3, 512, 6.3);
  }
  g.fillStyle = "#3a2f28";
  g.fillRect(0, 0, 512, 14);
  g.fillRect(0, 114, 512, 14);
  g.fillStyle = "#c1121f";
  g.fillRect(36, 14, 5, 100); // foul line
  for (let i = 0; i < 5; i++) {
    // aiming arrows, pointing down the lane
    const y = 30 + i * 17;
    const x = 150 + Math.abs(i - 2) * 16;
    g.beginPath();
    g.moveTo(x + 18, y);
    g.lineTo(x, y - 5);
    g.lineTo(x, y + 5);
    g.closePath();
    g.fill();
  }
  g.fillStyle = "rgba(0,48,73,0.18)";
  for (let i = 0; i < 4; i++) for (let k = 0; k <= i; k++) g.fillRect(430 + i * 18, 64 + (k - i / 2) * 20 - 3, 6, 6); // pin spots
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function plankTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#a9794c";
  g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 3 === 0 ? "#8a5a3c" : i % 3 === 1 ? "#b8875a" : "#9d6d44";
    g.fillRect(0, i * 16 + 1, 64, 14);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

export function buildPlaces(opts: { statics: Static[]; animated: Animated[]; shadows: boolean; quality: number }) {
  const { statics, animated, shadows, quality } = opts;
  const g = new Group();
  const boxes: StaticBox[] = [];
  const box = (b: StaticBox) => boxes.push(b);
  const mat = (color: string) => std(color);
  const add = <T extends Object3D>(o: T) => {
    g.add(o);
    return o;
  };

  /* ───── the coast trail and spokes ───── */
  const dirt = new MeshStandardMaterial({ color: DIRT, roughness: 1, flatShading: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const trailPts = Array.from({ length: 420 }, (_, i) => trailAt((i / 420) * Math.PI * 2));
  const trail = part(ribbon(trailPts, TRAIL_HALF, 0.09, true), dirt, 0, 0, 0, false);
  add(trail);
  for (const s of spokes) {
    // Start at the ring road's outer edge so the dirt never covers the paving
    const len = Math.hypot(s.x2 - s.x1, s.z2 - s.z1);
    const k = 3.2 / len;
    add(part(ribbon(segmentPoints({ x1: s.x1 + (s.x2 - s.x1) * k, z1: s.z1 + (s.z2 - s.z1) * k, x2: s.x2, z2: s.z2 }, 1.5), TRAIL_HALF, 0.08, false), dirt, 0, 0, 0, false));
  }

  /* ───── Bayan: a paved square with a bandstand ───── */
  const ty = heightAt(TOWN.x, TOWN.z);
  const square = part(new CylinderGeometry(TOWN.r, TOWN.r, 0.1, 40), std("#ecd3a2"), TOWN.x, ty + 0.02, TOWN.z, false);
  add(square);
  const squareRing = part(new CylinderGeometry(TOWN.r + 0.35, TOWN.r + 0.35, 0.08, 40, 1, true), std(C.ember), TOWN.x, ty + 0.03, TOWN.z, false);
  add(squareRing);
  // Bandstand (kiosko)
  const kiosk = new Group();
  kiosk.add(part(new CylinderGeometry(3.2, 3.4, 0.6, 8), std(C.paper), 0, 0.3, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    kiosk.add(part(new BoxGeometry(0.2, 2.8, 0.2), std(C.ink), Math.cos(a) * 2.8, 2, Math.sin(a) * 2.8));
  }
  kiosk.add(part(new ConeGeometry(3.8, 1.9, 8), std(C.ember), 0, 4.3, 0));
  kiosk.add(part(new DodecahedronGeometry(0.3, 0), std("#ffd27a", { emissive: "#ffb347", emissiveIntensity: 0.4 }), 0, 5.4, 0));
  kiosk.position.set(TOWN.x, ty, TOWN.z);
  add(kiosk);
  statics.push({ x: TOWN.x, z: TOWN.z, r: 3.3 });

  // Bunting: little flags strung from the bandstand roof to the lamps round the square
  const flagGeo = new BufferGeometry();
  flagGeo.setAttribute("position", new Float32BufferAttribute([-0.22, 0, 0, 0.22, 0, 0, 0, -0.42, 0], 3));
  flagGeo.setAttribute("normal", new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  const flags = new InstancedMesh(flagGeo, new MeshStandardMaterial({ side: DoubleSide, roughness: 0.8 }), 4 * 9);
  const tmp = new Object3D();
  const colors = [C.ember, C.paper, C.sky, "#ffd27a"];
  const fc = new Color();
  let nf = 0;
  for (const d of [45, 135, 225, 315]) {
    const a = (d * Math.PI) / 180;
    const ex = TOWN.x + Math.cos(a) * (TOWN.r + 0.2);
    const ez = TOWN.z + Math.sin(a) * (TOWN.r + 0.2);
    for (let i = 1; i <= 9; i++) {
      const k = i / 10;
      tmp.position.set(TOWN.x + (ex - TOWN.x) * k, ty + 4.6 - (4.6 - 4.25) * k - Math.sin(k * Math.PI) * 0.6, TOWN.z + (ez - TOWN.z) * k);
      tmp.rotation.set(0, -a + Math.PI / 2, 0);
      tmp.updateMatrix();
      flags.setMatrixAt(nf, tmp.matrix);
      flags.setColorAt(nf++, fc.set(colors[i % 4]));
    }
  }
  flags.computeBoundingSphere();
  add(flags);
  animated.push({ update: (t) => (flags.position.y = Math.sin(t * 2.1) * 0.03) });

  // Houses: plaster walls, a pitched roof, a door and windows, facing the square
  const houses: { x: number; z: number; w: number; d: number; wall: string; roof: string; sign?: string }[] = [
    { x: 59, z: -25, w: 5, d: 4.4, wall: C.paper, roof: C.ember },
    { x: 69, z: -28, w: 5.6, d: 4.6, wall: "#f3d9b1", roof: C.wine },
    { x: 79, z: -24, w: 4.6, d: 4.2, wall: "#cfe0e8", roof: C.ember },
    { x: 85, z: -13, w: 4.6, d: 4.2, wall: "#ffd27a", roof: C.ink, sign: "SARI-SARI" },
  ];
  const windowMat = std("#1c2b3a", { roughness: 0.3, emissive: "#ffcf87", emissiveIntensity: 0 });
  const doorMat = std("#8a5a3c");
  for (const h of houses) {
    const house = new Group();
    house.add(part(new BoxGeometry(h.w, 2.8, h.d), mat(h.wall), 0, 1.4, 0));
    const roof = part(new ConeGeometry(Math.hypot(h.w, h.d) / 2 + 0.35, 1.8, 4), mat(h.roof), 0, 3.7, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(h.w / h.d, 1, 1);
    house.add(roof);
    house.add(part(new BoxGeometry(0.95, 1.7, 0.08), doorMat, 0, 0.85, h.d / 2 + 0.02, false));
    for (const sx of [-1, 1]) house.add(part(new BoxGeometry(0.85, 0.75, 0.08), windowMat, sx * (h.w / 2 - 1), 1.75, h.d / 2 + 0.02, false));
    if (h.sign) {
      const s = part(new PlaneGeometry(2.6, 0.55), new MeshStandardMaterial({ map: signTexture(h.sign, C.ember, C.paper, 384, 80), roughness: 0.6 }), 0, 2.45, h.d / 2 + 0.06, false);
      house.add(s);
    }
    house.position.set(h.x, heightAt(h.x, h.z), h.z);
    house.lookAt(TOWN.x, house.position.y, TOWN.z);
    add(house);
    statics.push({ x: h.x, z: h.z, r: Math.max(h.w, h.d) / 2 + 0.3 });
  }

  /* ───── the bowling lane ───── */
  const laneLen = LANE.x1 - LANE.x0;
  const ly = heightAt((LANE.x0 + LANE.x1) / 2, LANE.z);
  const laneTex = laneTexture();
  const lane = part(new BoxGeometry(laneLen, 0.1, LANE.half * 2 + 0.6), [mat("#8a5a3c"), mat("#8a5a3c"), new MeshStandardMaterial({ map: laneTex, roughness: 0.35, metalness: 0.05 }), mat("#8a5a3c"), mat("#8a5a3c"), mat("#8a5a3c")], (LANE.x0 + LANE.x1) / 2, ly - 0.02, LANE.z, false);
  lane.receiveShadow = true;
  add(lane);
  // Kickback walls either side of the pin deck, and the backstop with its sign
  const wallMat = std(C.ink);
  const kickX0 = LANE.head - 2.2;
  const kickLen = LANE.x1 - kickX0;
  for (const side of [-1, 1]) {
    const z = LANE.z + side * (LANE.half + 0.75);
    add(part(new BoxGeometry(kickLen, 0.9, 0.4), wallMat, kickX0 + kickLen / 2, ly + 0.45, z));
    add(part(new BoxGeometry(kickLen, 0.12, 0.44), std(C.ember), kickX0 + kickLen / 2, ly + 0.93, z, false));
    box({ x: kickX0 + kickLen / 2, y: ly + 0.6, z, hx: kickLen / 2, hy: 0.6, hz: 0.2, ry: 0 });
    for (let x = kickX0 + 0.6; x < LANE.x1; x += 1.2) statics.push({ x, z, r: 0.45 });
  }
  const back = part(new BoxGeometry(0.6, 2.6, LANE.half * 2 + 2), wallMat, LANE.x1 + 0.3, ly + 1.3, LANE.z);
  add(back);
  box({ x: LANE.x1 + 0.3, y: ly + 1.3, z: LANE.z, hx: 0.3, hy: 1.3, hz: LANE.half + 1, ry: 0 });
  for (let z = -LANE.half; z <= LANE.half + 0.01; z += 1.3) statics.push({ x: LANE.x1 + 0.5, z: LANE.z + z, r: 0.7 });
  const bowl = part(new PlaneGeometry(4.6, 1.1), new MeshStandardMaterial({ map: signTexture("BAYAN LANES", C.paper, C.ember, 512, 120), roughness: 0.6, emissive: "#ffffff", emissiveIntensity: 0 }), LANE.x1, ly + 3.3, LANE.z, false);
  bowl.rotation.y = -Math.PI / 2;
  add(bowl);
  for (const side of [-1, 1]) add(part(new BoxGeometry(0.2, 3.9, 0.2), wallMat, LANE.x1 + 0.3, ly + 1.95, LANE.z + side * 2.4));

  /* ───── beach umbrellas ───── */
  const umbrellaGeo = (() => {
    const canopy = new ConeGeometry(2, 0.8, 8, 1, true).toNonIndexed();
    const col = new Float32Array(canopy.attributes.position.count * 3);
    const a = new Color();
    for (let i = 0; i < canopy.attributes.position.count; i += 3) {
      a.set(Math.floor(i / 3) % 2 ? C.paper : C.ember);
      for (let k = 0; k < 3; k++) col.set([a.r, a.g, a.b], (i + k) * 3);
    }
    canopy.setAttribute("color", new Float32BufferAttribute(col, 3));
    canopy.translate(0, 2.7, 0);
    return mergeGeometries([tint(new CylinderGeometry(0.06, 0.06, 2.9, 6).toNonIndexed().translate(0, 1.45, 0), "#fdf0d5"), canopy]);
  })();
  const spots: [number, number][] = [
    [-14, 110],
    [-31, 106],
    [21, 111],
    [29, 107],
    [-42, 102],
  ];
  const umbrellas = new InstancedMesh(umbrellaGeo, new MeshStandardMaterial({ vertexColors: true, flatShading: true, side: DoubleSide, roughness: 0.8 }), spots.length);
  const towels = new InstancedMesh(new BoxGeometry(1.2, 0.04, 2.2), new MeshStandardMaterial({ roughness: 0.9 }), spots.length);
  spots.forEach(([x, z], i) => {
    tmp.position.set(x, heightAt(x, z) - 0.05, z);
    tmp.rotation.set(0.12, i, 0);
    tmp.updateMatrix();
    umbrellas.setMatrixAt(i, tmp.matrix);
    tmp.position.set(x + 1.4, heightAt(x + 1.4, z + 0.6) + 0.03, z + 0.6);
    tmp.rotation.set(0, i * 0.7, 0);
    tmp.updateMatrix();
    towels.setMatrixAt(i, tmp.matrix);
    towels.setColorAt(i, fc.set([C.sky, "#ffd27a", C.ember, C.paper, C.sky][i]));
    statics.push({ x, z, r: 0.35 });
  });
  umbrellas.castShadow = shadows;
  for (const m of [umbrellas, towels]) {
    m.computeBoundingSphere();
    add(m);
  }

  /* ───── the pier, with a bangka tied up ───── */
  const plank = plankTexture();
  const deckLen = PIER.z1 - PIER.z0 - PIER.ramp;
  plank.repeat.set(1, deckLen / 4);
  const deckMat = new MeshStandardMaterial({ map: plank, roughness: 0.9 });
  const deck = part(new BoxGeometry(PIER.half * 2, 0.3, deckLen), deckMat, PIER.x, PIER.y - 0.15, PIER.z0 + PIER.ramp + deckLen / 2);
  add(deck);
  box({ x: PIER.x, y: PIER.y - 0.15, z: PIER.z0 + PIER.ramp + deckLen / 2, hx: PIER.half, hy: 0.15, hz: deckLen / 2, ry: 0 });
  const slope = Math.atan2(PIER.y, PIER.ramp);
  const rampLen = Math.hypot(PIER.y, PIER.ramp);
  const rampMesh = part(new BoxGeometry(PIER.half * 2, 0.3, rampLen), deckMat, PIER.x, PIER.y / 2 - 0.15, PIER.z0 + PIER.ramp / 2);
  rampMesh.rotation.x = -slope;
  add(rampMesh);
  const posts = new InstancedMesh(new CylinderGeometry(0.18, 0.2, 4, 6), std("#6b4a2b"), 64);
  let np = 0;
  for (let z = PIER.z0 + PIER.ramp; z <= PIER.z1 + 0.01 && np < 62; z += 3)
    for (const side of [-1, 1]) {
      tmp.position.set(PIER.x + side * (PIER.half - 0.15), PIER.y + 0.3 - 2, z);
      tmp.rotation.set(0, 0, 0);
      tmp.updateMatrix();
      posts.setMatrixAt(np++, tmp.matrix);
    }
  posts.count = np;
  posts.computeBoundingSphere();
  add(posts);
  // Low rails along both sides (the jeepney is kept between them)
  for (const side of [-1, 1]) {
    add(part(new BoxGeometry(0.14, 0.14, deckLen), std(C.paper), PIER.x + side * (PIER.half - 0.1), PIER.y + 0.75, PIER.z0 + PIER.ramp + deckLen / 2, false));
    box({ x: PIER.x + side * (PIER.half + 0.1), y: PIER.y + 0.5, z: PIER.z0 + PIER.ramp + deckLen / 2, hx: 0.15, hy: 0.5, hz: deckLen / 2, ry: 0 });
  }
  const railPosts = new InstancedMesh(new BoxGeometry(0.14, 0.8, 0.14), std(C.paper), 40);
  let nr = 0;
  for (let z = PIER.z0 + PIER.ramp; z <= PIER.z1 + 0.01 && nr < 38; z += 2.25)
    for (const side of [-1, 1]) {
      tmp.position.set(PIER.x + side * (PIER.half - 0.1), PIER.y + 0.4, z);
      tmp.updateMatrix();
      railPosts.setMatrixAt(nr++, tmp.matrix);
    }
  railPosts.count = nr;
  railPosts.computeBoundingSphere();
  add(railPosts);
  // End rail and a life ring
  add(part(new BoxGeometry(PIER.half * 2, 0.14, 0.14), std(C.paper), PIER.x, PIER.y + 0.75, PIER.z1 - 0.1, false));
  box({ x: PIER.x, y: PIER.y + 0.5, z: PIER.z1 + 0.1, hx: PIER.half, hy: 0.5, hz: 0.15, ry: 0 });
  const lifeRing = part(new CylinderGeometry(0.42, 0.42, 0.14, 12, 1, true), std(C.ember, { side: DoubleSide }), PIER.x + PIER.half - 0.05, PIER.y + 0.6, PIER.z1 - 3, false);
  lifeRing.rotation.z = Math.PI / 2;
  add(lifeRing);

  // Bangka: a slim hull with bamboo outriggers, bobbing beside the pier
  const boat = new Group();
  const hull = part(new CylinderGeometry(0.75, 0.45, 7, 8, 1), std(C.sky), 0, 0, 0);
  hull.rotation.x = Math.PI / 2;
  hull.scale.set(1, 1, 0.55);
  boat.add(hull);
  boat.add(part(new BoxGeometry(1.2, 0.08, 5.6), std(C.paper), 0, 0.42, 0));
  for (const z of [-1.6, 1.6]) boat.add(part(new BoxGeometry(5.4, 0.1, 0.1), std("#c9a46a"), 0, 0.5, z));
  for (const x of [-2.7, 2.7]) boat.add(part(new CylinderGeometry(0.1, 0.1, 5, 6), std("#c9a46a"), x, 0.15, 0).rotateX(Math.PI / 2));
  boat.position.set(PIER.x + PIER.half + 3.6, -0.3, 132);
  add(boat);
  animated.push({
    update: (t) => {
      boat.position.y = -0.3 + Math.sin(t * 1.3) * 0.12;
      boat.rotation.z = Math.sin(t * 0.9) * 0.05;
      boat.rotation.x = Math.sin(t * 1.1 + 1) * 0.03;
    },
  });

  /* ───── the lookout on the hill ───── */
  const ly2 = heightAt(LOOKOUT.x, LOOKOUT.z);
  const tower = new Group();
  const wood = std("#8a5a3c");
  for (const [x, z] of [
    [-1.4, -1.4],
    [1.4, -1.4],
    [-1.4, 1.4],
    [1.4, 1.4],
  ])
    tower.add(part(new BoxGeometry(0.3, 5.2, 0.3), wood, x, 2.1, z));
  tower.add(part(new BoxGeometry(3.6, 0.25, 3.6), std("#a9794c"), 0, 4.3, 0));
  for (const side of [-1, 1]) {
    tower.add(part(new BoxGeometry(3.6, 0.12, 0.12), std(C.paper), 0, 5.2, side * 1.75, false));
    tower.add(part(new BoxGeometry(0.12, 0.12, 3.6), std(C.paper), side * 1.75, 5.2, 0, false));
  }
  for (const [x, z] of [
    [-1.4, -1.4],
    [1.4, -1.4],
    [-1.4, 1.4],
    [1.4, 1.4],
  ])
    tower.add(part(new BoxGeometry(0.16, 2.2, 0.16), wood, x, 5.5, z));
  tower.add(part(new ConeGeometry(2.9, 1.3, 4), std(C.wine), 0, 7.2, 0).rotateY(Math.PI / 4));
  const scope = part(new CylinderGeometry(0.12, 0.18, 1.1, 10), std(C.ink), 0.6, 5, 0.6);
  scope.rotation.set(0.4, 0, -1.1);
  tower.add(scope);
  // A ladder up the side facing the trail
  for (let i = 0; i < 9; i++) tower.add(part(new BoxGeometry(0.9, 0.07, 0.07), wood, 0, 0.4 + i * 0.47, -1.6, false));
  tower.position.set(LOOKOUT.x, ly2 - 0.2, LOOKOUT.z);
  tower.lookAt(0, tower.position.y, 0);
  add(tower);
  statics.push({ x: LOOKOUT.x, z: LOOKOUT.z, r: 2.3 });
  // A flag on top
  const flag = part(new PlaneGeometry(1, 0.6), std(C.ember, { side: DoubleSide }), 0.5, 0, 0, false);
  const pole = new Group();
  pole.add(part(new CylinderGeometry(0.04, 0.04, 1.6, 5), std(C.paper), 0, 0, 0, false));
  flag.position.set(0.5, 0.5, 0);
  pole.add(flag);
  pole.position.set(LOOKOUT.x, ly2 + 8.4, LOOKOUT.z);
  add(pole);
  animated.push({ update: (t) => (flag.rotation.y = Math.sin(t * 3.1) * 0.35) });

  /* ───── the secret cove: a ring of boulders, open to the island, with a chest ───── */
  const boulders = new InstancedMesh(new DodecahedronGeometry(1, 0), new MeshStandardMaterial({ color: "#b9a58a", flatShading: true, roughness: 1 }), 16);
  let nb = 0;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    // Leave a gap facing inland (+z)
    if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.55) continue;
    const s = 1.5 + ((i * 37) % 7) / 10;
    const x = COVE.x + Math.cos(a) * COVE.r;
    const z = COVE.z + Math.sin(a) * COVE.r;
    tmp.position.set(x, heightAt(x, z) + s * 0.35, z);
    tmp.rotation.set(i, i * 2, 0);
    tmp.scale.set(s, s * 1.15, s);
    tmp.updateMatrix();
    boulders.setMatrixAt(nb++, tmp.matrix);
    statics.push({ x, z, r: s * 0.9 });
  }
  boulders.count = nb;
  boulders.castShadow = shadows;
  boulders.computeBoundingSphere();
  add(boulders);
  const chest = new Group();
  chest.add(part(new BoxGeometry(1.5, 0.8, 1), std("#8a5a3c"), 0, 0.4, 0));
  chest.add(part(new CylinderGeometry(0.5, 0.5, 1.5, 10, 1, false, 0, Math.PI), std("#a9794c"), 0, 0.8, 0).rotateZ(Math.PI / 2).rotateY(Math.PI / 2));
  chest.add(part(new BoxGeometry(0.24, 0.3, 0.06), std("#ffd27a", { metalness: 0.6, roughness: 0.3 }), 0, 0.75, 0.52, false));
  chest.position.set(COVE.x, heightAt(COVE.x, COVE.z - 4.6), COVE.z - 4.6);
  add(chest);
  statics.push({ x: COVE.x, z: COVE.z - 4.6, r: 0.9 });

  // Lit windows and signs at night
  const signMat = bowl.material as MeshStandardMaterial;
  signMat.emissiveMap = signMat.map;
  for (const o of [square, squareRing, lane]) o.receiveShadow = quality > 0;

  return {
    group: g,
    boxes,
    setNight(k: number) {
      windowMat.emissiveIntensity = k * 1.4;
      signMat.emissiveIntensity = k * 0.5;
    },
  };
}

export type Places = ReturnType<typeof buildPlaces>;
