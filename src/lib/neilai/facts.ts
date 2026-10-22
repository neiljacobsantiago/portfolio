import { certificates, gear } from "@/content/about";

// Facts the owner has corrected, in one place, so every NeilAI answer (the
// AI's system prompt, its tools and the offline brain) says the same thing.
// Some content files outside the chat still carry older wording; `fixFacts`
// rewrites those phrases whenever NeilAI repeats project or tool text.

/** What PathoScan's 90% threshold means. It's a cue for staff, not an automatic referral. */
// Same wording as the Lab's PathoScan tool: ≥90% is "confident enough to screen
// with" (still a screening result, not a confirmation); below it, "look twice
// before relying on it"; the bar exists to stop false positives.
export const PATHOSCAN_THRESHOLD = {
  short:
    "a 90% confidence threshold that tells lab staff whether a result is confident enough to screen with (taken at face value for preliminary screening), or whether to look twice before relying on it",
  long:
    "PathoScan uses a 90% confidence threshold. At or above it, the result is confident enough to screen with: lab staff can take it at face value for preliminary screening, though it's still a screening result, not a confirmation. Below it, they should look twice before relying on it, for example by re-scanning, comparing the colony traits, or verifying further if the lab sees fit. The bar exists mainly to stop false positives, the biggest risk in a screening tool.",
  above: (pct: number) => `${pct}% clears PathoScan's 90% threshold: confident enough to screen with, so lab staff can take it at face value for preliminary screening (still a screening result, not a confirmation).`,
  below: (pct: number) =>
    `${pct}% is under PathoScan's 90% threshold, so staff should look twice before relying on it: re-scan, compare the colony traits, or verify further if the lab sees fit. The bar is there mainly to stop false positives.`,
  unknown: "The model's best answer is “Unknown”: it isn't confident it's one of the five species, so nothing is identified and staff decide what to check next.",
};

/**
 * How Neil describes his own work, in his words. NeilAI must not go beyond
 * this: no "full-stack engineer", no forensics, malware analysis, pentesting
 * or incident response, and hacking is something he's learning, not a skill.
 */
export const HOW_NEIL_WORKS = {
  networks:
    "Networks are Neil's main field, mostly the physical and logical side: physical and logical topology, network mapping, cabling plans, bills of materials (BOM), and IP addressing with subnets and VLANs.",
  web: "Web systems aren't Neil's main field, and he builds them with AI-assisted coding: he decides what the system should do, plans its structure, data and rules, tests it and deploys it. He doesn't claim to hand-write everything, and he doesn't put a number on how much AI wrote.",
  security:
    "On security, Neil mostly writes and shares simple lessons: awareness, phishing, data privacy, explained in plain words (like the Cyber Awareness Series). He doesn't do forensics, malware analysis, penetration testing or incident response.",
  hacking: "Offensive security and ethical hacking are things Neil is starting to learn, on his own lab machines only. It's not a skill he offers yet.",
};

/** Pricing for freelance work: there's no fixed floor; it depends on the job. */
export const PRICING =
  "Freelance web, network and video work is priced by scope: what's needed, how big it is and how fast. Neil quotes after hearing the details, so the best start is a message through /contact (or a look at /services).";

/** Commissions can depend on people and suppliers Neil doesn't control. */
export const THIRD_PARTIES =
  "Some commissions involve third parties, such as hair and makeup artists or venues for shoots, equipment rental, hosting and domain providers, internet providers or hardware suppliers, and their availability isn't guaranteed.";

/** Neil's camera gear, minus claims he asked to drop (ProRAW). The iPhone is in the bag, not used at concerts. */
export const gearList = gear.map((g) => ({ ...g, items: g.items.map((i) => i.replace(/\s*[—–-]\s*ProRAW\b/i, "").replace(/\bProRAW\b\s*/i, "").trim()) }));

export interface CertFact {
  title: string;
  issuer: string;
  date: string;
  note?: string;
  verify?: string;
}

const RSTUDIO: CertFact = {
  title: "The Art of Becoming: RStudio for Data Analysis",
  issuer: "Central Luzon State University",
  date: "Aug 2026",
  note: "Certificate of completion for a webinar held August 28, 2026 via Google Meet",
};

/** Newest first. The RStudio webinar is added here until the About page lists it. */
export const certificateFacts: CertFact[] = certificates.some((c) => /rstudio/i.test(c.title)) ? certificates : [RSTUDIO, ...certificates];

/** Rewrites older phrasings in project, tool and gear text that NeilAI passes on. */
export function fixFacts(text: string): string {
  return text
    .replace(/Results at 90% confidence or higher are cleared for preliminary screening; anything lower is flagged for PCR confirmation\./g, `${PATHOSCAN_THRESHOLD.long}`)
    .replace(/;?\s*(anything )?lower (is flagged|goes) (for|to) PCR( confirmation)?/gi, "; below it, staff look twice before relying on it")
    .replace(/\bor go for PCR\b/g, "or fall short and call for a second look")
    .replace(/\s*[—–-]\s*ProRAW\b/g, "")
    .replace(/\bProRAW stills, and /g, "Stills and ");
}
