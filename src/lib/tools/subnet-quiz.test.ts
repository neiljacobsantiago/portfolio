// Run: npx tsx --tsconfig tsconfig.json src/lib/tools/subnet-quiz.test.ts
import assert from "node:assert/strict";
import { BANK } from "@/content/quiz-bank";
import { fromCard, makeQuestion, makeRound, ROUND_LENGTH, type QuizQuestion } from "./subnet-quiz";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`ok - ${name}`);
};

/** Small seeded PRNG (mulberry32) so failures are reproducible. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wellFormed(q: QuizQuestion, where: string) {
  assert.equal(q.options.length, 4, `${where}: four options`);
  assert.equal(new Set(q.options).size, 4, `${where}: no duplicate options ${JSON.stringify(q.options)}`);
  assert.ok(q.options.includes(q.answer), `${where}: answer "${q.answer}" is among ${JSON.stringify(q.options)}`);
  for (const o of q.options) assert.ok(o.trim().length > 0, `${where}: empty option`);
  assert.ok(q.prompt.length > 5 && q.why.length > 5, `${where}: prompt and explanation`);
  assert.ok(!/[→↗▶✓✕]/.test(q.prompt + q.why + q.tag + q.options.join("")), `${where}: no glyph arrows or ticks`);
}

// Independent IPv4 maths (not the Lab's subnet()) to check generated answers.
const ipInt = (ip: string) => ip.split(".").reduce((n, p) => n * 256 + Number(p), 0) >>> 0;
const intIp = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
const maskInt = (p: number) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);
const netOf = (ip: string, p: number) => (ipInt(ip) & maskInt(p)) >>> 0;
const bcastOf = (ip: string, p: number) => (netOf(ip, p) | (~maskInt(p) >>> 0)) >>> 0;

function expected(q: QuizQuestion): string {
  const cidr = q.prompt.match(/(\d+\.\d+\.\d+\.\d+)\/(\d+)/);
  const prefix = q.prompt.match(/\/(\d+)\?/);
  switch (q.kind) {
    case "hosts":
      return String(2 ** (32 - Number(prefix![1])) - 2);
    case "mask":
      return intIp(maskInt(Number(prefix![1])));
    case "wildcard":
      return intIp(~maskInt(Number(prefix![1])) >>> 0);
    case "first":
      return intIp(netOf(cidr![1], Number(cidr![2])) + 1);
    case "network":
      return intIp(netOf(cidr![1], Number(cidr![2])));
    case "broadcast":
      return intIp(bcastOf(cidr![1], Number(cidr![2])));
    case "contains": {
      const ip = q.prompt.match(/(\d+\.\d+\.\d+\.\d+) belong/)![1];
      const p = Number(q.answer.split("/")[1]);
      // Exactly one option may contain the host, and it must be the answer
      const holders = q.options.filter((o) => {
        const [n, bits] = o.split("/");
        return netOf(ip, Number(bits)) === ipInt(n) && Number(bits) === p;
      });
      assert.equal(holders.length, 1, `exactly one subnet holds ${ip}: ${JSON.stringify(q.options)}`);
      return holders[0];
    }
    case "subnets": {
      const [, small, big] = q.prompt.match(/\/(\d+) subnets fit in a \/(\d+)/)!.map(Number);
      return String(2 ** (small - big));
    }
    default:
      throw new Error(`not a subnet question: ${q.kind}`);
  }
}

test("bank cards are well formed, unique and short", () => {
  assert.ok(BANK.filter((c) => c.category === "networks").length >= 30, "plenty of networking cards");
  assert.ok(BANK.filter((c) => c.category === "security").length >= 30, "plenty of security cards");
  assert.equal(new Set(BANK.map((c) => c.id)).size, BANK.length, "unique ids");
  assert.equal(new Set(BANK.map((c) => c.prompt)).size, BANK.length, "unique prompts");
  for (const c of BANK) {
    assert.ok(!c.wrong.includes(c.answer), `${c.id}: answer is not also a wrong option`);
    wellFormed(fromCard(c, seeded(1)), c.id);
    assert.ok(c.why.length <= 160, `${c.id}: explanation stays short (${c.why.length})`);
  }
});

test("generated subnet questions: answers among four distinct choices, and correct", () => {
  for (const level of [1, 2, 3] as const) {
    const rand = seeded(level * 1000);
    for (let i = 0; i < 600; i++) {
      const q = makeQuestion(level, rand);
      wellFormed(q, `L${level} #${i} ${q.prompt}`);
      assert.equal(q.answer, expected(q), `L${level} #${i}: ${q.prompt}`);
      assert.ok(q.hint, "subnet questions carry a hint");
    }
  }
});

test("level 1 sticks to a /24 and level 2 to /25 through /28", () => {
  for (let i = 0; i < 200; i++) {
    const a = makeQuestion(1, seeded(i));
    assert.match(a.prompt, /\/24\b/, a.prompt);
    const b = makeQuestion(2, seeded(i + 500));
    const p = Number(b.prompt.match(/\/(\d+)/)![1]);
    assert.ok(p >= 25 && p <= 28, b.prompt);
  }
});

test("rounds: right length, right categories, no repeats, beginner cards first", () => {
  for (const mode of ["networks", "security", "mixed"] as const) {
    for (let seed = 0; seed < 50; seed++) {
      const round = makeRound(mode, { rand: seeded(seed) });
      assert.equal(round.length, ROUND_LENGTH, `${mode} length`);
      assert.equal(new Set(round.map((q) => q.id)).size, round.length, `${mode}: no repeated questions`);
      round.forEach((q, i) => wellFormed(q, `${mode} #${i}`));
      if (mode !== "mixed") assert.ok(round.every((q) => q.category === mode), `${mode}: one category`);
      else {
        assert.ok(round.some((q) => q.category === "security"), "mixed has security");
        assert.ok(round.some((q) => q.category === "networks"), "mixed has networks");
      }
      if (mode === "security") assert.ok(round.slice(0, 4).every((q) => BANK.find((c) => c.id === q.id)!.level === 1), "opens with beginner cards");
      if (mode !== "security") assert.ok(round.some((q) => q.kind !== "card"), `${mode}: includes subnetting`);
    }
  }
});

test("a replay deals cards it hasn't shown yet", () => {
  const first = makeRound("security", { rand: seeded(3) });
  const recent = new Set(first.map((q) => q.id));
  const second = makeRound("security", { rand: seeded(4), recent });
  assert.equal(second.filter((q) => recent.has(q.id)).length, 0, "no overlap while fresh cards remain");
});

console.log(`\n${passed} passed`);
