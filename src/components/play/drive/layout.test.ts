// Run: npx tsx --tsconfig tsconfig.json src/components/play/drive/layout.test.ts
//
// Nothing round the circuit may stand on the racing surface, the kerbs, the
// run-off or the walls, or in anything else: every footprint in the plan is
// checked against the drivable area (circuit within its walls, and the pit
// lane) measured from every stretch of track nearby, and against every other
// footprint. Pavilions also need a clear view of the track.
import assert from "node:assert/strict";
import {
  buildings,
  claimPoints,
  claims,
  compatible,
  fanZones,
  footbridge,
  lanterns,
  letters,
  MIN_CLEAR,
  overlaps,
  pavilions,
  pitBuilding,
  planTrees,
  pylons,
  stands,
  startGantry,
  toWorld,
  treeFits,
  worstClearance,
  type Claim,
} from "./layout";
import { clearance, HALF, inWater, KERB, landmarks, locate, N, PLOT, samples, wallOffset, WALL_T } from "./track";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`✓ ${name}`);
};
const where = (c: Claim) => `${c.kind} ${c.id} at (${c.x.toFixed(1)}, ${c.z.toFixed(1)})`;

test("clearance agrees with the walls: zero at the wall face, negative on the track", () => {
  for (let i = 0; i < N; i += 7) {
    const p = samples[i];
    for (const side of [1, -1] as const) {
      const o = wallOffset(i, side);
      const q = (d: number) => ({ x: p.x - p.tz * side * d, z: p.z + p.tx * side * d });
      const c0 = q(0);
      assert.ok(clearance(c0.x, c0.z) < -HALF + 0.01, `centre line at ${i} reads ${clearance(c0.x, c0.z)}`);
      const k = q(HALF + KERB);
      assert.ok(clearance(k.x, k.z) < 0, `kerb at ${i} side ${side}`);
      const f = q(o);
      assert.ok(clearance(f.x, f.z) <= 0.05, `wall face at ${i} side ${side}: ${clearance(f.x, f.z)}`);
    }
  }
});

test("every footprint keeps clear of the track, kerbs, run-off, walls and pit lane", () => {
  const bad: string[] = [];
  for (const c of claims) {
    const w = worstClearance(c);
    if (w < MIN_CLEAR[c.kind] - 0.02) bad.push(`${where(c)}: ${w.toFixed(2)} m, needs ${MIN_CLEAR[c.kind]}`);
  }
  assert.deepEqual(bad, [], `${bad.length} footprints too close:\n  ${bad.slice(0, 30).join("\n  ")}`);
});

test("nothing stands in the water", () => {
  // The lotus museum stands on its point and leans out over the water: only its middle needs land
  const bad = claims.filter((c) => (c.kind === "landmark" ? inWater(c.x, c.z) : claimPoints(c, 3).some((p) => inWater(p.x, p.z)))).map(where);
  assert.deepEqual(bad, []);
});

test("no two footprints overlap", () => {
  const bad: string[] = [];
  for (let a = 0; a < claims.length; a++)
    for (let b = a + 1; b < claims.length; b++) {
      const A = claims[a];
      const B = claims[b];
      if (compatible(A, B)) continue;
      if (overlaps(A, B, 0.01)) bad.push(`${where(A)} × ${where(B)}`);
    }
  assert.deepEqual(bad, [], `${bad.length} overlaps:\n  ${bad.slice(0, 30).join("\n  ")}`);
});

test("pavilions: one per landmark, on a full plot, squared to the track and facing it", () => {
  assert.equal(pavilions.length, landmarks.length);
  for (const p of pavilions) {
    assert.equal(p.hw, PLOT.hw);
    assert.equal(p.hd, PLOT.hd);
    // Front (+z) points at the track: the front edge is nearer the centre line than the back
    const f = toWorld(p, 0, p.hd);
    const b = toWorld(p, 0, -p.hd);
    assert.ok(locate(f.x, f.z).dist < locate(b.x, b.z).dist - 15, `${p.id} faces the track`);
    // The front edge runs parallel to the wall: its corners are within a metre of the same room
    const l = toWorld(p, -p.hw, p.hd);
    const r = toWorld(p, p.hw, p.hd);
    const cl = [clearance(l.x, l.z), clearance(f.x, f.z), clearance(r.x, r.z)];
    assert.ok(Math.max(...cl) - Math.min(...cl) < 2.5, `${p.id} front edge is square to the wall: ${cl.map((v) => v.toFixed(2))}`);
  }
});

