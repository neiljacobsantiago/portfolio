import { BufferAttribute, CanvasTexture, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Shape } from "three";
import type { Glows } from "./glow";
import { Batch, bevelBox, C, floodlit, worldMaterial } from "./kit";
import { fanZones, lanterns, letters, toWorld } from "./layout";

// Set dressing: NEIL in big lit letters on the pit building's roof, facing
// the main grandstand across the straight; lamp posts with warm lanterns
// along the verges and the fan zones' promenades (all placed by the plan,
// clear of the walls); benches and bins on the promenades; and the soft
// contact shadow under the car.

const H = 3.2;
const T = 0.9;
const DEPTH = 1.1;

/** Block letters as outlines (x right, y up), chunky enough to read at speed. */
const GLYPHS: Record<string, { w: number; pts: [number, number][] }> = {
  N: { w: 2.9, pts: [[0, 0], [T, 0], [T, 1.6], [2.0, 0], [2.9, 0], [2.9, H], [2.0, H], [2.0, 1.6], [T, H], [0, H]] },
  E: { w: 2.3, pts: [[0, 0], [2.3, 0], [2.3, 0.85], [T, 0.85], [T, 1.18], [2.0, 1.18], [2.0, 2.02], [T, 2.02], [T, 2.35], [2.3, 2.35], [2.3, H], [0, H]] },
  I: { w: 0.95, pts: [[0, 0], [0.95, 0], [0.95, H], [0, H]] },
  L: { w: 2.25, pts: [[0, 0], [2.25, 0], [2.25, 0.9], [T, 0.9], [T, H], [0, H]] },
};

