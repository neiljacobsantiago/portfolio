// Run: npx tsx --tsconfig tsconfig.json src/lib/neilai/suggest.test.ts
import assert from "node:assert/strict";
import { seriesList } from "@/content/series";
import { services } from "@/content/sessions";
import { projects } from "@/content/work";
import { localAnswer } from "@/lib/neil-faq";
import { fixFacts, gearList } from "./facts";
import { parseRich, plainText, tidyReply } from "./format";
import { emptyMemory, historyOf, loadMemory, rememberDeal, storeDeal } from "./memory";
import { mix, seeded } from "./random";
import { isSafeHref } from "./sources";
import { familyOf, intentOf, norm, pageContext, pickSuggestions, POOL, relatedTopics, topicOf, type ChipMeta, type Suggestion } from "./suggest";
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
  const missing = POOL.filter((s) => /outside what I know offline|don't have that one offline|beyond my offline notes|can't search the web/.test(localAnswer(s.text, { rng: seeded(3) }).text));
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

/* ------------------------------------------------------------------ */
/* Repetition, measured                                                */
/* ------------------------------------------------------------------ */

const PAGES = ["/", "/photography", "/work/buildit", "/lab", "/about"];
const counts = (xs: string[]) => xs.reduce<Record<string, number>>((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {});
const maxOf = (m: Record<string, number>) => Math.max(0, ...Object.values(m));
const meta = (deal: Suggestion[]): ChipMeta[] => deal.map(({ topic, theme, template }) => ({ topic, theme, template }));

/** 20 openings, each a separate visit (new tab, new seed, nothing in sessionStorage), with the browser's chip memory carried over. */
function twentyVisits(path: string, start = 1) {
  const rng = seeded(start * 7919 + path.length);
  let memory = emptyMemory(1_700_000_000_000);
  const deals: Suggestion[][] = [];
  for (let i = 0; i < 20; i++) {
    const now = memory.at + i * 2 * 3_600_000; // a visit every two hours
    const deal = pickSuggestions({ seed: Math.floor(rng() * 2 ** 32), round: 0, path, exclude: memory.recent, history: historyOf({ ...memory, at: now }, []) });
    memory = rememberDeal(memory, deal, now);
    deals.push(deal);
  }
  return deals;
}

/** 20 open/close cycles in one tab: one seed, the visit's own seen list and deals. */
function twentyOpenings(path: string) {
  const seed = 4242 + path.length;
  const seen: string[] = [];
  const deals: Suggestion[][] = [];
  for (let opens = 1; opens <= 20; opens++) {
    const deal = pickSuggestions({ seed: mix(seed, opens), round: 0, path, exclude: seen, history: { deals: deals.slice(-6).map(meta) } });
    seen.push(...deal.map((s) => s.text));
    deals.push(deal);
  }
  return deals;
}

test("20 visits: no chip (or rephrasing of it) more than once, leads never repeat back to back", () => {
  for (const path of PAGES) {
    for (const start of [1, 2, 3]) {
      const deals = twentyVisits(path, start);
      const all = deals.flat();
      assert.equal(maxOf(counts(all.map((s) => s.text))), 1, `${path}: a chip came back within 20 visits`);
      assert.ok(maxOf(counts(all.map(intentOf))) <= 1, `${path}: the same question came back reworded`);
      const leads = deals.map((d) => d[0]);
      assert.equal(new Set(leads.map((s) => s.text)).size, 20, `${path}: an opening chip repeated`);
      assert.equal(leads.filter((s, i) => i && leads[i - 1].topic === s.topic).length, 0, `${path}: same opening topic twice in a row`);
      assert.ok(leads.filter((s, i) => i && leads[i - 1].template === s.template).length <= 1, `${path}: same opening template twice in a row`);
      // One question shape can't take over: no template on more than 10% of the 60 chips.
      assert.ok(maxOf(counts(all.map((s) => s.template))) <= 6, `${path}: ${JSON.stringify(Object.entries(counts(all.map((s) => s.template))).sort((a, b) => b[1] - a[1])[0])}`);
    }
  }
});

test("20 visits: themes spread out, and the home page's lead rotates through its themes", () => {
  for (const path of ["/", "/about", "/photography"]) {
    const deals = twentyVisits(path);
    const all = deals.flat();
    const themes = counts(all.map((s) => s.theme));
    assert.ok(Object.keys(themes).length >= 6, `${path}: only ${Object.keys(themes).length} themes in 60 chips`);
    assert.ok(maxOf(themes) / all.length <= 0.35, `${path}: one theme took ${Math.round((maxOf(themes) / all.length) * 100)}% of chips`);
    const leads = deals.map((d) => d[0].theme);
    assert.ok(leads.filter((t, i) => i && leads[i - 1] === t).length <= 2, `${path}: lead theme repeated back to back: ${leads.join(",")}`);
  }
  const home = twentyVisits("/").map((d) => d[0].theme);
  for (const t of ["work", "photo", "about"]) assert.ok(home.includes(t as Suggestion["theme"]), `home page never led with ${t}`);
});

test("20 openings in one tab: nothing repeats and the lead keeps changing theme", () => {
  for (const path of PAGES) {
    const deals = twentyOpenings(path);
    assert.equal(maxOf(counts(deals.flat().map((s) => s.text))), 1, path);
    const leads = deals.map((d) => d[0]);
    assert.equal(leads.filter((s, i) => i && leads[i - 1].topic === s.topic).length, 0, `${path}: same lead topic twice in a row`);
    if (pageContext(path).themes.length > 1) assert.equal(leads.filter((s, i) => i && leads[i - 1].theme === s.theme).length, 0, `${path}: same lead theme twice in a row`);
  }
});

test("follow-ups vary: tapping the lead chip ten times doesn't drill into one topic", () => {
  for (const path of ["/", "/work/pathoscan", "/photography"]) {
    for (let s = 1; s <= 5; s++) {
      const seen: string[] = [];
      const deals: Suggestion[][] = [];
      let topic: string | null = null;
      for (let round = 0; round < 10; round++) {
        const deal = pickSuggestions({ seed: s * 31, round, path, exclude: seen, topic, history: { deals: deals.slice(-6).map(meta) } });
        seen.push(...deal.map((x) => x.text));
        deals.push(deal);
        topic = deal[0].topic;
      }
      const leads = deals.map((d) => d[0]);
      // Never three leads in a row on one topic, and never the same question shape back to back.
      assert.ok(!leads.some((x, i) => i > 1 && leads[i - 1].topic === x.topic && leads[i - 2].topic === x.topic), `${path}: ${leads.map((x) => x.text).join(" | ")}`);
      assert.equal(leads.filter((x, i) => i && leads[i - 1].template === x.template).length, 0, `${path}: ${leads.map((x) => x.text).join(" | ")}`);
      assert.ok(new Set(leads.map((x) => x.topic)).size >= 6, `${path}: follow-ups stayed on ${new Set(leads.map((x) => x.topic)).size} topics`);
    }
  }
});

test("shown chips decay: a chip shown long ago can return, one shown just now is held back", () => {
  const deal = pickSuggestions({ seed: 5, round: 0, path: "/" });
  const memory = rememberDeal(emptyMemory(0), deal, 0);
  const share = (now: number) => {
    let hits = 0;
    for (let seed = 0; seed < 400; seed++) {
      const d = pickSuggestions({ seed, round: 0, path: "/", history: historyOf({ ...memory, at: now }, []) });
      if (d.some((s) => deal.some((x) => intentOf(x) === intentOf(s)))) hits++;
    }
    return hits;
  };
  assert.ok(share(60_000) < share(30 * 24 * 3_600_000), "an old showing weighs less than a fresh one");
});

test("chip memory survives a reload and shrugs off junk", () => {
  const store = new Map<string, string>();
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  const deal = pickSuggestions({ seed: 1, round: 0, path: "/" });
  storeDeal(deal, storage, 1000);
  const back = loadMemory(storage, 2000);
  assert.deepEqual(back.recent, deal.map(intentOf));
  assert.equal(back.deals.length, 1);
  store.set("neilai-chips-v1", "{not json");
  assert.deepEqual(loadMemory(storage, 0).recent, []);
  store.set("neilai-chips-v1", JSON.stringify({ v: 1, recent: [1, "a|b"], shown: { x: { n: "?", t: 1 } }, deals: [[{ nope: 1 }]] }));
  const junk = loadMemory(storage, 0);
  assert.deepEqual(junk.recent, ["a|b"]);
  assert.deepEqual(junk.shown, {});
  assert.deepEqual(junk.deals, []);
});

/* ------------------------------------------------------------------ */
/* Fuller answers, safe formatting, corrected facts, web search        */
/* ------------------------------------------------------------------ */

test("the reply formatter keeps paragraphs, lists and bold, and drops everything else", () => {
  const raw = "## Heading\nSure! See [the docs](https://evil.example/x) or https://x.y/z.\n\n* one\n* **two**\n\n1) first\n2) second\n<script>alert(1)</script> `code` *soft*";
  const tidy = tidyReply(raw);
  assert.ok(!/https?:|\[|\]\(|`|^#/m.test(tidy), tidy);
  const blocks = parseRich(tidy);
  assert.deepEqual(blocks.map((b) => b.type), ["p", "ul", "ol", "p"]);
  assert.deepEqual(blocks[1].type === "ul" && blocks[1].items[1], [{ text: "two", bold: true }]);
  // Raw HTML is just text: it's rendered as a text node, never parsed.
  assert.ok(plainText(tidy).includes("<script>"));
  // Mid-typewriter, an unclosed ** doesn't leak.
  assert.deepEqual(parseRich("A **bol").flatMap((b) => (b.type === "p" ? b.lines.flat() : [])), [{ text: "A bol", bold: false }]);
});

test("offline answers are fuller: a direct line plus specifics", () => {
  for (const q of ["Who is Neil?", "What's PathoScan?", "What did Neil do on BuildIT?", "How do I book a shoot?", "What certificates does he have?", "What's in his camera bag?", "How much for a website?"]) {
    const text = localAnswer(q, { rng: seeded(2) }).text;
    const words = plainText(text).split(/\s+/).length;
    assert.ok(words >= 40, `“${q}” got only ${words} words`);
    assert.ok(parseRich(text).length >= 2, `“${q}” is one block`);
  }
});

test("corrected facts: PathoScan threshold, ProRAW, pricing, third parties, what's new", () => {
  const all = (q: string) => Array.from({ length: 12 }, (_, i) => localAnswer(q, { rng: seeded(i) }).text).join("\n");
  const pathoscan = all("What's PathoScan?") + all("Why does PathoScan use a 90% threshold?") + all("Is 87% A. niger cleared?") + all("Would 95% A. flavus pass PathoScan?");
  assert.ok(!/\bPCR\b/.test(pathoscan), "no PCR claims");
  assert.ok(/look twice/.test(all("Is 87% A. niger cleared?")));
  assert.ok(/false positive/i.test(all("Why does PathoScan use a 90% threshold?")));
  assert.ok(!/PCR/.test(fixFacts("Results at 90% confidence or higher are cleared for preliminary screening; anything lower is flagged for PCR confirmation.")));
  assert.ok(!/ProRAW/i.test(all("What's in his camera bag?") + JSON.stringify(gearList)));
  const web = all("How much for a website?") + all("How is web work priced?");
  assert.ok(!/15,000|starts? at ₱/.test(web) && /scope/.test(web), "web pricing depends on scope");
  assert.ok(/third part|partner/i.test(all("Can I add hair & makeup to a shoot?") + all("Who handles hosting for a website?")));
  assert.ok(/Photo Mode/.test(all("What's new in his photography?")) && /RStudio/.test(all("What certificates does he have?")));
  assert.ok(!/jeepney/i.test(all("What's Island Drive?")));
});

test("offline, a question about the wider world offers a Google search instead of guessing", () => {
  for (const q of ["Search the web for the F1 calendar", "What's the weather in Manila today?", "How tall is Mount Apo?"]) {
    const a = localAnswer(q, { rng: seeded(1) });
    assert.ok(/can't search the web/.test(a.text), q);
    const chip = a.sources?.[0];
    assert.ok(chip && chip.kind === "web" && chip.href.startsWith("https://www.google.com/search?q=") && isSafeHref(chip.href), q);
  }
  // Questions about Neil still get Neil answers.
  assert.ok(!/can't search/.test(localAnswer("Where does Neil study?", { rng: seeded(1) }).text));
});

test("isSafeHref only lets ordinary https sites through", () => {
  for (const ok of ["https://en.wikipedia.org/wiki/X", "https://www.google.com/search?q=a"]) assert.ok(isSafeHref(ok), ok);
  for (const bad of ["http://example.com", "javascript:alert(1)", "https://localhost/x", "https://127.0.0.1/", "https://user:pw@example.com/", "https://intranet/", "data:text/html,hi"]) assert.ok(!isSafeHref(bad), bad);
});

console.log(`\n${passed} passed`);
