export interface Series {
  /** Folder name under /public/photography/ — drop images there and they appear automatically. */
  slug: string;
  title: string;
  category: "Concerts" | "Events" | "Night Sky" | "Production";
  year: string;
  role: string;
  gear: string;
  story: string;
}

export const seriesList: Series[] = [
  {
    slug: "aurora-2026",
    title: "Aurora Music Festival",
    category: "Concerts",
    year: "2026",
    role: "Live performance photography",
    gear: "iPhone 14 Pro Max · ProRAW · Lightroom Mobile",
    story: "Shot, processed and graded in the pit between sets — high-contrast stage light, caught on a phone.",
  },
  {
    slug: "ircite-2026",
    title: "IRCITE 2026",
    category: "Events",
    year: "2026",
    role: "Media operator",
    gear: "Canon EOS 1500D · EF 50mm f/1.8 · Speedlite sync",
    story: "Continuous live coverage of a university research conference, with flash, tethered transfers and no second takes.",
  },
  {
    slug: "deep-sky",
    title: "Deep Sky",
    category: "Night Sky",
    year: "Ongoing",
    role: "Astrophotography & stacking",
    gear: "Canon RAW (.cr2) · Sequator · Lightroom Classic",
    story: "Andromeda and the faint light around it — dozens of frames stacked into one quiet image.",
  },
  {
    slug: "itsc-media",
    title: "ITSC Media Group",
    category: "Production",
    year: "Ongoing",
    role: "Production director",
    gear: "Nikon D780 · Canon EOS 1500D · OBS Studio",
    story: "Shot lists, screening tasks and dual-preview broadcast setups for a student media team covering campus life.",
  },
];
