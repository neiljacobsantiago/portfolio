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
  series: string;
}

type Caption = string | { title: string; note?: string };

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
 * ({ "file.jpg": "Caption" } or { "file.jpg": { "title": "…", "note": "Shot on …" } })
 * overrides the alt text derived from file names.
 */
async function loadSeries(series: Series): Promise<Photo[]> {
  const dir = path.join(ROOT, series.slug);
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => IMAGE.test(f)).sort();
  } catch {
    return [];
  }

  let captions: Record<string, Caption> = {};
  try {
    captions = JSON.parse(await readFile(path.join(dir, "captions.json"), "utf8"));
  } catch {}

  const photos = await Promise.all(
    files.map(async (file): Promise<Photo | null> => {
      try {
        const { width, height } = await imageSizeFromFile(path.join(dir, file));
        if (!width || !height) return null;
        const caption = captions[file];
        const alt = typeof caption === "string" ? caption : (caption?.title ?? altFromFile(file));
        const note = typeof caption === "object" ? caption.note : undefined;
        return { src: `/photography/${series.slug}/${file}`, width, height, alt, note, series: series.slug };
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