test("pavilion zones cover the track abreast and never overlap one another", () => {
  for (const l of landmarks) {
    const h = locate(l.x, l.z);
    assert.ok(l.zone >= h.dist + HALF, `${l.id}: zone ${l.zone.toFixed(1)} reaches across the track (${h.dist.toFixed(1)} m away)`);
  }
  for (let a = 0; a < landmarks.length; a++)
    for (let b = a + 1; b < landmarks.length; b++) {
      const A = landmarks[a];
      const B = landmarks[b];
      assert.ok(Math.hypot(A.x - B.x, A.z - B.z) > A.zone + B.zone, `${A.id} and ${B.id} zones overlap`);
    }
});

test("every pavilion is in plain view from the track", () => {
  for (const p of pavilions) {
    const l = landmarks.find((x) => x.id === p.id)!;
    const s = samples[Math.round(l.frac * N) % N];
    // From the near half of the track to three points on the pavilion's front
    for (const lx of [-p.hw * 0.6, 0, p.hw * 0.6]) {
      const t = toWorld(p, lx, p.hd - 0.5);
      for (const d of [-3, 0, 3]) {
        const ox = s.x - s.tz * d;
        const oz = s.z + s.tx * d;
        for (let k = 1; k < 40; k++) {
          const x = ox + ((t.x - ox) * k) / 40;
          const z = oz + ((t.z - oz) * k) / 40;
          for (const c of claims) {
            if (c === p || c.ground || c.kind === "lantern" || c.kind === "leg") continue;
            const q = { ...c, hw: c.hw, hd: c.hd };
            const pt: Claim = { kind: "lantern", id: "", x, z, ry: 0, hw: 0.01, hd: 0.01, h: 0, round: true };
            assert.ok(!overlaps(q, pt), `${where(c)} blocks the view of ${p.id}`);
          }
        }
      }
    }
  }
});

test("fan zones: three pavilions each, a promenade, kiosks, screens and gates", () => {
  assert.equal(fanZones.length, 3);
  for (const z of fanZones) {
    assert.equal(pavilions.filter((p) => p.group === z.id).length, 3, z.id);
    assert.ok(z.paving.length > 10 && z.kiosks.length === 4 && z.screens.length === 2 && z.gates.length === 2, z.id);
  }
});

test("spans over the track stand on legs beyond both walls, with room under the deck", () => {
  for (const s of [startGantry, footbridge]) {
    assert.ok(s.clear >= 6.5, `${s.id} clearance`);
    const sides = s.legs.map((l) => Math.sign(locate(l.x, l.z).d));
    assert.deepEqual(sides.sort(), [-1, 1], `${s.id} has a leg each side`);
    for (const l of s.legs) assert.ok(worstClearance(l) >= MIN_CLEAR.leg - 0.02, `${l.id}`);
  }
});

test("stands, pylons and lanterns are all placed", () => {
  assert.equal(stands.length, 6);
  assert.ok(pylons.length > 55, `${pylons.length} pylons`);
  assert.ok(lanterns.length > 40, `${lanterns.length} lanterns`);
  assert.ok(buildings.length > 150, `${buildings.length} buildings`);
});

test("the NEIL letters stand on the pit building's roof", () => {
  for (const p of letters.spots) {
    const dx = p.x - pitBuilding.x;
    const dz = p.z - pitBuilding.z;
    assert.ok(Math.abs(dx) < pitBuilding.hw - 2 && Math.abs(dz) < pitBuilding.hd, `letter at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
  }
  assert.ok(letters.y >= pitBuilding.h - 0.6);
});

test("trees on every tier keep off the circuit, out of the water and clear of everything", () => {
  for (const counts of [
    { trees: 110, shrubs: 70 },
    { trees: 220, shrubs: 150 },
    { trees: 340, shrubs: 240 },
  ]) {
    const trees = planTrees(counts);
    assert.ok(trees.length > counts.trees * 0.8, `${trees.length} of ${counts.trees + counts.shrubs}`);
    for (const t of trees) {
      const r = t.s * (t.shrub ? 1.25 : 1.3);
      assert.ok(treeFits(t.x, t.z, r), `tree at ${t.x.toFixed(1)}, ${t.z.toFixed(1)}`);
      assert.ok(clearance(t.x, t.z) >= r + WALL_T, `tree canopy over the wall at ${t.x.toFixed(1)}, ${t.z.toFixed(1)}`);
    }
  }
});

console.log(`\n${passed} passed`);
