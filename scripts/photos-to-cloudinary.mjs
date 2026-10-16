// One-time move of the photos in public/photography to Cloudinary.
//
//   npm run photos:migrate -- --dry-run   (shows what would happen)
//   npm run photos:migrate                (uploads)
//
// Needs CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET) in
// .env.local. Safe to run twice: photos already on Cloudinary are skipped.
// Each photo keeps its caption, note, focus point and position; the first of
// each collection is tagged "cover". Uploads are "authenticated", so the
// full-size originals can't be opened by anyone, only the signed web copies.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

try {
  process.loadEnvFile(".env.local");
} catch {}

const DRY = process.argv.includes("--dry-run");
const ROOT = path.join(process.cwd(), "public", "photography");
const IMAGE = /\.(jpe?g|png|webp|avif)$/i;
const key = (f) => f.replace(IMAGE, "").toLowerCase();

const url = process.env.CLOUDINARY_URL;
const m = url && /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url.trim());
const config = m
  ? { api_key: m[1], api_secret: m[2], cloud_name: m[3] }
  : { cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET };
if (!DRY && !(config.cloud_name && config.api_key && config.api_secret)) {
  console.error("Add CLOUDINARY_URL to .env.local first (Cloudinary → Settings → API Keys).");
  process.exit(1);
}
cloudinary.config({ ...config, secure: true });

let uploaded = 0;
let skipped = 0;
for (const slug of (await readdir(ROOT, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  const dir = path.join(ROOT, slug);
  const files = (await readdir(dir)).filter((f) => IMAGE.test(f));
  let captions = {};
  try {
    captions = JSON.parse(await readFile(path.join(dir, "captions.json"), "utf8"));
  } catch {}
  const byKey = new Map(Object.entries(captions).map(([f, c], i) => [key(f), { c, i }]));
  // Same order as the site: captioned photos first, in captions.json order.
  files.sort((a, b) => (byKey.get(key(a))?.i ?? 1e6) - (byKey.get(key(b))?.i ?? 1e6) || a.localeCompare(b));

  for (const [i, file] of files.entries()) {
    const c = byKey.get(key(file))?.c;
    const caption = typeof c === "string" ? c : c?.title;
    const context = Object.fromEntries(
      Object.entries({ caption, alt: typeof c === "object" ? c.note : undefined, focus: typeof c === "object" ? c.focus : undefined, order: String(i + 1) }).filter(([, v]) => v),
    );
    const publicId = `portfolio/${slug}/${file.replace(IMAGE, "")}`;
    console.log(`${DRY ? "would upload" : "uploading"} ${publicId}${i === 0 ? "  (cover)" : ""}  ${caption ?? ""}`);
    if (DRY) continue;
    const res = await cloudinary.uploader.upload(path.join(dir, file), {
      public_id: publicId,
      asset_folder: `portfolio/${slug}`,
      type: "authenticated",
      overwrite: false,
      context,
      tags: i === 0 ? ["portfolio", "cover"] : ["portfolio"],
    });
    if (res.existing) skipped++;
    else uploaded++;
  }
}
console.log(DRY ? "Dry run only, nothing uploaded." : `Done: ${uploaded} uploaded, ${skipped} already there.`);
