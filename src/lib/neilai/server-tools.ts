import type { FunctionDeclaration } from "@google/genai";
import { categories, projectBySlug, projects, type Category } from "@/content/work";
import { addOns, EXTRA_PERSON, PRIVATE_PEOPLE_INCLUDED, privateTerms, services } from "@/content/sessions";
import { getGitHubActivity } from "@/lib/github";
import { getSeries } from "@/lib/photos";
import type { ChatCard } from "@/lib/tools";
import { checkLink } from "@/lib/tools/link-check";
import { ALGORITHMS, allocate, type Algorithm } from "@/lib/tools/memory";
import { screen } from "@/lib/tools/pathoscan";
import { quote } from "@/lib/tools/quote";
import { subnet, vlsm } from "@/lib/tools/subnet";

// NeilAI's tools: the model decides when to call them, the server runs them
// (validating every argument), and each can attach a live card to the reply.

type Args = Record<string, unknown>;
type Output = { result: unknown; card?: ChatCard };

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const nums = (v: unknown) => (Array.isArray(v) ? v.map(Number).filter((n) => Number.isFinite(n) && n > 0 && n <= 1_000_000).slice(0, 12) : []);

export const declarations: FunctionDeclaration[] = [
  {
    name: "search_projects",
    description: "Find Neil's projects by topic or category. Use for questions like 'what web projects has he done?' or 'anything with networking?'.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Topic words, e.g. 'java', 'concert', 'security'. Optional." },
        category: { type: "string", enum: Object.keys(categories), description: "systems, web or media. Optional." },
      },
    },
  },
  {
    name: "get_project",
    description: "Full details of one project (story, role, stack, team, links) and show its card. Use before describing any project in detail.",
    parametersJsonSchema: {
      type: "object",
      properties: { slug: { type: "string", enum: projects.map((p) => p.slug) } },
      required: ["slug"],
    },
  },
  {
    name: "photoshoot_quote",
    description: "Price a photoshoot from Neil's package list, with the 30% downpayment and a booking button. Call it whenever someone asks about shoot prices or booking.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        service: { type: "string", enum: services.map((s) => s.id), description: "Kind of shoot." },
        package: { type: "string", description: "Package id or name. Optional; defaults to the first package." },
        people: { type: "integer", description: `Head count: for group graduation shoots, or for custom private shoots (${PRIVATE_PEOPLE_INCLUDED} included, ₱${EXTRA_PERSON} per extra person).` },
        add_ons: { type: "array", items: { type: "string", enum: addOns.map((a) => a.id) }, description: "Custom private shoots only: extras the person wants." },
      },
      required: ["service"],
    },
  },
  {
    name: "list_photo_services",
    description: "All photoshoot services and packages with prices.",
  },
  {
    name: "show_photo_collection",
    description: "Show one of Neil's photography collections with its cover. Collections: events, portraits, landscapes, concerts, astro.",
    parametersJsonSchema: { type: "object", properties: { slug: { type: "string", enum: ["events", "portraits", "landscapes", "concerts", "astro"] } }, required: ["slug"] },
  },
  {
    name: "github_activity",
    description: "Neil's live GitHub stats: contributions in the last year, streaks, busiest day, languages and recently pushed repos.",
  },
  {
    name: "subnet_calculator",
    description: "Break an IPv4 network into network/broadcast/mask/host range. Accepts CIDR (192.168.1.0/26) or address + mask.",
    parametersJsonSchema: { type: "object", properties: { network: { type: "string" } }, required: ["network"] },
  },
  {
    name: "plan_vlsm",
    description: "Plan variable-length subnets (VLANs) from a base network for segments that each need a number of hosts.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        base: { type: "string", description: "Base network in CIDR, e.g. 192.168.10.0/24" },
        segments: {
          type: "array",
          items: { type: "object", properties: { name: { type: "string" }, hosts: { type: "integer" } }, required: ["hosts"] },
        },
      },
      required: ["base", "segments"],
    },
  },
  {
    name: "simulate_memory_allocation",
    description: "Run First-, Best-, Worst- or Next-Fit dynamic memory allocation (from Neil's Memory Allocation Simulator) and show the memory map.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        blocks: { type: "array", items: { type: "integer" }, description: "Memory block sizes in KB. Default 100,500,200,300,600." },
        processes: { type: "array", items: { type: "integer" }, description: "Process sizes in arrival order. Default 212,417,112,426." },
        algorithm: { type: "string", enum: Object.keys(ALGORITHMS) },
      },
      required: ["algorithm"],
    },
  },
  {
    name: "check_link_safety",
    description: "Check a URL for phishing red flags (from Neil's Cyber Awareness Series). Never visits the link.",
    parametersJsonSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
  },
  {
    name: "pathoscan_decision",
    description: "Show PathoScan's decision rule: whether a top match at a given confidence is cleared (>= 90%) or sent for PCR. Species: A. flavus, A. terreus, A. fumigatus, A. tamarii, A. niger, Unknown.",
    parametersJsonSchema: {
      type: "object",
      properties: { species: { type: "string" }, confidence: { type: "number", description: "Top-match confidence in percent." } },
      required: ["confidence"],
    },
  },
];

const summary = (p: (typeof projects)[number]) => ({ slug: p.slug, title: p.title, category: p.category, oneLine: p.plain, role: p.role, status: p.status, page: `/work/${p.slug}` });