function letterGeometry(ch: string, scale: number, face: Color, side: Color) {
  const glyph = GLYPHS[ch];
  const shape = new Shape();
  glyph.pts.forEach(([x, y], k) => (k ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  shape.closePath();
  const g = new ExtrudeGeometry(shape, { depth: DEPTH / scale, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2, curveSegments: 1 });
  g.translate(-glyph.w / 2, 0.06, -DEPTH / scale / 2);
  g.scale(scale, scale, scale);
  // The front glows like a lit sign; sides and back stay painted
  const n = g.attributes.normal as BufferAttribute;
  const col = new Float32Array(n.count * 3);
  const lit = new Float32Array(n.count);
  for (let i = 0; i < n.count; i++) {
    const front = n.getZ(i) > 0.7;
    const c = front ? face : side;
    col.set([c.r, c.g, c.b], i * 3);
    lit[i] = front ? 2.2 : 0.4;
  }
  g.setAttribute("color", new BufferAttribute(col, 3));
  g.setAttribute("aLit", new BufferAttribute(lit, 1));
  return g;
}

/** A soft, car-shaped pool of shade: darkest between the wheels, fading out past them. */
export function contactShadowTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const g = c.getContext("2d")!;
  const blob = (x: number, y: number, rx: number, ry: number, a: number) => {
    g.save();
    g.translate(x, y);
    g.scale(rx / ry, 1);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, ry);
    grad.addColorStop(0, `rgba(0,0,0,${a})`);
    grad.addColorStop(0.55, `rgba(0,0,0,${a * 0.55})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, ry, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  blob(32, 64, 22, 60, 0.55);
  blob(32, 66, 14, 40, 0.45);
  for (const [x, y] of [
    [12, 30],
    [52, 30],
    [12, 98],
    [52, 98],
  ])
    blob(x, y, 9, 15, 0.5);
  return new CanvasTexture(c);
}

export function buildProps(opts: { glows: Glows; lanterns: number; bigGlow: boolean }) {
  const { glows } = opts;
  const group = new Group();

  /* ── NEIL on the pit roof ── */
  {
    const b = new Batch();
    const face = new Color(C.ember);
    const side = new Color(C.wine);
    for (const s of letters.spots) b.add(letterGeometry(s.ch, letters.scale, face, side).translate(s.x, letters.y, s.z), "#ffffff");
    // A steel frame behind them, the way a rooftop sign is held up
    const x0 = letters.spots[0].x - 4;
    const x1 = letters.spots[letters.spots.length - 1].x + 3;
    const z = letters.spots[0].z - DEPTH / 2 - 0.5;
    b.add(bevelBox(x1 - x0, 0.2, 0.2).translate((x0 + x1) / 2, letters.y + H * letters.scale * 0.9, z), "#5a6068", 0.3);
    b.add(bevelBox(x1 - x0, 0.2, 0.2).translate((x0 + x1) / 2, letters.y + 0.6, z), "#5a6068", 0.3);
    for (let x = x0; x <= x1; x += 3) b.add(bevelBox(0.16, H * letters.scale, 0.16).translate(x, letters.y + (H * letters.scale) / 2, z), "#5a6068", 0.3);
    const mat = floodlit(new MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.05, envMapIntensity: 0.6 }), "letters");
    const m = new Mesh(b.build(), mat);
    m.name = "letters";
    group.add(m);
    for (const s of letters.spots) glows.add(s.x, letters.y + H * letters.scale * 0.5, s.z + 1.2, 6.5, "#ff6a50", 0.25);
  }

  /* ── lamp posts: placed by the plan, round the verges and along the promenades ── */
  const lanternGeo = (() => {
    const b = new Batch();
    const iron = "#262a31";
    b.add(bevelBox(0.42, 0.3, 0.42, 0.04).translate(0, 0.15, 0), iron, 0.3);
    b.add(new CylinderGeometry(0.06, 0.08, 3.1, 8).translate(0, 1.7, 0), iron, 0.25);
    b.add(bevelBox(0.62, 0.07, 0.07, 0.015).translate(0.25, 3.18, 0), iron, 0.25);
    b.add(bevelBox(0.36, 0.06, 0.36, 0.015).translate(0.5, 2.62, 0), iron, 0.3);
    b.add(bevelBox(0.3, 0.42, 0.3, 0.02).translate(0.5, 2.86, 0), "#ffcf86", 3.2);
    b.add(new ConeGeometry(0.3, 0.24, 4).rotateY(Math.PI / 4).translate(0.5, 3.18, 0), iron, 0.3);
    b.add(new CylinderGeometry(0.012, 0.012, 0.12, 4).translate(0.5, 3.06, 0), iron, 0.2);
    return b.build();
  })();
  // Fan-zone lamps first, then the verges, up to the tier's count
  const spots = [...lanterns.filter((l) => l.group), ...lanterns.filter((l) => !l.group)].slice(0, Math.max(opts.lanterns, lanterns.filter((l) => l.group).length));
  const inst = new InstancedMesh(lanternGeo, worldMaterial({ flatShading: false }), spots.length);
  const m = new Matrix4();
  spots.forEach((l, k) => {
    // The arm reaches towards the track (local +z), so the lantern hangs over the walkway
    const ry = l.ry - Math.PI / 2;
    inst.setMatrixAt(k, m.makeRotationY(ry).setPosition(l.x, 0, l.z));
    const h = toWorld({ x: l.x, z: l.z, ry: l.ry }, 0, 0.5);
    glows.add(h.x, 2.86, h.z, 1.7, "#ffc070", 0.95);
    if (opts.bigGlow) glows.add(h.x, 2.6, h.z, 6.5, "#ff9f4a", 0.13);
  });
  inst.computeBoundingSphere();
  inst.name = "lanterns";
  group.add(inst);

  /* ── benches and bins along the promenades ── */
  {
    const b = new Batch();
    for (const zn of fanZones)
      zn.paving.forEach((p, k) => {
        if (k % 2) return;
        const q = toWorld(p, 0, -p.hd + 0.7);
        const mm = new Matrix4().makeRotationY(p.ry).setPosition(q.x, 0, q.z);
        const bench = new Batch();
        bench.add(bevelBox(1.8, 0.08, 0.45, 0.02).translate(0, 0.46, 0), "#8a6a48", 0.45);
        bench.add(bevelBox(1.8, 0.4, 0.06, 0.02).translate(0, 0.72, -0.2).applyMatrix4(new Matrix4().makeRotationX(-0.15)), "#8a6a48", 0.45);
        for (const s of [-0.75, 0.75]) bench.add(bevelBox(0.08, 0.46, 0.45, 0.02).translate(s, 0.23, 0), "#2b3036", 0.3);
        bench.add(new CylinderGeometry(0.24, 0.22, 0.85, 10).translate(1.4, 0.43, 0), "#2b3036", 0.35);
        bench.add(new CylinderGeometry(0.25, 0.25, 0.05, 10).translate(1.4, 0.88, 0), C.ember, 0.6);
        b.add(bench.build().applyMatrix4(mm), "#ffffff");
      });
    if (!b.empty) {
      const mesh = new Mesh(b.build(), worldMaterial({ flatShading: false }));
      mesh.name = "benches";
      group.add(mesh);
    }
  }

  return {
    group,
    /** Lantern count, for the dev log. */
    lanternCount: spots.length,
    /** Nothing round the circuit can be knocked over any more (it all stands behind the walls): no thuds. */
    update(dt: number, car: { x: number; z: number; heading: number; v: number }) {
      void dt;
      void car;
      return 0;
    },
  };
}
export type Props = ReturnType<typeof buildProps>;
