import { intentOf, type ChipHistory, type ChipMeta, type Suggestion } from "./suggest";

// What NeilAI's chips remember between visits, kept in localStorage: the
// intents shown lately (held back outright), how often each has come up
// (held back less and less as it ages, see HALF_LIFE_MS), and the last few
// deals (so the opening chip rotates). Nothing here identifies anyone; it's
// a list of question ids that never leaves the browser.

const KEY = "neilai-chips-v1";
/** Intents held back outright: about 20 openings' worth. */
const RECENT_MAX = 60;
const DEALS_MAX = 6;
const SHOWN_MAX = 400;
/** Older than this, a shown chip is forgotten entirely. */
const FORGET_MS = 21 * 24 * 3_600_000;

export interface ChipMemory {
  v: 1;
  /** Intents shown lately, newest last. */
  recent: string[];
  shown: Record<string, { n: number; t: number }>;
  deals: ChipMeta[][];
  /** When this copy was read: "now" for the decay, fixed for the life of a chat panel. */
  at: number;
}

export const emptyMemory = (now: number): ChipMemory => ({ v: 1, recent: [], shown: {}, deals: [], at: now });

const isMeta = (m: unknown): m is ChipMeta => !!m && typeof (m as ChipMeta).topic === "string" && typeof (m as ChipMeta).theme === "string" && typeof (m as ChipMeta).template === "string";

/** Reads the memory; anything missing or malformed starts fresh. */
export function loadMemory(storage: Pick<Storage, "getItem"> | null = typeof localStorage === "undefined" ? null : localStorage, now = Date.now()): ChipMemory {
  try {
    const raw = JSON.parse(storage?.getItem(KEY) ?? "null") as Partial<ChipMemory> | null;
    if (!raw || raw.v !== 1) return emptyMemory(now);
    const shown: ChipMemory["shown"] = {};
    for (const [k, v] of Object.entries(raw.shown ?? {})) {
      if (v && Number.isFinite(v.n) && Number.isFinite(v.t) && now - v.t < FORGET_MS) shown[k] = { n: Math.min(50, v.n), t: v.t };
    }
    return {
      v: 1,
      recent: (Array.isArray(raw.recent) ? raw.recent : []).filter((x): x is string => typeof x === "string").slice(-RECENT_MAX),
      shown,
      deals: (Array.isArray(raw.deals) ? raw.deals : []).filter((d): d is ChipMeta[] => Array.isArray(d) && d.every(isMeta)).slice(-DEALS_MAX),
      at: now,
    };
  } catch {
    return emptyMemory(now);
  }
}

/** The memory after a deal was on screen. Pure. */
export function rememberDeal(memory: ChipMemory, deal: Suggestion[], now: number): ChipMemory {
  if (!deal.length) return memory;
  const keys = deal.map(intentOf);
  const shown = { ...memory.shown };
  for (const k of keys) shown[k] = { n: (shown[k]?.n ?? 0) + 1, t: now };
  // Keep the most recently shown entries if it grows too big.
  const trimmed = Object.entries(shown)
    .sort((a, b) => b[1].t - a[1].t)
    .slice(0, SHOWN_MAX);
  return {
    ...memory,
    recent: [...memory.recent.filter((k) => !keys.includes(k)), ...keys].slice(-RECENT_MAX),
    shown: Object.fromEntries(trimmed),
    deals: [...memory.deals, deal.map(({ topic, theme, template }) => ({ topic, theme, template }))].slice(-DEALS_MAX),
  };
}

/** Records a deal straight into storage (read, add, write), so two tabs don't overwrite each other's history. */
export function storeDeal(deal: Suggestion[], storage: Pick<Storage, "getItem" | "setItem"> | null = typeof localStorage === "undefined" ? null : localStorage, now = Date.now()) {
  try {
    if (!storage) return;
    const { at: _at, ...next } = rememberDeal(loadMemory(storage, now), deal, now);
    void _at;
    storage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

/** The history pickSuggestions wants, from a memory snapshot and this visit's own deals. */
export const historyOf = (memory: ChipMemory, deals: ChipMeta[][]): ChipHistory => ({ deals: [...memory.deals, ...deals].slice(-DEALS_MAX), shown: memory.shown, now: memory.at });