export async function runTool(name: string | undefined, args: Args = {}): Promise<Output> {
  switch (name) {
    case "search_projects": {
      const q = str(args.query).toLowerCase();
      const category = str(args.category) as Category;
      const words = q.split(/\W+/).filter((w) => w.length > 2);
      const hits = projects
        .filter((p) => !categories[category] || p.category === category)
        .map((p) => ({ p, score: words.reduce((s, w) => s + (`${p.title} ${p.plain} ${p.context} ${p.role} ${p.stack.join(" ")} ${p.body.join(" ")}`.toLowerCase().includes(w) ? 1 : 0), 0) }))
        .filter((h) => !words.length || h.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((h) => summary(h.p));
      return { result: { projects: hits } };
    }
    case "get_project": {
      const p = projectBySlug(str(args.slug));
      if (!p) return { result: { error: "No project with that slug." } };
      return {
        result: { ...summary(p), context: p.context, story: p.body.join(" "), stack: p.stack, team: p.team, links: p.links, privateRepo: p.privateRepo, tryItInLab: p.tool ? `/lab#${p.tool}` : undefined },
        card: { kind: "project", slug: p.slug },
      };
    }
    case "photoshoot_quote": {
      const people = Number(args.people) || 1;
      const extras = Array.isArray(args.add_ons) ? args.add_ons.map(String) : [];
      const q = quote(str(args.service), str(args.package) || undefined, people, extras);
      if ("error" in q) return { result: q };
      return {
        result: {
          service: q.service.name,
          package: q.pkg.name,
          includes: q.pkg.detail,
          price: q.pkg.price,
          people: q.people,
          addOns: q.addOns.map((a) => `${a.name}: ${a.amount === null ? "quoted" : `₱${a.amount}`}`),
          total: q.total,
          quotedSeparately: q.quoted,
          downpayment: q.downpayment,
          bookingPage: q.bookHref,
        },
        card: { kind: "quote", service: q.service.id, package: q.pkg.id, people: q.people > 1 ? q.people : undefined, addOns: q.addOns.length ? q.addOns.map((a) => a.id) : undefined },
      };
    }
    case "list_photo_services":
      return {
        result: {
          services: services.map((s) => ({ id: s.id, name: s.name, packages: s.packages.map((p) => `${p.name}: ${p.price} (${p.detail})`), includes: s.includes })),
          privateShootAddOns: addOns.map((a) => `${a.name}: ${a.amount === null ? "quoted" : `₱${a.amount}`} (${a.detail})`),
          privateShootRules: privateTerms,
          terms: "30% non-refundable downpayment; no RAW files.",
        },
      };
    case "show_photo_collection": {
      const s = (await getSeries()).find((x) => x.slug === str(args.slug));
      if (!s) return { result: { error: "No such collection." } };
      return {
        result: { title: s.title, story: s.story, frames: s.photos.length, highlights: s.photos.slice(0, 6).map((p) => p.alt), page: `/photography#${s.slug}` },
        card: { kind: "collection", slug: s.slug, title: s.title, count: s.photos.length, cover: s.photos[0]?.src ?? null },
      };
    }
    case "github_activity": {
      const g = await getGitHubActivity();
      if (!g) return { result: { error: "GitHub is unreachable right now." } };
      return {
        result: { contributionsLastYear: g.total, currentStreak: g.currentStreak, longestStreak: g.longestStreak, activeDays: g.activeDays, busiestDay: g.best, languages: g.languages, recentRepos: g.repos.map((r) => r.name) },
        card: { kind: "github" },
      };
    }
    case "subnet_calculator": {
      const r = subnet(str(args.network, 40));
      return "error" in r ? { result: r } : { result: r, card: { kind: "subnet", input: str(args.network, 40) } };
    }
    case "plan_vlsm": {
      const base = str(args.base, 40);
      const segs = (Array.isArray(args.segments) ? args.segments : []).slice(0, 12).map((s, i) => {
        const o = (s ?? {}) as Args;
        return { name: str(o.name, 40) || `Segment ${String.fromCharCode(65 + i)}`, hosts: Math.round(Number(o.hosts)) };
      });
      const r = vlsm(base, segs);
      return "error" in r ? { result: r } : { result: r, card: { kind: "vlsm", base, needs: segs.filter((s) => s.hosts > 0) } };
    }
    case "simulate_memory_allocation": {
      const algorithm = (Object.keys(ALGORITHMS).includes(str(args.algorithm)) ? str(args.algorithm) : "first") as Algorithm;
      const blocks = nums(args.blocks).length ? nums(args.blocks) : [100, 500, 200, 300, 600];
      const processes = nums(args.processes).length ? nums(args.processes) : [212, 417, 112, 426];
      const r = allocate(blocks, processes, algorithm);
      return {
        result: {
          algorithm: ALGORITHMS[algorithm].label,
          placements: r.placements.map((p) => `P${p.process} (${p.size}K) → ${p.block === null ? "must wait" : `block of ${blocks[p.block]}K`}`),
          freeLeft: r.freeLeft,
          largestHole: r.largestHole,
          externalFragmentation: r.externalFragmentation,
        },
        card: { kind: "memory", blocks, processes, algorithm },
      };
    }
    case "check_link_safety": {
      const url = str(args.url, 2000);
      return { result: checkLink(url), card: { kind: "link", url } };
    }
    case "pathoscan_decision": {
      const r = screen(str(args.species), Number(args.confidence) || 90);
      return { result: { top: r.top, confidence: r.confidence, decision: r.headline, why: r.detail }, card: { kind: "pathoscan", species: r.top, confidence: r.confidence } };
    }
    default:
      return { result: { error: `Unknown tool ${name}` } };
  }
}
