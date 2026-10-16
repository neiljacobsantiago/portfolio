import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { PHOTOS_TAG, verifyWebhook } from "@/lib/cloudinary";

// Cloudinary calls this after an upload, edit or delete (Settings → Webhook
// notifications), so new photos show up within seconds instead of within the
// 10-minute refresh. Only signed requests from Neil's account count.
export async function POST(req: Request) {
  const body = await req.text();
  if (!verifyWebhook(body, req.headers.get("x-cld-timestamp"), req.headers.get("x-cld-signature"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  revalidateTag(PHOTOS_TAG, "max");
  return NextResponse.json({ ok: true });
}
