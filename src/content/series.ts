export interface Series {
  /** Folder name under /public/photography/ — drop images there and they appear automatically. */
  slug: string;
  title: string;
  kicker: string;
  story: string;
  gear: string;
  /** Section mood: dark series sit on ink, light ones on paper. */
  tone: "ink" | "paper" | "night";
}

// Order here is the order on the site (matches the photography site's collections).
export const seriesList: Series[] = [
  {
    slug: "events",
    title: "School Events",
    kicker: "01 — Collection",
    story: "Official coverage and creative documentation produced under my direction with the ITSC Media Group (IMG), formerly the ITSC Multimedia Group (MMT), at Central Luzon State University.",
    gear: "Nikon D780 · Canon · ITSC Media Group",
    tone: "paper",
  },
  {
    slug: "portraits",
    title: "Fashion Portraits",
    kicker: "02 — Collection",
    story: "Studio-style sessions with clean backdrops and controlled light — editorial, corporate and casual.",
    gear: "Canon · Nikon · studio lighting",
    tone: "ink",
  },
  {
    slug: "landscapes",
    title: "Natural Landscapes",
    kicker: "03 — Collection",
    story: "Open roads, coastlines, sunsets and campus corners — whatever the light was doing that day.",
    gear: "Canon EOS 80D · iPhone 14 Pro Max",
    tone: "paper",
  },
  {
    slug: "concerts",
    title: "Live Concerts & OPM",
    kicker: "04 — Collection",
    story: "Aurora Music Festival and street stages: twelve-hour days at the barricade, shooting manual through strobes and haze for the frame that holds the energy.",
    gear: "Nikon D780 · Canon · iPhone 14 Pro Max",
    tone: "ink",
  },
  {
    slug: "astro",
    title: "Astrophotography",
    kicker: "05 — Collection",
    story: "Andromeda, the Moon and a blood-red eclipse — long nights, many frames, stacked into one quiet image.",
    gear: "Nikon D780 · Canon EOS 1500D · Sequator",
    tone: "night",
  },
];
