// A phishing red-flag checker in the spirit of the Cyber Awareness Series.
// Pure heuristics on the URL text — it never visits the link — so it can
// explain *why* a link looks risky, the way the videos teach people to look.

export type FlagLevel = "danger" | "warn" | "ok";

export interface LinkReport {
  url: string;
  host: string;
  verdict: "Looks risky" | "Be careful" | "No obvious red flags";
  level: FlagLevel;
  flags: { level: FlagLevel; text: string }[];
}

// Brands Filipino phishing most often imitates, with their real domains.
const BRANDS: Record<string, string[]> = {
  gcash: ["gcash.com"],
  maya: ["maya.ph", "paymaya.com"],
  paypal: ["paypal.com"],
  bdo: ["bdo.com.ph"],
  bpi: ["bpi.com.ph"],
  landbank: ["landbank.com"],
  metrobank: ["metrobank.com.ph"],
  facebook: ["facebook.com", "fb.com", "fb.me"],
  instagram: ["instagram.com"],
  google: ["google.com", "google.com.ph", "goo.gl"],
  apple: ["apple.com", "icloud.com"],
  microsoft: ["microsoft.com", "live.com", "office.com"],
  netflix: ["netflix.com"],
  shopee: ["shopee.ph"],
  lazada: ["lazada.com.ph"],
  clsu: ["clsu.edu.ph"],
};

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly", "rb.gy", "ow.ly", "shorturl.at", "tiny.cc"];
const RISKY_TLDS = ["zip", "mov", "xyz", "top", "click", "country", "gq", "tk", "ml", "cf", "ga", "rest", "monster", "cam"];
const BAIT = ["login", "log-in", "signin", "verify", "verification", "update", "secure", "account", "wallet", "otp", "claim", "prize", "reward", "free", "unlock", "suspend", "confirm", "refund"];
const SECOND_LEVEL = ["com", "net", "org", "edu", "gov", "co", "ac"];

/** "login.secure.gcash.com.ph" → "gcash.com.ph" (good enough for a red-flag check). */
function registrable(host: string) {
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  return tld.length === 2 && SECOND_LEVEL.includes(sld) ? parts.slice(-3).join(".") : parts.slice(-2).join(".");
}

// g00gle, paypa1, faceb00k, rn→m …
const unLeet = (s: string) => s.replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e").replace(/5/g, "s").replace(/rn/g, "m").replace(/vv/g, "w");

export function checkLink(raw: string): LinkReport | { error: string } {
  const text = raw.trim().slice(0, 2000);
  if (!text) return { error: "Paste a link to check." };
  if (/^(javascript|data|vbscript):/i.test(text)) {
    return { url: text, host: "", verdict: "Looks risky", level: "danger", flags: [{ level: "danger", text: "This isn't a web address at all — it's a script or data link that can run code when opened." }] };
  }

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `http://${text}`);
  } catch {
    return { error: "That doesn't look like a web address." };
  }

  const host = url.hostname.toLowerCase();
  const flags: LinkReport["flags"] = [];
  const add = (level: FlagLevel, t: string) => flags.push({ level, text: t });
  const domain = registrable(host);
  const hostWords = host.replace(/^www\./, "");

  // Only when http:// was actually typed — a bare "example.com" says nothing about encryption.
  if (url.protocol === "http:" && /^http:\/\//i.test(text)) add("warn", "Not encrypted (http, not https) — anything you type can be read in transit.");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[")) add("danger", "Uses a raw IP address instead of a name. Real banks and stores never do this.");
  if (host.includes("xn--")) add("danger", "Contains look-alike characters (punycode). The name may only *look* like a brand you know.");
  if (url.username || url.password || /^[^/]*@/.test(text.replace(/^[a-z]+:\/\//i, ""))) add("danger", "Has an “@” before the address — the real destination is what comes after it.");
  if (url.port && !["80", "443"].includes(url.port)) add("warn", `Points to an unusual port (${url.port}).`);
  if (SHORTENERS.includes(hostWords)) add("warn", "A link shortener hides the real destination. Expand it before trusting it.");
  if (RISKY_TLDS.includes(host.split(".").pop() ?? "")) add("warn", `Ends in “.${host.split(".").pop()}”, a domain ending scammers favour because it's cheap.`);
  if (host.split(".").length > 4) add("warn", "Lots of sub-domains stacked up — a trick to push the real domain out of view on phones.");
  if ((domain.match(/-/g) ?? []).length >= 2) add("warn", "The domain is stitched together with hyphens, common in throwaway scam sites.");
  if (text.length > 120) add("warn", "Unusually long link — length is often used to bury the real address.");

  const officialSite = Object.values(BRANDS).some((ds) => ds.some((d) => host === d || host.endsWith(`.${d}`)));
  for (const [brand, official] of Object.entries(BRANDS)) {
    if (officialSite) break;
    const plain = host.includes(brand);
    const leet = !plain && unLeet(host).includes(brand);
    if (plain) add("danger", `Mentions “${brand}” but the site is actually ${domain}, not ${official[0]}.`);
    else if (leet) add("danger", `Spells a look-alike of “${brand}” with swapped characters (${domain}).`);
  }

  const path = `${url.pathname}${url.search}`.toLowerCase();
  const bait = BAIT.filter((w) => path.includes(w) || hostWords.includes(w));
  if (bait.length && !officialSite) add("warn", `Uses pressure words (${bait.slice(0, 3).join(", ")}) typical of account-grab pages.`);

  const danger = flags.some((f) => f.level === "danger");
  const warns = flags.filter((f) => f.level === "warn").length;
  if (!flags.length) add("ok", "No common red flags in the address itself.");

  return {
    url: url.href,
    host,
    verdict: danger || warns >= 3 ? "Looks risky" : warns ? "Be careful" : "No obvious red flags",
    level: danger || warns >= 3 ? "danger" : warns ? "warn" : "ok",
    flags,
  };
}
