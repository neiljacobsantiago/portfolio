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

## Multiplayer: Bay Street Circuit (`/play`)

Up to four people race or free-roam together from their own phones or
computers, on different networks. No accounts: each player types a nickname
and picks a paint; the host shares a code like `BAY-7KQ2` or a link
`/play?room=BAY-7KQ2`. Code: `src/components/play/drive/net/` (protocol,
room, remote cars, lobby), `src/app/api/turn/route.ts`.

### How it connects

- **Signalling** (finding each other): a PeerJS server. By default the free
  public one at `0.peerjs.com`. The host registers under `njs-bay-<code>` and
  guests connect to that id. Only connection setup goes through it.
- **The game itself** is peer to peer over WebRTC data channels, in a star:
  guests talk to the host, the host relays. Each player simulates their own car
  and sends a 32-byte state packet about 15 times a second on an unreliable
  channel; lobby, start, results, horn and quick messages go on a reliable one.
  Every incoming message is validated and clamped (`protocol.ts`, tested in
  `protocol.test.ts`). Nothing is stored anywhere.
- **NAT traversal:** public STUN (Google, Cloudflare) always. With the public
  PeerJS cloud, PeerJS's own free TURN relay is offered too (shared, best
  effort, no guarantees). With the site's own TURN configured (below), that is
  used instead.

### What works with zero setup

Most pairs of home Wi-Fi and mobile connections can connect directly with STUN
alone. It fails when **both** players are behind strict NAT, which is common in
the Philippines: mobile data and many fibre/DSL plans use carrier-grade NAT
(CGNAT, many customers sharing one public address), and those usually can't
accept a direct connection. Then only a TURN relay gets through: it forwards
the (encrypted) traffic between the two. The game tells players this in plain
words when a connection times out and suggests trying another network.

### Turning on a reliable relay (Cloudflare Realtime TURN)

1. Cloudflare dashboard → Realtime → TURN Server → **Create**. Copy the
   **Turn Token ID** and the **API Token** (shown once).
2. In Vercel → Project → Settings → Environment Variables (Production, and
   Preview if you want it there), add:
   - `CLOUDFLARE_TURN_KEY_ID` = the Turn Token ID
   - `CLOUDFLARE_TURN_KEY_API_TOKEN` = the API Token
3. Redeploy. `POST /api/turn` then answers `{"relay": true, "iceServers": [...]}`
   with credentials that expire after 2 hours; the lobby's footnote mentions the
   relay. Without the variables it answers `{"relay": false}` with STUN only.

The API token stays on the server (the route mints short-lived credentials
with it); never put it in a `NEXT_PUBLIC_` variable. The route is rate-limited
per IP (20 requests / 10 min, best effort, see Rate limiting above).
Relayed traffic is billed per GB after Cloudflare's free allowance (check
their current pricing); a race only moves a few KB per second per player, and
only pairs that can't connect directly use the relay at all.

### Self-hosting the signalling server (optional)

The public PeerJS cloud is a third-party service with no uptime promise. To
run your own: `npx peer --port 9000 --path /myapp` (or the `peer` package
behind any Node host that allows WebSockets; Vercel functions don't), then set:

- `NEXT_PUBLIC_PEER_HOST` (e.g. `peer.example.com`)
- `NEXT_PUBLIC_PEER_PORT` (e.g. `443`)
- `NEXT_PUBLIC_PEER_PATH` (e.g. `/myapp`)
- `NEXT_PUBLIC_PEER_SECURE` (`true` for https/wss)

These are read at build time, so redeploy after changing them. When a custom
host is set, PeerJS's free TURN is no longer offered, so pair it with the
Cloudflare TURN variables.

### Testing it locally

`npx -y peer --port 9000 --path /myapp` (add `--host 127.0.0.1` on a machine
without IPv6), then build with
`NEXT_PUBLIC_PEER_HOST=localhost NEXT_PUBLIC_PEER_PORT=9000 NEXT_PUBLIC_PEER_PATH=/myapp NEXT_PUBLIC_PEER_SECURE=false`.
Adding `NEXT_PUBLIC_NET_DEBUG=1` to that build exposes `window.__bayNet`
(room state, remote car positions, a way to press the throttle, a smaller
room size) for scripted tests; leave it off in production.
