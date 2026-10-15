import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { imageSizeFromFile } from "image-size/fromFile";
import { seriesList, type Series } from "@/content/series";

export interface Photo {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Secondary caption, e.g. "Shot on Nikon D780". */
  note?: string;
  /** Where to anchor the photo when a layout has to crop it (CSS object-position). */
  focus: string;
  series: string;
}

type Caption = string | { title: string; note?: string; focus?: string };

export interface SeriesWithPhotos extends Series {
  photos: Photo[];
}

const ROOT = path.join(process.cwd(), "public", "photography");
const IMAGE = /\.(jpe?g|png|webp|avif)$/i;

/** "andromeda-stack_02.jpg" → "Andromeda stack 02" */
const altFromFile = (file: string) => {
  const words = file.replace(IMAGE, "").replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * Reads /public/photography/<series-slug>/ at build time. Drop photos into a
 * series folder and they appear in the gallery. Optional `captions.json`
 * ({ "file.jpg": "Caption" } or { "file.jpg": { "title": "…", "note": "Shot on …", "focus": "50% 0%" } })
 * overrides the alt text derived from file names; `focus` keeps the subject in
 * frame wherever a layout crops (portraits default to their upper third).
 */
/** "IMG_3854.JPG" and "img_3854.jpg" are the same photo for caption purposes. */
const key = (file: string) => file.replace(IMAGE, "").toLowerCase();

async function loadSeries(series: Series): Promise<Photo[]> {
  const dir = path.join(ROOT, series.slug);
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => IMAGE.test(f));
  } catch {
    return [];
  }

  let captions: Record<string, Caption> = {};
  try {
    captions = JSON.parse(await readFile(path.join(dir, "captions.json"), "utf8"));
  } catch {}
  const byKey = new Map(Object.entries(captions).map(([file, caption], i) => [key(file), { caption, order: i }]));

  // Photos listed in captions.json come first, in that order (the first is the
  // series' feature image); anything else follows alphabetically.
  files.sort((a, b) => (byKey.get(key(a))?.order ?? 1e6) - (byKey.get(key(b))?.order ?? 1e6) || a.localeCompare(b));

  const photos = await Promise.all(
    files.map(async (file): Promise<Photo | null> => {
      try {
        const { width, height } = await imageSizeFromFile(path.join(dir, file));
        if (!width || !height) return null;
        const caption = byKey.get(key(file))?.caption;
        const alt = typeof caption === "string" ? caption : (caption?.title ?? altFromFile(file));
        const note = typeof caption === "object" ? caption.note : undefined;
        const focus = (typeof caption === "object" && caption.focus) || (height > width ? "50% 25%" : "50% 50%");
        return { src: `/photography/${series.slug}/${file}`, width, height, alt, note, focus, series: series.slug };
      } catch {
        return null;
      }
    }),
  );
  return photos.filter((p): p is Photo => p !== null);
}

export async function getSeries(): Promise<SeriesWithPhotos[]> {
  return Promise.all(seriesList.map(async (s) => ({ ...s, photos: await loadSeries(s) })));
}
