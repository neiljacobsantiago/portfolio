import { subnet, type SubnetInfo } from "@/lib/tools/subnet";

// Questions for Subnet Sprint, built on the same maths as the Lab's subnet
// planner. Three levels: the game climbs as your streak grows. Every
// question has exactly four distinct options and a one-line explanation.

export interface QuizQuestion {
  kind: "hosts" | "mask" | "wildcard" | "first" | "network" | "broadcast" | "contains" | "subnets";
  /** Short label for the packet, like "/27" */
  tag: string;
  prompt: string;
  hint: string;
  options: string[];
  answer: string;
  why: string;
}

const toInt = (ip: string) => ip.split(".").reduce((n, p) => n * 256 + Number(p), 0) >>> 0;
const toIp = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");

type Rand = () => number;
const int = (rand: Rand, a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const pick = <T,>(rand: Rand, xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];

function shuffle<T>(rand: Rand, xs: T[]) {
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
  for (let guard = 0; set.size < 4 && guard < 50; guard++) set.add(more());
  return shuffle(rand, [...set]);
}

const info = (cidr: string) => subnet(cidr) as SubnetInfo;

function randomHost(rand: Rand, prefixMin: number, prefixMax: number) {
  const base = pick(rand, ["192.168", "10.10", "172.16", "10.0", "172.20"] as const);
  const prefix = int(rand, prefixMin, prefixMax);
  return info(`${base}.${int(rand, 0, 63)}.${int(rand, 1, 254)}/${prefix}`);
}

export function makeQuestion(level: 1 | 2 | 3, rand: Rand = Math.random): QuizQuestion {
  const kinds: QuizQuestion["kind"][] =
    level === 1 ? ["hosts", "mask", "first", "hosts"] : level === 2 ? ["network", "broadcast", "wildcard", "hosts", "first"] : ["contains", "subnets", "broadcast", "network", "wildcard"];
  const kind = pick(rand, kinds);
  const [lo, hi] = level === 1 ? [24, 30] : level === 2 ? [20, 30] : [16, 29];
  const r = randomHost(rand, lo, hi);
  const block = r.totalAddresses;
  const shiftIp = (ip: string, by: number) => toIp((toInt(ip) + by) >>> 0);
  const nearIp = (ip: string) => () => shiftIp(ip, pick(rand, [-2, -1, 1, 2, block, -block]));

  switch (kind) {
    case "hosts": {
      const n = r.usableHosts;
      return {
        kind,
        tag: `/${r.prefix}`,
        prompt: `How many usable hosts in a /${r.prefix}?`,
        hint: "Addresses in the block, minus network and broadcast.",
        answer: String(n),
        options: options(rand, String(n), [String(block), String(n / 2 - 1), String(n * 2 + 2), String(block - 1)].filter((x) => Number(x) > 0), () => String(2 ** int(rand, 1, 12) - 2)),
        why: `/${r.prefix} leaves ${32 - r.prefix} host bits: 2^${32 - r.prefix} = ${block}, minus 2 = ${n}.`,
      };
    }
    case "mask": {
      const masks = [r.prefix - 1, r.prefix + 1, r.prefix + 2, r.prefix - 2].filter((p) => p >= 8 && p <= 30).map((p) => info(`10.0.0.0/${p}`).mask);
      return {
        kind,
        tag: `/${r.prefix}`,
        prompt: `Which subnet mask is /${r.prefix}?`,
        hint: `${r.prefix} ones, then zeros.`,
        answer: r.mask,
        options: options(rand, r.mask, masks, () => info(`10.0.0.0/${int(rand, 8, 30)}`).mask),
        why: r.prefix % 8 === 0 ? `${r.prefix} one-bits fill ${r.prefix / 8} octets → ${r.mask}.` : `${r.prefix % 8} one-bits in octet ${Math.floor(r.prefix / 8) + 1}: ${r.binaryMask.split(".")[Math.floor(r.prefix / 8)]} = ${r.mask.split(".")[Math.floor(r.prefix / 8)]}.`,
      };
    }
    case "wildcard": {
      const others = [r.prefix - 1, r.prefix + 1].filter((p) => p >= 8 && p <= 30).map((p) => info(`10.0.0.0/${p}`).wildcard);
      return {
        kind,
        tag: `ACL /${r.prefix}`,
        prompt: `Wildcard mask for a /${r.prefix} in an ACL?`,
        hint: "Flip the subnet mask: 255 minus each octet.",
        answer: r.wildcard,
        options: options(rand, r.wildcard, [r.mask, ...others], () => info(`10.0.0.0/${int(rand, 8, 30)}`).wildcard),
        why: `255.255.255.255 − ${r.mask} = ${r.wildcard}.`,
      };
    }
    case "first":
      return {
        kind,
        tag: r.address,
        prompt: `First usable host in ${r.address}/${r.prefix}?`,
        hint: "The network address, plus one.",
        answer: r.firstHost,
        options: options(rand, r.firstHost, [r.network, shiftIp(r.firstHost, 1), shiftIp(r.broadcast, 1)], nearIp(r.firstHost)),
        why: `Network ${r.network}, so the first host is ${r.firstHost}.`,
      };
    case "network": {
      const wider = info(`${r.address}/${Math.max(8, r.prefix - 1)}`).network;
      const narrower = info(`${r.address}/${Math.min(30, r.prefix + 1)}`).network;
      return {
        kind,
        tag: r.address,
        prompt: `Network address of ${r.address}/${r.prefix}?`,
        hint: "AND the address with the mask.",
        answer: r.network,
        options: options(rand, r.network, [wider, narrower, r.firstHost, shiftIp(r.network, block)], nearIp(r.network)),
        why: `Blocks of ${block}: ${r.address} falls in ${r.network} – ${r.broadcast}.`,
      };
    }
    case "broadcast": {
      const wider = info(`${r.address}/${Math.max(8, r.prefix - 1)}`).broadcast;
      const narrower = info(`${r.address}/${Math.min(30, r.prefix + 1)}`).broadcast;
      return {
        kind,
        tag: r.address,
        prompt: `Broadcast address of ${r.address}/${r.prefix}?`,
        hint: "The last address in the block.",
        answer: r.broadcast,
        options: options(rand, r.broadcast, [r.lastHost, wider, narrower], nearIp(r.broadcast)),
        why: `${r.network} + ${block} − 1 = ${r.broadcast}.`,
      };
    }
    case "contains": {
      // Which of these subnets holds the host? The others are its neighbours.
      const net = toInt(r.network);
      const answer = `${r.network}/${r.prefix}`;
      const neighbours = [net - block, net + block, net + 2 * block, net - 2 * block].filter((n) => n >= 0 && n + block <= 2 ** 32).map((n) => `${toIp(n)}/${r.prefix}`);
      return {
        kind,
        tag: r.address,
        prompt: `Which subnet does ${r.address} belong to?`,
        hint: `Each /${r.prefix} is a block of ${block} addresses.`,
        answer,
        options: options(rand, answer, neighbours, () => `${toIp(net + block * int(rand, 3, 6))}/${r.prefix}`),
        why: `${r.address} sits between ${r.network} and ${r.broadcast}.`,
      };
    }
    case "subnets": {
      const from = int(rand, 16, 26);
      const to = from + int(rand, 1, 6);
      const n = 2 ** (to - from);
      return {
        kind,
        tag: `/${from}→/${to}`,
        prompt: `How many /${to} subnets fit in a /${from}?`,
        hint: "Two to the power of the borrowed bits.",
        answer: String(n),
        options: options(rand, String(n), [String(n * 2), String(n / 2), String(n * 4), String(to - from)].filter((x) => Number(x) >= 1), () => String(2 ** int(rand, 1, 10))),
        why: `${to} − ${from} = ${to - from} borrowed bit${to - from > 1 ? "s" : ""} → 2^${to - from} = ${n}.`,
      };
    }
  }
}

/** Streaks push the difficulty up a level. */
export const levelFor = (streak: number): 1 | 2 | 3 => (streak >= 9 ? 3 : streak >= 4 ? 2 : 1);
