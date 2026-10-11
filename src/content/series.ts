export interface Series {
  /** Folder name under /public/photography/ — drop images there and they appear automatically. */
  slug: string;
  title: string;
  year: string;
  story: string;
  gear: string;
}

// Order here is the order on the site.
export const seriesList: Series[] = [
  {
    slug: "concerts",
    title: "Concerts",
    year: "2026",
    story: "Aurora Music Festival and street stages: twelve-hour days at the barricade, shooting manual through strobes and purple haze for the one frame that holds the energy.",
    gear: "Nikon D780 · Canon · iPhone 14 Pro Max",
  },
  {
    slug: "portraits",
    title: "Portraits",
    year: "Ongoing",
    story: "Studio-style sessions and quiet subjects — people, and the occasional cat who refused to look away.",
    gear: "Canon · Nikon · studio lighting",
  },
  {
    slug: "astro",
    title: "Night Sky",
    year: "Ongoing",
    story: "Andromeda, the Moon and a total lunar eclipse — long nights, many frames, stacked into one quiet image.",
    gear: "Nikon D780 · Canon EOS 1500D · Sequator",
  },
  {
    slug: "events",
    title: "Campus & Events",
    year: "2025 — 2026",
    story: "IT Fest, IT Week and IRCITE for the CLSU IT Student Council — fast coverage, same-day edits.",
    gear: "Nikon D780 · ITSC Media Group",
  },
  {
    slug: "field",
    title: "Field Notes",
    year: "Ongoing",
    story: "Roads, coastlines, flowers, animals and campus corners — whatever the light was doing that day.",
    gear: "Canon EOS 80D · EOS 1500D · iPhone 14 Pro Max",
  },
];
