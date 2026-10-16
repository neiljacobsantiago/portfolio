// Run: npx tsx --tsconfig tsconfig.json src/lib/neilai/suggest.test.ts
import assert from "node:assert/strict";
import { seriesList } from "@/content/series";
import { services } from "@/content/sessions";
import { projects } from "@/content/work";
import { localAnswer } from "@/lib/neil-faq";
import { seeded } from "./random";
import { familyOf, norm, pageContext, pickSuggestions, POOL, relatedTopics, topicOf } from "./suggest";
import { greeting, spotlight, surprise } from "./variety";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`✓ ${name}`);
};
const texts = (opts: Parameters<typeof pickSuggestions>[0]) => pickSuggestions(opts).map((s) => s.text);

test("the pool covers every project, collection and photo service", () => {
  assert.ok(POOL.length > 120, `pool has ${POOL.length}`);
  for (const p of projects) assert.ok(POOL.some((s) => s.topic === `project:${p.slug}`), p.slug);
  for (const s of seriesList) assert.ok(POOL.some((x) => x.topic === `collection:${s.slug}`), s.slug);
  for (const s of services) assert.ok(POOL.some((x) => x.topic === `service:${s.id}`), s.id);
  assert.equal(new Set(POOL.map((s) => norm(s.text))).size, POOL.length, "no duplicate prompts");
});

test("deterministic with a fixed seed", () => {
  const opts = { seed: 42, round: 3, path: "/photography", topic: "collection:concerts" };
  assert.deepEqual(texts(opts), texts(opts));
  assert.deepEqual(texts({ seed: 7, round: 0, path: "/" }), texts({ seed: 7, round: 0, path: "/" }));
});

test("different seeds, rounds and pages deal different chips", () => {
  const sets = new Set(Array.from({ length: 20 }, (_, i) => texts({ seed: i, round: 0, path: "/" }).join("|")));
  assert.ok(sets.size >= 15, `only ${sets.size} distinct sets from 20 seeds`);
  assert.notDeepEqual(texts({ seed: 1, round: 0, path: "/" }), texts({ seed: 1, round: 1, path: "/" }));
  assert.notDeepEqual(texts({ seed: 1, round: 0, path: "/lab" }), texts({ seed: 1, round: 0, path: "/photography" }));
});

test("no repeats: never two on one topic, never anything asked or shown lately", () => {
  for (let seed = 0; seed < 50; seed++) {
    const set = pickSuggestions({ seed, round: 0, path: "/" });
    assert.equal(set.length, 3);
    assert.equal(new Set(set.map((s) => s.topic)).size, 3, "one chip per topic");
  }
  const seen: string[] = [];
  let topic: string | null = null;
  for (let round = 0; round < 25; round++) {
    const set = pickSuggestions({ seed: 99, round, path: "/work/buildit", exclude: seen, topic });
    for (const s of set) assert.ok(!seen.map(norm).includes(norm(s.text)), `round ${round} repeated “${s.text}”`);
    seen.push(...set.map((s) => s.text));
    topic = set[0].topic;
  }
  assert.equal(new Set(seen).size, seen.length, "75 chips over 25 rounds, all different");
});

test("page weighting: the page leads, but one chip always wanders", () => {
  const runs = 400;
  const lead = (path: string, ok: (theme: string, topic: string) => boolean) =>
    Array.from({ length: runs }, (_, seed) => pickSuggestions({ seed, round: 0, path })[0]).filter((s) => ok(s.theme, s.topic)).length / runs;

  const photo = lead("/photography", (t) => t === "photo" || t === "booking");
  const lab = lead("/lab", (t) => t === "lab");
  const project = lead("/work/buildit", (_, topic) => pageContext("/work/buildit").topics.includes(topic));
  assert.ok(photo > 0.75, `photography page led with photo/booking ${Math.round(photo * 100)}%`);
  assert.ok(lab > 0.6, `lab page led with lab ${Math.round(lab * 100)}%`);
  assert.ok(project > 0.5, `buildit page led with buildit ${Math.round(project * 100)}%`);
  // Baseline: the home page doesn't lead with the Lab most of the time.
  assert.ok(lead("/", (t) => t === "lab") < 0.25);

  for (let seed = 0; seed < 100; seed++) {
    const last = pickSuggestions({ seed, round: 0, path: "/photography" })[2];
    assert.ok(!["photo", "booking"].includes(last.theme), `wanderer stayed on the page: ${last.text}`);
  }
});

test("follow-ups relate to the last topic", () => {
  const topic = "project:pathoscan";
  const near = new Set([topic, ...relatedTopics(topic)]);
  const related = Array.from({ length: 200 }, (_, seed) => pickSuggestions({ seed, round: 1, path: "/", topic })[0]).filter(
    (s) => near.has(s.topic) || familyOf(s.topic) === familyOf(topic),
  ).length;
  assert.ok(related > 180, `only ${related}/200 lead chips followed up`);
});

test("topics are recognised from chips, cards and free text", () => {
  assert.equal(topicOf("What's BuildIT?"), "project:buildit");
  assert.equal(topicOf("anything", [{ kind: "collection", slug: "astro", title: "Astrophotography", count: 3, cover: null }]), "collection:astro");
  assert.equal(topicOf("tell me about kamikazee"), "local:Kamikazee");
  assert.equal(topicOf("gibberish zzz"), null);
});

test("every suggestion has a real offline answer (no fallback)", () => {
  const missing = POOL.filter((s) => /outside what I know offline|don't have that one offline|beyond my offline notes/.test(localAnswer(s.text, { rng: seeded(3) }).text));
  assert.deepEqual(missing.map((s) => s.text), [], "every chip is answerable offline");
});

test("offline answers vary in wording", () => {
  const variants = new Set(Array.from({ length: 30 }, (_, i) => localAnswer("Who is Neil?", { rng: seeded(i) }).text));
  assert.ok(variants.size >= 2);
  const recs = new Set(Array.from({ length: 30 }, (_, i) => localAnswer("Recommend a project to look at", { rng: seeded(i) }).cards?.map((c) => JSON.stringify(c)).join()));
  assert.ok(recs.size >= 8, `recommendations rotate (${recs.size} distinct)`);
});

test("surprise me covers every kind and skips recent topics", () => {
  const kinds = new Set(Array.from({ length: 300 }, (_, i) => surprise(seeded(i)).topic.split(":")[0]));
  for (const k of ["project", "collection", "tool", "game", "local"]) assert.ok(kinds.has(k), `never surprised with a ${k}`);
  const avoid = ["project:pathoscan", "collection:concerts"];
  for (let i = 0; i < 200; i++) assert.ok(!avoid.includes(surprise(seeded(i), avoid).topic));
});

test("greetings and spotlight vary but stay steady per seed", () => {
  const hellos = new Set(Array.from({ length: 20 }, (_, i) => greeting("/", 9, seeded(i)).join(" ")));
  assert.ok(hellos.size >= 10);
  assert.notEqual(greeting("/", 9, seeded(1))[0].slice(0, 12), greeting("/", 23, seeded(1))[0].slice(0, 12));
  assert.deepEqual(spotlight(5), spotlight(5));
  assert.ok(new Set(Array.from({ length: 10 }, (_, i) => spotlight(i)[0])).size >= 4, "spotlight leads with different projects");
});

console.log(`\n${passed} passed`);
