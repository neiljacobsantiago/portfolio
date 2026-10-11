# Neil Jacob Santiago — Portfolio

Personal site for Neil Jacob Santiago: networks, security and photography.
Built with Next.js 16 (App Router), React 19 and Tailwind CSS v4.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional: chat, email, site URL
npm run dev
```

`npm run build && npm start` runs the production build. `npm run lint` lints.

## Pages

| Route | What it is |
| --- | --- |
| `/` | Hero with the interactive "darkroom" portrait, pinned statement scene, four practices (horizontal scroll on desktop), stacked project cards, photography series, live "Right now" panel |
| `/work` | Projects, each with a plain-English one-liner |
| `/photography` | Filterable gallery with full-screen lightbox, plus series notes and a link to the dedicated photo site |
| `/about` | Story, timeline, credentials, toolkit and gear |
| `/contact` | Contact form → `/api/contact` |
| `/terminal` | The old command line, kept as an easter egg (linked in the footer) |

Old URLs (`/systems`, `/media`, `/gear`, `/clearance`, `/logs`) redirect to their new homes.

## Editing content

- **Identity, nav, socials, photography website link** — `src/lib/site.ts`. Set
  `photographySite.url` and the link appears on the home page, gallery and footer.
  Social links set to `null` show as "soon".
- **Projects** — `src/content/work.ts`
- **Photography series** — `src/content/series.ts`
- **Timeline, credentials, toolkit, gear** — `src/content/about.ts`

### Adding photos

Drop images into `public/photography/<series-slug>/` and redeploy; the gallery
reads the folders at build time. See `public/photography/README.md` for naming
and captions.

## Design

- Palette: `#780000` wine · `#C1121F` ember · `#FDF0D5` paper · `#003049` ink · `#669BBC` sky
  ([coolors](https://coolors.co/palette/780000-c1121f-fdf0d5-003049-669bbc)), defined in `src/app/globals.css`.
- Type: Gloock (display), Newsreader (text), Courier Prime (labels).
- The living background is CSS only: drifting colour fields and film grain.

## Performance notes

- Pages are Server Components, prerendered statically. Only interactive parts ship JavaScript.
- Pinned/horizontal scroll scenes and Lenis smooth scrolling only run on desktop-width,
  mouse-driven, capable devices. Phones get native swipe rows and plain vertical layouts.
- `useDeviceProfile()` (`src/lib/device.ts`) detects Data Saver, 2G, very weak hardware and
  reduced-motion, and turns off ambient animation for them.
- Scroll reveals use one shared `IntersectionObserver` plus CSS (`reveal()` in `src/lib/reveal.ts`).
- Weather and latest-GitHub data are fetched on the server and cached for 30 minutes.
