# Backend seams

The site runs without a database today: content is TypeScript in `src/content`,
email does the work of a CRM, and booking links carry their own signed data.
This page lists every place a backend (database, CMS or admin panel) would
plug in, what it does now, and what it should become. Components never import
the data directly where a seam exists, so swapping a source means changing one
function, not a page.

## Ground rules for the swap

- **Keep the accessor signatures.** `getNow()`, `getOffers()` and the rest are
  already `async`, so they can become `fetch`/DB calls without touching
  components.
- **Cache on the server, revalidate on write.** Pages are static today. When a
  getter reads from a database, wrap it with a cache tag
  (`fetch(url, { next: { tags: ["now"] } })`, or `unstable_cache` /
  `"use cache"` + `cacheTag`, see `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/`)
  and call `revalidateTag("now", "max")` from the admin write, the same way
  `/api/photos/webhook` refreshes photos.
- **Fail soft.** If the backend is down, fall back to the TypeScript content
  (keep it as seed data). Nothing on the site should go blank.

## Content accessors (new)

| Accessor | File | Today | Becomes | Read by |
| --- | --- | --- | --- | --- |
| `getAvailability()` | `src/content/availability.ts` | One object; `until` date falls back to a generic line once it passes (checked at build) | `settings` row edited from an admin toggle; revalidate tag `availability` so the badge updates without a deploy | Footer badge, `/now`, `/services` |
| `getNow()` | `src/content/now.ts` | Entries + `updated` date, some text derived from `about.ts`/`work.ts` | `now_entries` table (label, title, detail, link, position) + `updated_at`; history kept for an archive | `/now`, `sitemap.xml` (`lastModified`) |
| `getTestimonials({ project, offer })` | `src/content/testimonials.ts` | Empty array; only `consent: true` entries render, and `<KindWords />` renders nothing when empty | `testimonials` table with `status` (`pending` → `approved` / `rejected`), `consent_at`, `project_slug`, `offer_id`; a public "leave a review" link sent after a delivered booking writes `pending` rows, Neil approves | `/services`, `/work/[slug]` |
| `getOffers()`, `getProcess()`, `getPrinciples()`, `getFaqs()` | `src/content/offers.ts` | Static arrays; photo "From" prices derived from `sessions.ts` | CMS collections (or one `offers` table with JSON columns); photo prices keep coming from the packages table below | `/services`, `/site-map` |
| `offerIndex` | `src/content/offers.ts` | Sync list for the command palette (a client component) | Keep it build-time, or have the palette fetch `/api/search` once opened | Command palette |
| `getUses()` | `src/content/uses.ts` | Static gear/tools/colophon; "Seen in" derived from `series.ts` and `work.ts` | CMS collection; low priority, it changes rarely | `/uses` |

## Existing seams

### Contact inquiries: `src/app/api/contact/route.ts`
- **Today:** validates the form (honeypot, length limits, email format), then
  emails Neil and, if configured, a confirmation to the sender
  (`src/lib/send-mail.ts`, Gmail or Resend). Nothing is stored; if mail fails
  the inquiry is lost.
- **Becomes:** insert into an `inquiries` table first (name, email, topic,
  message, source page, created_at, status `new` → `replied` → `won` / `lost`),
  then send the emails. The row survives a mail outage, and topics
  (`website`, `photography`, `video`, `network`, `security`, `other`) become
  reportable. Keep the honeypot and limits.

### Bookings: `src/app/api/contact/route.ts` + `src/app/api/bookings/respond/route.ts` + `src/lib/booking-token.ts` + `src/lib/booking-claim.ts`
- **Today:** a photo booking is emailed to Neil with Confirm / Suggest a date /
  Decline links. The whole booking is inside the link, signed with HMAC
  (`BOOKING_SECRET`), valid 60 days. `/bookings/respond` verifies it and
  `/api/bookings/respond` emails the client. There is no record of whether a
  booking was answered, and two answers to one booking aren't prevented
  (only rate-limited).
- **Becomes:** a `bookings` table (inquiry_id, service_id, package_id, date,
  backup_date, extras JSON, quote total, downpayment, status `requested` →
  `confirmed` / `rescheduled` / `declined` → `paid_downpayment` → `shot` →
  `delivered`, timestamps). Links carry only a booking id + signature (keep
  `verifyBooking`'s HMAC check), and the respond route updates `status`
  atomically so a booking can only be confirmed once. A calendar view and
  "dates already booked" in the form fall out of this table.

### Photo packages: `src/content/sessions.ts`
- **Today:** services, packages, add-ons and terms as TypeScript; the booking
  form, quote tool (`src/lib/tools/quote.ts`), NeilAI and `/services` all read it.
- **Becomes:** `services` / `packages` / `add_ons` tables with `active` flags.
  Server code that resolves a booking must keep reading prices from here, never
  from the client.

### Photos: `src/lib/photos.ts` + `src/lib/cloudinary.ts` + `src/app/api/photos/webhook/route.ts`
- **Today:** collections come from Cloudinary (cached 10 minutes, tag
  `photos`), falling back to `public/photography`. The signed webhook calls
  `revalidateTag("photos")`. See `docs/PHOTOS.md`.
- **Becomes:** already backend-shaped. Optional: a `photos` table for
  captions/order/featured flags instead of Cloudinary context metadata, and
  client galleries for delivered shoots (private, linked to `bookings`).

### Chat: `src/app/api/chat/route.ts` (NeilAI)
- **Today:** stateless Gemini calls with tools; history lives in the visitor's
  browser; rate-limited per IP.
- **Becomes:** optional `chat_sessions` log (no personal data by default) for
  improving answers, and the chat's facts read from the same accessors above
  instead of the hard-coded system prompt.

### Rate limiting: `src/lib/rate-limit.ts`
- **Today:** in-memory sliding window per serverless instance. Resets on cold
  starts and isn't shared between instances, so it's best-effort only.
- **Becomes:** a shared store (Redis/Upstash, or a `rate_limits` table with
  `key`, `window_start`, `count`). Keep the same
  `rateLimit(key, limit, windowMs)` signature (made `async`) so the four call
  sites only add `await`.

### GitHub and weather: `src/lib/github.ts`, `src/lib/now.ts`, `src/app/api/github/route.ts`
- **Today:** fetched on the server, cached 30–60 minutes, fail soft.
- **Becomes:** no change needed.

## Suggested first migration

1. `inquiries` + `bookings` (stops losing data when mail fails; enables booking status).
2. Shared rate limiter.
3. `testimonials` with moderation, and the post-delivery review link.
4. Admin edits for availability and `/now` (with `revalidateTag`).
5. Move `sessions.ts`, `offers.ts`, `uses.ts` to the CMS last; they change least.
