# NEIL.OS — Portfolio

Personal portfolio of Neil Jacob Santiago, built with Next.js 16 (App Router), React 19, Tailwind CSS v4 and react-three-fiber.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional: chat, email, site URL
npm run dev
```

`npm run build && npm start` runs the production build. `npm run lint` lints.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Hero, bio, tech stack, directory of every route, live GitHub/weather telemetry |
| `/systems` | Network & security projects |
| `/media` | Photography / video / production work |
| `/clearance` | Certifications earned and planned |
| `/gear` | Hardware loadout |
| `/terminal` | Interactive shell (`help`, `ls`, `cd systems`, …) |
| `/logs` | System log |
| `/contact` | Contact form → `/api/contact` |
| `/api/chat` | NeilAI (Gemini) endpoint used by the floating chat button |

Navigation, socials and identity live in `src/lib/site.ts`; the navbar, footer, terminal, sitemap and NeilAI all read from it. Social links set to `null` show as "pending" until you add a URL.

## Project layout

```
src/
  app/                 routes (Server Components), API routes, sitemap/robots
  components/
    layout/            NavBar, Footer, PageHeader/PageShell
    home/              home-page sections
    effects/           cursor, network background, 3D sentinel, reveal observer
    chat/              NeilAI launcher + lazily loaded panel
    contact/ terminal/ interactive client islands
  lib/                 site config, device profile, telemetry fetchers, helpers
```

## Performance notes

- Pages are Server Components and prerendered statically. Only small interactive parts ship JavaScript.
- Scroll reveals use one shared `IntersectionObserver` plus CSS (`reveal()` in `src/lib/reveal.ts`), not an animation library.
- `useDeviceProfile()` (`src/lib/device.ts`) detects low-power devices: ≤4 GB RAM or ≤4 cores, Data Saver, 2G, or reduced motion. On those devices, and on screens narrower than 640px, the three.js sentinel is never downloaded, and the background renders as a static image.
- The custom cursor only mounts for mouse/trackpad users. Backdrop blurs are turned off on touch screens.
- Home-page GitHub and weather data are fetched on the server and cached for 30 minutes (ISR).
