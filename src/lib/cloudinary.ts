import { v2 as cloudinary } from "cloudinary";

// Neil's photo library on Cloudinary. Folders under `portfolio/` are the
// photography collections (portfolio/concerts, portfolio/portraits, …).
// Everything here runs on the server: the API secret never reaches a browser,
// and visitors only ever get signed, watermarked, web-sized copies.

export const ROOT = "portfolio";
export const PHOTOS_TAG = "photos";

/** Widths every photo is offered at; the browser picks one (see components/photography/Photo). */
export const WIDTHS = [384, 768, 1152, 1600, 2400] as const;
/** Large copies carry a small © in the corner; thumbnails stay clean. */
const WATERMARK_FROM = 1152;

interface Config {
  cloud: string;
  key: string;
  secret: string;
}

/** Reads CLOUDINARY_URL (cloudinary://key:secret@cloud) or the three separate variables. */
function readConfig(): Config | null {
  const url = process.env.CLOUDINARY_URL;
  if (url) {
    const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url.trim());
    if (m) return { key: m[1], secret: m[2], cloud: m[3] };
  }
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  return cloud && key && secret ? { cloud, key, secret } : null;
}

let configured = false;
export function cloudinaryConfig() {
  const c = readConfig();
  if (c && !configured) {
    cloudinary.config({ cloud_name: c.cloud, api_key: c.key, api_secret: c.secret, secure: true, analytics: false });
    configured = true;
  }
  return c;
}

export interface CloudAsset {
  public_id: string;
  format: string;
  version: number;
  type: string;
  width: number;
  height: number;
  created_at: string;
  asset_folder?: string;
  folder?: string;
  display_name?: string;
  filename?: string;
  tags?: string[];
  context?: Record<string, string> | { custom?: Record<string, string> };
}

/** Every image in the portfolio folders, cached and refreshed every 10 minutes (or at once via the webhook). */
export async function listPortfolio(): Promise<CloudAsset[] | null> {
  const c = cloudinaryConfig();
  if (!c) return null;
  const auth = `Basic ${Buffer.from(`${c.key}:${c.secret}`).toString("base64")}`;
  const out: CloudAsset[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 6; page++) {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${c.cloud}/resources/search`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ expression: "resource_type:image", with_field: ["context", "tags"], max_results: 500, ...(cursor && { next_cursor: cursor }) }),
      cache: "force-cache",
      next: { revalidate: 600, tags: [PHOTOS_TAG] },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Cloudinary search failed: ${res.status}`);
    const data = (await res.json()) as { resources: CloudAsset[]; next_cursor?: string };
    out.push(...data.resources.filter((r) => folderOf(r).startsWith(`${ROOT}/`)));
    cursor = data.next_cursor;
    if (!cursor) break;
  }
  return out;
}

/** "portfolio/concerts" for both dynamic-folder and fixed-folder accounts. */
export function folderOf(r: CloudAsset) {
  return r.asset_folder ?? r.folder ?? r.public_id.split("/").slice(0, -1).join("/");
}

export function contextOf(r: CloudAsset): Record<string, string> {
  const ctx = r.context as { custom?: Record<string, string> } | Record<string, string> | undefined;
  if (!ctx) return {};
  return "custom" in ctx && typeof ctx.custom === "object" ? (ctx.custom ?? {}) : (ctx as Record<string, string>);
}

/** Signed delivery URLs, one per width: Cloudinary refuses any size or edit we didn't sign. */
export function variantsOf(r: CloudAsset): Record<number, string> {
  return Object.fromEntries(
    WIDTHS.map((w) => [
      w,
      cloudinary.url(r.public_id, {
        type: r.type,
        version: r.version,
        format: r.format,
        sign_url: true,
        secure: true,
        transformation: [
          { crop: "limit", width: w, fetch_format: "auto", quality: "auto" },
          ...(w >= WATERMARK_FROM
            ? [
                { overlay: { font_family: "Arial", font_size: Math.round(w / 64), font_weight: "bold", text: "© Neil Jacob Santiago" }, color: "white", opacity: 55 },
                { flags: "layer_apply", gravity: "south_east", x: Math.round(w / 60), y: Math.round(w / 60) },
              ]
            : []),
        ],
      }),
    ]),
  );
}

/** Checks a webhook really came from this Cloudinary account. */
export function verifyWebhook(body: string, timestamp: string | null, signature: string | null) {
  if (!cloudinaryConfig() || !timestamp || !signature) return false;
  return cloudinary.utils.verifyNotificationSignature(body, Number(timestamp), signature);
}
