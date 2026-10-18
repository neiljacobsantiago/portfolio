import { BANK, type BankCard, type QuizCategory } from "@/content/quiz-bank";
import { subnet, type SubnetInfo } from "@/lib/tools/subnet";

// Questions for Packet Check, the /play quiz. Two sources:
//  - the card bank (content/quiz-bank.ts): everyday networking and security
//    awareness, written by hand;
//  - generated subnetting questions, built on the same maths as the Lab's
//    subnet planner, in three gentle levels (a /24 first, then small blocks).
// Every question has exactly four distinct options, one of them the answer,
// and a short explanation shown after the player answers.

export type { QuizCategory } from "@/content/quiz-bank";
export type QuizMode = QuizCategory | "mixed";
export type SubnetKind = "hosts" | "mask" | "wildcard" | "first" | "network" | "broadcast" | "contains" | "subnets";

export interface QuizQuestion {
  /** Stable for bank cards (used to avoid repeats); generated questions get a fresh one. */
  id: string;
  category: QuizCategory;
  kind: "card" | SubnetKind;
  /** Short label for the packet on the diagram, like "/27" or "DNS" */
  tag: string;
  prompt: string;
  /** A nudge shown before answering (subnetting only). */
  hint?: string;
  options: string[];
  answer: string;
  why: string;
}

export const ROUND_LENGTH = 12;

const toInt = (ip: string) => ip.split(".").reduce((n, p) => n * 256 + Number(p), 0) >>> 0;
const toIp = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");

