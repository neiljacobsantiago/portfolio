import { readdirSync } from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "public", "logos");
const EXT = /\.(png|svg|webp|jpe?g)$/i;

let index: Map<string, string> | null = null;

/** name (lower-case, no extension) → public URL, built once per server process. */
function getIndex() {
  if (index) return index;
  index = new Map();
  try {
    for (const file of readdirSync(DIR)) {
      if (EXT.test(file)) index.set(file.replace(EXT, "").toLowerCase(), `/logos/${file}`);
    }
  } catch {}
  return index;
}

/** Resolves a logo by file name, ignoring extension and case. Null when missing. */
export function logoSrc(name?: string | null) {
  return name ? (getIndex().get(name.toLowerCase()) ?? null) : null;
}
