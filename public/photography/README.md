# Photography folders

Each folder here is one series in the gallery (`/photography`). The folder
name must match a `slug` in `src/content/series.ts`.

1. Export JPG/WebP images (2400px on the long edge is plenty — Next.js
   generates smaller versions for phones automatically).
2. Drop them into the right folder. Files are shown in alphabetical order,
   so prefix with numbers to control order: `01-encore.jpg`, `02-crowd.jpg`.
3. Alt text comes from the file name (`01-encore.jpg` → "01 encore").
   For better captions add a `captions.json` next to the images:
   `{ "01-encore.jpg": "Encore under red light, Aurora 2026" }`
4. Commit and deploy. Empty series show a "developing" placeholder.

To add a new series, add an entry to `src/content/series.ts` and create a
folder with the same slug.
