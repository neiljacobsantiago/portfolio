# Photography on Cloudinary

The gallery reads its photos from Cloudinary. Upload a photo there and it shows up
on the site: within seconds if the webhook is set up (step 5), or within 10 minutes
otherwise. No code change and no redeploy are needed.

Until `CLOUDINARY_URL` is set, or if Cloudinary can't be reached, the site uses
the photos in `public/photography` instead, so nothing ever goes blank.

## One-time setup

1. **Create a free account** at cloudinary.com (no card needed).
2. **Copy your key.** Go to *Settings → API Keys* and copy the *API environment
   variable*. It looks like `cloudinary://123456:abcDEF@your-cloud`. It's a
   password: never paste it into a chat, a screenshot or the code.
3. **Give it to the site.** In *Vercel → portfolio → Settings → Environment
   Variables*, add `CLOUDINARY_URL` with that value (Production and Preview),
   then redeploy.
4. **Move the current photos over (once).** Put the same line in `.env.local`
   on your computer (`CLOUDINARY_URL=cloudinary://…`), then run:
   ```
   npm run photos:migrate -- --dry-run   # shows what would happen
   npm run photos:migrate                # uploads, keeping captions and order
   ```
   It's safe to run twice: photos that are already there are skipped.
5. **Instant updates (recommended).** In *Settings → Webhook Notifications*, add
   `https://<your-site>/api/photos/webhook`. The site checks Cloudinary's
   signature, so nobody else can trigger it.
6. **Lock it down (recommended).**
   - Turn on *Settings → Security → Strict transformations*. Then only the sizes
     the site signs can be produced, not unwatermarked full-size copies.
   - Make new uploads private: in *Settings → Upload*, create an upload preset
     with delivery type **Authenticated** and choose it as the Media Library's
     default upload preset. The migrated photos are already authenticated.

## Adding photos

- Open **Media Library → `portfolio` → a collection folder** (`events`,
  `portraits`, `landscapes`, `concerts`, `astro`) and upload. This works from the
  phone browser too.
- **Title** is the caption (e.g. *Jay Contreras*). **Description** is the small
  line under it (e.g. *Kamikazee · Aurora Music Festival 2026*).
- New photos appear at the top of their collection, right after the cover.
- **Cover photo:** add the tag `cover` to one photo, and remove it from the old one.
- **Optional extra fields** (*contextual metadata*, key = value):
  - `focus` = `50% 0%` keeps the top of the frame when a layout crops it (portraits
    already favour the upper third)
  - `order` = `3` pins a photo to a position
- **New collection:** make a new folder under `portfolio` (e.g.
  `portfolio/weddings`). It appears on the site as "Weddings". Its story and gear
  line can be added in `src/content/series.ts`.
- **Removing** a photo from Cloudinary removes it from the site.

The site only ever shows signed, web-sized copies. Large copies carry a small
"© Neil Jacob Santiago" in the corner.
