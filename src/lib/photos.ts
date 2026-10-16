import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { imageSizeFromFile } from "image-size/fromFile";
import { seriesList, type Series } from "@/content/series";
import { contextOf, folderOf, listPortfolio, ROOT as CLOUD_ROOT, variantsOf, type CloudAsset } from "@/lib/cloudinary";

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
  /** Cloudinary photos: signed URLs by width (see components/photography/Photo). */
  variants?: Record<number, string>;
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

/** "Weddings" for a folder named "weddings" that has no entry in content/series. */
const titleFromSlug = (slug: string) => slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Cloudinary collections: folder portfolio/<slug> is the collection <slug>.
 * Order: the photo tagged "cover" first, then new uploads (newest first), then
 * photos with an "order" number, ascending. Captions come from each photo's
 * Title (caption) and Description (alt) fields, or the custom "note" field.
 */
function fromCloudinary(assets: CloudAsset[]): SeriesWithPhotos[] {
  const bySlug = new Map<string, CloudAsset[]>();
  for (const a of assets) {
    const slug = folderOf(a).slice(CLOUD_ROOT.length + 1).split("/")[0];
    if (slug) bySlug.set(slug, [...(bySlug.get(slug) ?? []), a]);
  }
  const extra: Series[] = [...bySlug.keys()]
    .filter((slug) => !seriesList.some((s) => s.slug === slug))
    .sort()
    .map((slug, i) => ({ slug, title: titleFromSlug(slug), kicker: `${String(seriesList.length + i + 1).padStart(2, "0")} — Collection`, story: "", gear: "", tone: "paper" as const }));

  const rank = (a: CloudAsset) => {
    const order = Number(contextOf(a).order);
    return a.tags?.includes("cover") ? [0, 0] : Number.isFinite(order) && contextOf(a).order ? [2, order] : [1, -Date.parse(a.created_at)];
  };
  return [...seriesList, ...extra].map((s) => ({
    ...s,
    photos: (bySlug.get(s.slug) ?? [])
      .map((a) => ({ a, r: rank(a) }))
      .sort((x, y) => x.r[0] - y.r[0] || x.r[1] - y.r[1])
      .map(({ a }): Photo => {
        const ctx = contextOf(a);
        const variants = variantsOf(a);
        const name = a.display_name ?? a.filename ?? a.public_id.split("/").pop() ?? "";
        return {
          src: variants[1600],
          width: a.width,
          height: a.height,
          alt: ctx.caption || ctx.title || altFromFile(name),
          note: ctx.note || ctx.alt || undefined,
          focus: ctx.focus || (a.height > a.width ? "50% 25%" : "50% 50%"),
          series: s.slug,
          variants,
        };
      }),
  }));
}

const fromDisk = () => Promise.all(seriesList.map(async (s) => ({ ...s, photos: await loadSeries(s) })));

/**
 * The photography collections. With Cloudinary configured (see docs/PHOTOS.md)
 * they come from there; until then, or if it can't be reached, from the files
 * in /public/photography.
 */
export async function getSeries(): Promise<SeriesWithPhotos[]> {
  try {
    const assets = await listPortfolio();
    if (assets?.length) return fromCloudinary(assets);
  } catch (error) {
    console.error("[photos] Cloudinary unavailable, using local photos", error);
  }
  return fromDisk();
}
