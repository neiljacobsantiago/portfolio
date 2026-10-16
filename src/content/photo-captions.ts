import astro from "../../public/photography/astro/captions.json";
import concerts from "../../public/photography/concerts/captions.json";
import events from "../../public/photography/events/captions.json";
import landscapes from "../../public/photography/landscapes/captions.json";
import portraits from "../../public/photography/portraits/captions.json";

// Captions for photos uploaded straight to Cloudinary under their camera file
// names. A caption typed into Cloudinary (Title / Description) always wins;
// these only fill in when it's empty. Matched by file name, so "StreetConcert-16
// (1).jpg" and "StreetConcert-16_1" both find "StreetConcert-16".

export type Caption = string | { title: string; note?: string; focus?: string };

const uploads: Record<string, Caption> = {
  // Live concerts
  "StreetConcert-9": { title: "Singing Queens", note: "Street concert" },
  "StreetConcert-10": { title: "Singing Queens", note: "Street concert" },
  "StreetConcert-16": { title: "Jillian Ward", note: "Street concert" },
  "StreetConcert-37": { title: "Ben&Ben", note: "Street concert" },
  // School events
  "rehersal-12": { title: "Rehearsal Day", note: "CLSU · ITSC Media Group" },
  "rehersal-4": { title: "Rehearsal, in White", note: "CLSU · ITSC Media Group" },
  // Everyday
  Belle: { title: "Belle", note: "Blue eyes, white coat" },
  "IMG_0709-1": { title: "Scuderia Red", note: "Still life" },
  "IMG_0721-4": { title: "Zinnia", note: "Macro" },
  "IMG_2012": { title: "Doorway Watch", note: "The house cat" },
  "IMG_2134": { title: "Cherubs", note: "Still life" },
  "IMG_2007": { title: "Riverfarm", note: "LU Riverfarm Seafood Restaurant" },
  // Landscapes
  "IMG_1905": { title: "Shoreline at Golden Hour", note: "Beach walk" },
};

/** "StreetConcert-16 (1).JPG" → "streetconcert-16" */
export const captionKey = (name: string) =>
  name
    .replace(/\.(jpe?g|png|webp|avif|heic)$/i, "")
    .replace(/\s*\(\d+\)/g, "")
    .trim()
    .toLowerCase();

const all = new Map<string, Caption>(
  [astro, concerts, events, landscapes, portraits, uploads].flatMap((group) => Object.entries(group as Record<string, Caption>).map(([file, c]) => [captionKey(file), c] as const)),
);

/**
 * The caption for a file name, trying Cloudinary's renamed forms too:
 * a random "_x7k2pq" suffix and a "_1" duplicate counter.
 */
export function captionFor(...names: (string | undefined)[]): Caption | undefined {
  for (const name of names) {
    if (!name) continue;
    const k = captionKey(name);
    for (const candidate of [k, k.replace(/_[a-z0-9]{6}$/, ""), k.replace(/_\d+$/, ""), k.replace(/_[a-z0-9]{6}$/, "").replace(/_\d+$/, "")]) {
      const hit = all.get(candidate);
      if (hit) return hit;
    }
  }
  return undefined;
}

/** "StreetConcert-16 (1)" → "Street Concert"; "IMG_2012" → "" (nothing worth showing). */
export function nameFromFile(name: string) {
  return name
    .replace(/\.(jpe?g|png|webp|avif|heic)$/i, "")
    .replace(/\s*\(\d+\)/g, "")
    .replace(/_[a-z0-9]{6}$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .map((w) => w.toLowerCase().replace("rehersal", "rehearsal"))
    .filter((w) => w && !/\d/.test(w) && !/^(img|dsc|dscf|pxl|untitled|photo|photography|image|copy|final|edit|edited)$/.test(w))
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
