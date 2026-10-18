// Run: npx tsx --tsconfig tsconfig.json src/lib/tools/pathoscan.test.ts
import assert from "node:assert/strict";
import { SPECIES, THRESHOLD, TRAITS, screen } from "./pathoscan";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`ok - ${name}`);
};

test("at or above the bar: confident enough for preliminary screening", () => {
  for (const c of [THRESHOLD, 94, 100]) {
    const r = screen("A. flavus", c);
    assert.equal(r.decision, "confident");
    assert.match(r.detail, /preliminary screening/);
  }
});

test("below the bar: look twice, never a required lab procedure", () => {
  const r = screen("tamarii", 89.5);
  assert.equal(r.top, "A. tamarii");
  assert.equal(r.decision, "look-twice");
  assert.match(r.headline, /look twice/i);
  assert.match(r.detail, /false positive/);
  assert.ok(r.next.some((n) => /re-scan/i.test(n)));
  assert.ok(r.next.some((n) => /colony traits/i.test(n)));
  assert.ok(r.next.some((n) => /lab sees fit/i.test(n)));
});

test("no wording anywhere says PCR is required", () => {
  for (const s of SPECIES) {
    for (const c of [20, 50, 89.9, 90, 99]) {
      const r = screen(s, c);
      const text = [r.headline, r.detail, ...r.next].join(" ");
      assert.doesNotMatch(text, /\bPCR\b/, `${s} ${c}`);
      assert.doesNotMatch(text, /required|must be/i, `${s} ${c}`);
    }
  }
});

test("Unknown is its own outcome, whatever the confidence", () => {
  assert.equal(screen("Unknown", 99).decision, "unknown");
  assert.equal(screen("unknown", 40).decision, "unknown");
});

test("the probability matrix sums to about 100 and leads with the top match", () => {
  for (const c of [20, 63.5, 90, 100]) {
    const r = screen("Aspergillus niger", c);
    assert.equal(r.matrix[0].label, "A. niger");
    assert.equal(r.matrix.length, SPECIES.length);
    const sum = r.matrix.reduce((s, m) => s + m.value, 0);
    assert.ok(Math.abs(sum - 100) < 0.5, `${c}: ${sum}`);
  }
});

test("every named species has reference colony traits", () => {
  for (const s of SPECIES.filter((x) => x !== "Unknown")) assert.ok(TRAITS[s as keyof typeof TRAITS].surface, s);
});

test("unknown species names fall back, confidence is clamped", () => {
  assert.equal(screen("nonsense", 95).top, "A. flavus");
  assert.equal(screen("A. flavus", 140).confidence, 100);
  assert.equal(screen("A. flavus", -5).confidence, 1);
});

console.log(`\n${passed} pathoscan tests passed`);
