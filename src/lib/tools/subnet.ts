// IPv4 subnetting — the everyday maths behind the CLIRDEC network design.
// Pure functions: used by the Lab widget, NeilAI's tool calls and its offline brain.

export interface SubnetInfo {
  cidr: string;
  address: string;
  prefix: number;
  network: string;
  broadcast: string;
  mask: string;
  wildcard: string;
  firstHost: string;
  lastHost: string;
  totalAddresses: number;
  usableHosts: number;
  ipClass: "A" | "B" | "C" | "D" | "E";
  scope: "Private" | "Public" | "Loopback" | "Link-local" | "CGNAT" | "Multicast" | "Reserved";
  binaryMask: string;
}

const toInt = (ip: string) => {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p) || Number(p) > 255) return null;
    n = n * 256 + Number(p);
  }
  return n >>> 0;
};

const toIp = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
const maskOf = (prefix: number) => (prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0);

function prefixFromMask(mask: string) {
  const n = toInt(mask);
  if (n === null) return null;
  const bits = n.toString(2).padStart(32, "0");
  if (!/^1*0*$/.test(bits)) return null; // masks must be contiguous ones
  const zero = bits.indexOf("0");
  return zero === -1 ? 32 : zero;
}

/** Accepts "192.168.1.10/26", "192.168.1.10 255.255.255.192" or a bare address (assumes its classful mask). */
export function parseNetwork(input: string): { ip: number; prefix: number } | null {
  const m = input.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})(?:\s*\/\s*(\d{1,2})|\s+(\d{1,3}(?:\.\d{1,3}){3}))?$/);
  if (!m) return null;
  const ip = toInt(m[1]);
  if (ip === null) return null;
  let prefix: number | null;
  if (m[2] !== undefined) prefix = Number(m[2]);
  else if (m[3] !== undefined) prefix = prefixFromMask(m[3]);
  else prefix = ip >>> 24 < 128 ? 8 : ip >>> 24 < 192 ? 16 : 24;
  if (prefix === null || prefix < 0 || prefix > 32) return null;
  return { ip, prefix };
}

function classify(ip: number): Pick<SubnetInfo, "ipClass" | "scope"> {
  const a = ip >>> 24;
  const b = (ip >>> 16) & 255;
  const ipClass = a < 128 ? "A" : a < 192 ? "B" : a < 224 ? "C" : a < 240 ? "D" : "E";
  const scope =
    a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      ? "Private"
      : a === 127
        ? "Loopback"
        : a === 169 && b === 254
          ? "Link-local"
          : a === 100 && b >= 64 && b <= 127
            ? "CGNAT"
            : a >= 224 && a < 240
              ? "Multicast"
              : a >= 240 || a === 0
                ? "Reserved"
                : "Public";
  return { ipClass, scope };
}

export function subnet(input: string): SubnetInfo | { error: string } {
  const parsed = parseNetwork(input);
  if (!parsed) return { error: "Use an address with a prefix, like 192.168.10.0/24 or 10.0.0.5 255.255.255.0." };
  const { ip, prefix } = parsed;
  const mask = maskOf(prefix);
  const network = (ip & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  const total = 2 ** (32 - prefix);
  // /31 point-to-point links and /32 host routes have no network/broadcast reservation.
  const usable = prefix >= 31 ? total : total - 2;
  const first = prefix >= 31 ? network : network + 1;
  const last = prefix >= 31 ? broadcast : broadcast - 1;
  const bits = mask.toString(2).padStart(32, "0");
  return {
    cidr: `${toIp(network)}/${prefix}`,
    address: toIp(ip),
    prefix,
    network: toIp(network),
    broadcast: toIp(broadcast),
    mask: toIp(mask),
    wildcard: toIp(~mask >>> 0),
    firstHost: toIp(first),
    lastHost: toIp(last),
    totalAddresses: total,
    usableHosts: usable,
    binaryMask: bits.match(/.{8}/g)!.join("."),
    ...classify(ip),
  };
}

export interface VlsmRow {
  name: string;
  hostsNeeded: number;
  cidr: string;
  mask: string;
  firstHost: string;
  lastHost: string;
  broadcast: string;
  usableHosts: number;
  wasted: number;
}

/**
 * Variable-length subnet masking: carve the base network into the smallest
 * subnets that fit each segment, largest first (the order a network designer
 * allocates VLANs in).
 */
export function vlsm(base: string, needs: { name: string; hosts: number }[]): { rows: VlsmRow[]; free: string | null } | { error: string } {
  const parsed = parseNetwork(base);
  if (!parsed) return { error: "Start from a base network like 192.168.10.0/24." };
  const clean = needs.filter((n) => Number.isFinite(n.hosts) && n.hosts > 0).slice(0, 16);
  if (clean.length === 0) return { error: "Add at least one segment with a host count." };

  const baseMask = maskOf(parsed.prefix);
  const start = (parsed.ip & baseMask) >>> 0;
  const end = start + 2 ** (32 - parsed.prefix);
  let cursor = start;
  const rows: VlsmRow[] = [];

  for (const need of [...clean].sort((a, b) => b.hosts - a.hosts)) {
    const hostBits = Math.max(2, Math.ceil(Math.log2(need.hosts + 2)));
    const size = 2 ** hostBits;
    if (hostBits > 32 - parsed.prefix || cursor + size > end) {
      return { error: `${need.name} (${need.hosts} hosts) doesn't fit in what's left of ${toIp(start)}/${parsed.prefix}. Try a bigger base network.` };
    }
    const info = subnet(`${toIp(cursor)}/${32 - hostBits}`) as SubnetInfo;
    rows.push({
      name: need.name,
      hostsNeeded: need.hosts,
      cidr: info.cidr,
      mask: info.mask,
      firstHost: info.firstHost,
      lastHost: info.lastHost,
      broadcast: info.broadcast,
      usableHosts: info.usableHosts,
      wasted: info.usableHosts - need.hosts,
    });
    cursor += size;
  }
  return { rows, free: cursor < end ? `${toIp(cursor)} – ${toIp(end - 1)}` : null };
}
