import type { Algorithm } from "./memory";

// The Lab: small working tools, each grown out of a real project.
// The Lab page, project pages, the command palette and NeilAI all read this list.

export type ToolId = "subnet" | "memory" | "link" | "pathoscan" | "quote";

export interface ToolMeta {
  id: ToolId;
  title: string;
  blurb: string;
  /** The project it comes from, linked as "From …". */
  project: { slug: string; title: string } | { href: string; title: string };
  /** Words people might type when looking for it. */
  keywords: string;
}

export const tools: ToolMeta[] = [
  {
    id: "pathoscan",
    title: "PathoScan confidence check",
    blurb: "See how PathoScan decides: slide the confidence and watch a result clear the 90% bar or go for PCR.",
    project: { slug: "pathoscan", title: "PathoScan" },
    keywords: "pathoscan aspergillus ai classifier threshold pcr confidence fungus",
  },
  {
    id: "subnet",
    title: "Subnet & VLAN planner",
    blurb: "Break any IPv4 network into hosts, masks and ranges — or plan VLAN subnets for a whole building.",
    project: { slug: "clirdec-network", title: "CLIRDEC Network Architecture" },
    keywords: "subnet cidr ip mask vlsm vlan network calculator",
  },
  {
    id: "memory",
    title: "Memory allocation visualizer",
    blurb: "Watch First-, Best-, Worst- and Next-Fit place processes into memory, and where fragmentation creeps in.",
    project: { slug: "memory-allocation-simulator", title: "Memory Allocation Simulator" },
    keywords: "memory allocation first fit best fit worst fit operating systems fragmentation",
  },
  {
    id: "link",
    title: "Link safety check",
    blurb: "Paste a suspicious link and see the phishing red flags in plain language — it never opens the link.",
    project: { slug: "cyber-awareness-series", title: "Cyber Awareness Series" },
    keywords: "phishing link url scam safe check security",
  },
  {
    id: "quote",
    title: "Photoshoot quote",
    blurb: "Pick a shoot, package and add-ons to see the price, the 30% downpayment, and book it in one tap.",
    project: { href: "/photography#sessions", title: "Photography sessions" },
    keywords: "photoshoot price rate quote booking graduation studio event private custom add-ons",
  },
];

export const toolById = (id: ToolId) => tools.find((t) => t.id === id)!;
export const toolHref = (t: ToolMeta) => ("slug" in t.project ? `/work/${t.project.slug}` : t.project.href);

/**
 * Rich cards NeilAI can show inside the chat. The server (or the offline
 * brain) decides which to show; the client renders them as live widgets.
 */
export type ChatCard =
  | { kind: "project"; slug: string }
  | { kind: "collection"; slug: string; title: string; count: number; cover: string | null }
  | { kind: "github" }
  | { kind: "subnet"; input: string }
  | { kind: "vlsm"; base: string; needs: { name: string; hosts: number }[] }
  | { kind: "memory"; blocks: number[]; processes: number[]; algorithm: Algorithm }
  | { kind: "link"; url: string }
  | { kind: "pathoscan"; species: string; confidence: number }
  | { kind: "quote"; service: string; package?: string; people?: number; addOns?: string[] };

/** Opening a tool from the chat's tool drawer. */
export const starterCard: Record<ToolId, ChatCard> = {
  subnet: { kind: "subnet", input: "192.168.10.0/24" },
  memory: { kind: "memory", blocks: [100, 500, 200, 300, 600], processes: [212, 417, 112, 426], algorithm: "best" },
  link: { kind: "link", url: "" },
  pathoscan: { kind: "pathoscan", species: "A. flavus", confidence: 94 },
  quote: { kind: "quote", service: "graduation" },
};
