// Run: npx tsx --tsconfig tsconfig.json src/lib/tools/buildit.test.ts
import assert from "node:assert/strict";
import { BASE_WATTS, BOARDS, CASES, CPUS, DEFAULT_BUILD, GPUS, PSUS, RAMS, check, type Build } from "./buildit";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`ok - ${name}`);
};
const level = (b: Partial<Build>, id: string) => check({ ...DEFAULT_BUILD, ...b }).checks.find((c) => c.id === id)?.level;

test("the default build passes every check", () => {
  const r = check(DEFAULT_BUILD);
  assert.equal(r.verdict, "ok");
  assert.ok(r.checks.every((c) => c.level === "ok"), JSON.stringify(r.checks.filter((c) => c.level !== "ok")));
});

test("part ids are unique within each list", () => {
  for (const list of [CPUS, BOARDS, RAMS, GPUS, CASES, PSUS]) assert.equal(new Set(list.map((x) => x.id)).size, list.length);
});

test("socket mismatch fails", () => {
  assert.equal(level({ cpu: "r5-5600" }, "socket"), "fail"); // AM4 on B650
  assert.equal(level({ cpu: "i5-13400f", board: "z790" }, "socket"), "ok");
});

test("memory type must match the board, and the CPU", () => {
  assert.equal(level({ ram: "d4-32" }, "memory"), "fail"); // DDR4 kit, DDR5 board
  assert.equal(level({ cpu: "i5-13400f", board: "b760m-d4", ram: "d4-16" }, "memory"), "ok");
  assert.equal(level({ cpu: "r5-5600", board: "b550", ram: "d4-32" }, "memory"), "ok");
});

test("a four-stick kit doesn't fit a two-slot board", () => {
  assert.equal(level({ board: "b650i", ram: "d5-64" }, "slots"), "fail");
  assert.equal(level({ board: "b650", ram: "d5-64" }, "slots"), "ok");
});

test("board size has to fit the case", () => {
  assert.equal(level({ board: "b650", case: "sff" }, "board-fit"), "fail");
  assert.equal(level({ board: "a620m", case: "matx" }, "board-fit"), "ok");
  assert.equal(level({ board: "b650i", case: "mid" }, "board-fit"), "ok");
});

test("graphics card length: fits, tight (under 15 mm spare) or too long", () => {
  assert.equal(level({ gpu: "rtx4090", case: "matx" }, "gpu-fit"), "fail"); // 336 > 310
  assert.equal(level({ gpu: "rx7800xt", case: "matx" }, "gpu-fit"), "warn"); // 10 mm spare
  assert.equal(level({ gpu: "rtx4090", case: "mid" }, "gpu-fit"), "ok"); // 24 mm spare
});

test("no graphics card is fine only when the CPU has graphics", () => {
  assert.equal(level({ gpu: "none" }, "graphics"), "ok");
  assert.equal(level({ gpu: "none", cpu: "i5-13400f", board: "z790" }, "graphics"), "fail");
  assert.equal(check({ ...DEFAULT_BUILD, gpu: "none" }).checks.some((c) => c.id === "gpu-fit"), false);
});

test("ATX power supplies don't go in the SFX-only case", () => {
  assert.equal(level({ board: "b650i", case: "sff", psu: "650" }, "psu-fit"), "fail");
  assert.equal(level({ board: "b650i", case: "sff", psu: "750sfx" }, "psu-fit"), "ok");
});

test("power headroom: comfortable at 70% or less, tight to 90%, too small beyond", () => {
  const big = { cpu: "i7-14700k", board: "z790", gpu: "rtx4090" } as const; // 253 + 450 + 60 = 763 W
  const r = check({ ...DEFAULT_BUILD, ...big, psu: "650" });
  assert.equal(r.draw, 253 + 450 + BASE_WATTS);
  assert.equal(r.checks.find((c) => c.id === "power")!.level, "fail");
  assert.equal(r.recommended, 1100); // 763 / 0.7 = 1090 → 1100
  assert.equal(level({ ...big, psu: "1000" }, "power"), "warn"); // 76%
  assert.equal(level({ cpu: "r7-7800x3d", gpu: "rx7800xt", psu: "650" }, "power"), "ok"); // 443 W = 68%
  assert.equal(level({ cpu: "r7-7800x3d", gpu: "rtx4070s", psu: "550" }, "power"), "warn"); // 400 W = 73%
});

test("the verdict is the worst single check", () => {
  assert.equal(check({ ...DEFAULT_BUILD, gpu: "rx7800xt", case: "matx", board: "a620m" }).verdict, "warn");
  assert.equal(check({ cpu: "i7-14700k", board: "b650", ram: "d4-32", gpu: "rtx4090", case: "matx", psu: "650" }).verdict, "fail");
});

console.log(`\n${passed} buildit tests passed`);