export type Rand = () => number;
const int = (rand: Rand, a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const pick = <T,>(rand: Rand, xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];

function shuffle<T>(rand: Rand, xs: readonly T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The answer plus three distinct distractors (topped up from `more` if needed). */
function options(rand: Rand, answer: string, candidates: string[], more: () => string) {
  const set = new Set([answer]);
  for (const c of candidates) if (set.size < 4 && c && c !== answer) set.add(c);
  for (let guard = 0; set.size < 4 && guard < 80; guard++) set.add(more());
  return shuffle(rand, [...set]);
}

const info = (cidr: string) => subnet(cidr) as SubnetInfo;

function randomHost(rand: Rand, prefixMin: number, prefixMax: number) {
  const base = pick(rand, ["192.168", "10.10", "172.16", "10.0", "172.20"] as const);
  const prefix = int(rand, prefixMin, prefixMax);
  return info(`${base}.${int(rand, 0, 63)}.${int(rand, 1, 254)}/${prefix}`);
}

let generated = 0;

/**
 * A subnetting question. Level 1 sticks to the familiar /24 (a home network),
 * level 2 to small blocks from /25 to /28, level 3 adds wildcards, network and
 * broadcast addresses and "which subnet holds this host" across /24 to /30.
 */
export function makeQuestion(level: 1 | 2 | 3, rand: Rand = Math.random): QuizQuestion {
  const kinds: SubnetKind[] = level === 1 ? ["hosts", "mask", "first", "broadcast"] : level === 2 ? ["hosts", "mask", "first", "network"] : ["network", "broadcast", "wildcard", "contains", "subnets"];
  const kind = pick(rand, kinds);
  const [lo, hi] = level === 1 ? [24, 24] : level === 2 ? [25, 28] : [24, 30];
  const r = randomHost(rand, lo, hi);
  const block = r.totalAddresses;
  const shiftIp = (ip: string, by: number) => toIp((toInt(ip) + by) >>> 0);
  const nearIp = (ip: string) => () => shiftIp(ip, pick(rand, [-2, -1, 1, 2, block, -block]));
  const base = { id: `subnet-${kind}-${++generated}`, category: "networks" as const, kind };

  switch (kind) {
    case "hosts": {
      const n = r.usableHosts;
      return {
        ...base,
        tag: `/${r.prefix}`,
        prompt: `How many usable hosts fit in a /${r.prefix}?`,
        hint: `A /${r.prefix} has ${block} addresses. Two are reserved: network and broadcast.`,
        answer: String(n),
        options: options(rand, String(n), [String(block), String(block - 1), String(n / 2 - 1), String(n * 2 + 2)].filter((x) => Number(x) > 0), () => String(2 ** int(rand, 2, 10) - 2)),
        why: `/${r.prefix} leaves ${32 - r.prefix} host bits: 2^${32 - r.prefix} = ${block} addresses, minus 2 = ${n}.`,
      };
    }
    case "mask": {
      const masks = [r.prefix + 1, r.prefix - 1, r.prefix + 2, r.prefix - 8].filter((p) => p >= 8 && p <= 30).map((p) => info(`10.0.0.0/${p}`).mask);
      const octet = Math.floor(r.prefix / 8);
      return {
        ...base,
        tag: `/${r.prefix}`,
        prompt: `Which subnet mask matches /${r.prefix}?`,
        hint: `/${r.prefix} means ${r.prefix} one-bits, then zeros.`,
        answer: r.mask,
        options: options(rand, r.mask, masks, () => info(`10.0.0.0/${int(rand, 16, 30)}`).mask),
        why: r.prefix % 8 === 0 ? `${r.prefix} one-bits fill ${r.prefix / 8} whole octets, giving ${r.mask}.` : `Three full octets, then ${r.prefix % 8} one-bits in the last: ${r.binaryMask.split(".")[octet]} = ${r.mask.split(".")[octet]}.`,
      };
    }
    case "wildcard": {
      const others = [r.prefix - 1, r.prefix + 1].filter((p) => p >= 8 && p <= 30).map((p) => info(`10.0.0.0/${p}`).wildcard);
      return {
        ...base,
        tag: `ACL /${r.prefix}`,
        prompt: `What is the wildcard mask for a /${r.prefix}?`,
        hint: "Flip the subnet mask: 255 minus each octet.",
        answer: r.wildcard,
        options: options(rand, r.wildcard, [r.mask, ...others], () => info(`10.0.0.0/${int(rand, 16, 30)}`).wildcard),
        why: `255.255.255.255 − ${r.mask} = ${r.wildcard}.`,
      };
    }
    case "first":
      return {
        ...base,
        tag: r.address,
        prompt: `What is the first usable host in ${r.address}/${r.prefix}?`,
        hint: "Find the network address, then add one.",
        answer: r.firstHost,
        options: options(rand, r.firstHost, [r.network, shiftIp(r.firstHost, 1), r.broadcast], nearIp(r.firstHost)),
        why: `The network is ${r.network}, so the first host is ${r.firstHost}.`,
      };
    case "network": {
      const wider = info(`${r.address}/${Math.max(8, r.prefix - 1)}`).network;
      const narrower = info(`${r.address}/${Math.min(30, r.prefix + 1)}`).network;
      return {
        ...base,
        tag: r.address,
        prompt: `What is the network address of ${r.address}/${r.prefix}?`,
        hint: r.prefix === 24 ? "A /24 keeps the first three octets and zeroes the last." : `Count up in blocks of ${block} in the last octet.`,
        answer: r.network,
        options: options(rand, r.network, [wider, narrower, r.firstHost, shiftIp(r.network, block)], nearIp(r.network)),
        why: `In blocks of ${block}, ${r.address} falls in ${r.network} to ${r.broadcast}.`,
      };
    }
    case "broadcast": {
      const wider = info(`${r.address}/${Math.max(8, r.prefix - 1)}`).broadcast;
      const narrower = info(`${r.address}/${Math.min(30, r.prefix + 1)}`).broadcast;
      return {
        ...base,
        tag: r.address,
        prompt: `What is the broadcast address of ${r.address}/${r.prefix}?`,
        hint: "It's the last address in the block.",
        answer: r.broadcast,
        options: options(rand, r.broadcast, [r.lastHost, wider, narrower, r.network], nearIp(r.broadcast)),
        why: `The block starts at ${r.network} and holds ${block} addresses, so it ends at ${r.broadcast}.`,
      };
    }
    case "contains": {
      // Which of these subnets holds the host? The others are its neighbours.
      const net = toInt(r.network);
      const answer = `${r.network}/${r.prefix}`;
      const neighbours = [net - block, net + block, net + 2 * block, net - 2 * block].filter((n) => n >= 0 && n + block <= 2 ** 32).map((n) => `${toIp(n)}/${r.prefix}`);
      return {
        ...base,
        tag: r.address,
        prompt: `Which subnet does ${r.address} belong to?`,
        hint: `Each /${r.prefix} is a block of ${block} addresses.`,
        answer,
        options: options(rand, answer, neighbours, () => `${toIp(net + block * int(rand, 3, 6))}/${r.prefix}`),
        why: `${r.address} sits between ${r.network} and ${r.broadcast}.`,
      };
    }
    case "subnets": {
      const from = 24;
      const to = from + int(rand, 1, 4);
      const n = 2 ** (to - from);
      return {
        ...base,
        tag: `/${from} into /${to}`,
        prompt: `How many /${to} subnets fit in a /${from}?`,
        hint: "Two to the power of the bits you borrow.",
        answer: String(n),
        options: options(rand, String(n), [String(n * 2), String(n / 2), String(n * 4), String(to - from)].filter((x) => Number(x) >= 1), () => String(2 ** int(rand, 1, 8))),
        why: `${to} − ${from} = ${to - from} borrowed bit${to - from > 1 ? "s" : ""}, and 2^${to - from} = ${n}.`,
      };
    }
  }
}

/** A bank card as a question, with its options shuffled. */
export function fromCard(card: BankCard, rand: Rand = Math.random): QuizQuestion {
  return {
    id: card.id,
    category: card.category,
    kind: "card",
    tag: card.tag,
    prompt: card.prompt,
    answer: card.answer,
    options: shuffle(rand, [card.answer, ...card.wrong]),
    why: card.why,
  };
}

/** `n` cards from one deck: unseen ones first, then beginner cards before the harder ones. */
function deal(category: QuizCategory, n: number, rand: Rand, recent: ReadonlySet<string>) {
  const deck = shuffle(
    rand,
    BANK.filter((c) => c.category === category),
  );
  const fresh = deck.filter((c) => !recent.has(c.id));
  const seen = deck.filter((c) => recent.has(c.id));
  return [...fresh, ...seen].slice(0, n).sort((a, b) => a.level - b.level);
}

/**
 * One round of ROUND_LENGTH questions. It opens with beginner cards and
 * ramps up gently; subnetting questions start at a plain /24. `recent` holds
 * card ids from earlier rounds so a replay deals new cards where it can.
 */
export function makeRound(mode: QuizMode, { rand = Math.random, recent = new Set<string>() }: { rand?: Rand; recent?: ReadonlySet<string> } = {}): QuizQuestion[] {
  const n = ROUND_LENGTH;
  if (mode === "security") return deal("security", n, rand, recent).map((c) => fromCard(c, rand));
  if (mode === "networks") {
    const cards = deal("networks", n - 3, rand, recent).map((c) => fromCard(c, rand));
    // Subnetting at questions 4, 8 and 12, one level up each time
    cards.splice(3, 0, makeQuestion(1, rand));
    cards.splice(7, 0, makeQuestion(2, rand));
    cards.push(makeQuestion(3, rand));
    return cards;
  }
  // Mixed: networking and security take turns, with two subnetting questions
  const nets = deal("networks", 5, rand, recent);
  const secs = deal("security", 5, rand, recent);
  const first = rand() < 0.5;
  const out: QuizQuestion[] = [];
  for (let i = 0; i < 5; i++) out.push(fromCard(first ? nets[i] : secs[i], rand), fromCard(first ? secs[i] : nets[i], rand));
  out.splice(5, 0, makeQuestion(1, rand));
  out.splice(10, 0, makeQuestion(2, rand));
  return out;
}

/** Streaks push the subnetting up a level (kept for callers that generate on the fly). */
export const levelFor = (streak: number): 1 | 2 | 3 => (streak >= 9 ? 3 : streak >= 4 ? 2 : 1);
