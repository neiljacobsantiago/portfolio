import type { Algorithm } from "./memory";

// The Lab: small working tools, each grown out of a real project.
// The Lab page, project pages, the command palette and NeilAI all read this list.

export type ToolId = "subnet" | "memory" | "link" | "pathoscan" | "quote" | "whisper" | "registrar" | "banko" | "buildit" | "parkmate" | "worktayo";
/**
 * Tools NeilAI can open as a chat card. Whisper needs the full page (files, mic, a big model) and the registrar demo a wide form, so they stay in the Lab.
 * Banko, BuildIT and ParkMate also work at chat width (`compact`) but have no ChatCard kind or starter yet;
 * WorkTayo's desk and live board need the room of the Lab page.
 */
export type ChatToolId = Exclude<ToolId, "whisper" | "registrar" | "banko" | "buildit" | "parkmate" | "worktayo">;

/** How the Lab groups its tools, in page order. */
export type ToolKind = "ai" | "web" | "systems" | "media";
export const TOOL_KINDS: { id: ToolKind; label: string; blurb: string }[] = [
  { id: "web", label: "Web & data", blurb: "Records, rules and the checks that keep them honest." },
  { id: "ai", label: "Applied AI", blurb: "Models that run on the device, and the judgement around them." },
  { id: "systems", label: "Networks, systems & security", blurb: "Addresses, memory and the links you shouldn't click." },
  { id: "media", label: "Photography & media", blurb: "The business side of a shoot." },
];

export interface ToolMeta {
  id: ToolId;
  kind: ToolKind;
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
    kind: "ai",
    title: "PathoScan confidence check",
    blurb: "Slide the confidence and see what PathoScan's 90% bar means: above it, a result fit for preliminary screening; below it, a cue to look twice before trusting the call.",
    project: { slug: "pathoscan", title: "PathoScan" },
    keywords: "pathoscan aspergillus ai classifier threshold confidence false positive fungus mycotoxin screening",
  },
  {
    id: "whisper",
    kind: "ai",
    title: "Whisper transcription",
    blurb: "Turn a recording into editable text and subtitles with OpenAI's Whisper — running in your browser, so the audio never leaves your device.",
    project: { slug: "whisper-transcription", title: "Whisper AI Transcription" },
    keywords: "whisper speech to text transcribe transcription audio video subtitles srt vtt captions translate tagalog filipino voice recording ai",
  },
  {
    id: "registrar",
    kind: "web",
    title: "Registrar API playground",
    blurb: "Sign in as a registrar, an adviser or a student and send requests to the Student Information System's Laravel API — see who's allowed, what fails validation and why.",
    project: { slug: "student-information-system", title: "Student Information System" },
    keywords: "laravel php api rest crud sanctum policy validation 422 403 student information system registrar database mysql backend",
  },
  {
    id: "banko",
    kind: "web",
    title: "Pocket ledger",
    blurb: "Deposit, withdraw and move money between three accounts, then watch every peso land in a running ledger that has to balance. Inspired by BankoSantiago; the accounts are made up.",
    project: { slug: "bankosantiago", title: "BankoSantiago" },
    keywords: "bankosantiago bank banking dashboard deposit withdraw transfer balance ledger transaction accounting peso money",
  },
  {
    id: "buildit",
    kind: "web",
    title: "PC parts compatibility check",
    blurb: "Pick a processor, board, memory, graphics card, case and power supply, and see what fits, what's tight and what won't go together. Inspired by BuildIT's builder; specs only, no prices.",
    project: { slug: "buildit", title: "BuildIT" },
    keywords: "buildit pc builder parts compatibility cpu socket motherboard ram ddr4 ddr5 gpu psu wattage case pcpartpicker",
  },
  {
    id: "parkmate",
    kind: "web",
    title: "Parking desk",
    blurb: "Log vehicles in, let the lot hand out the nearest free slot, fix a mistyped plate, then check out with a receipt. Inspired by ParkMate's logbook; the rates are made up.",
    project: { slug: "parkmate", title: "ParkMate" },
    keywords: "parkmate parking lot slot allocation fee rate receipt plate vehicle car motorcycle crud java",
  },
  {
    id: "worktayo",
    kind: "web",
    title: "Conference check-in desk",
    blurb: "Register walk-ins, check people into sessions and watch attendance fill in live, with the same rules a relational database would enforce. Inspired by WorkTayo; the conference is made up.",
    project: { slug: "worktayo", title: "WorkTayo" },
    keywords: "worktayo conference registration check-in attendance participants workshop event tracking mysql",
  },
  {
    id: "subnet",
    kind: "systems",
    title: "Subnet & VLAN planner",
    blurb: "Break any IPv4 network into hosts, masks and ranges — or plan VLAN subnets for a whole building.",
    project: { href: "/play", title: "Practise it in Packet Check" },
    keywords: "subnet cidr ip mask vlsm vlan network calculator",
  },
  {
    id: "memory",
    kind: "systems",
    title: "Memory allocation visualizer",
    blurb: "Watch First-, Best-, Worst- and Next-Fit place processes into memory, and where fragmentation creeps in.",
    project: { slug: "memory-allocation-simulator", title: "Memory Allocation Simulator" },
    keywords: "memory allocation first fit best fit worst fit operating systems fragmentation",
  },
  {
    id: "link",
    kind: "systems",
    title: "Link safety check",
    blurb: "Paste a suspicious link and see each phishing red flag explained. The link itself is never opened.",
    project: { slug: "cyber-awareness-series", title: "Cyber Awareness Series" },
    keywords: "phishing link url scam safe check security",
  },
  {
    id: "quote",
    kind: "media",
    title: "Photoshoot quote",
    blurb: "Pick a shoot, package and add-ons to see the price, the 30% downpayment, and book it in one tap.",
    project: { href: "/photography#sessions", title: "See the photography sessions" },
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
export const starterCard: Record<ChatToolId, ChatCard> = {
  subnet: { kind: "subnet", input: "192.168.10.0/24" },
  memory: { kind: "memory", blocks: [100, 500, 200, 300, 600], processes: [212, 417, 112, 426], algorithm: "best" },
  link: { kind: "link", url: "" },
  pathoscan: { kind: "pathoscan", species: "A. flavus", confidence: 94 },
  quote: { kind: "quote", service: "graduation" },
};

/** The tools offered inside NeilAI (drawer, command palette "Run … in NeilAI"). */
export const chatTools = tools.filter((t): t is ToolMeta & { id: ChatToolId } => t.id in starterCard);
