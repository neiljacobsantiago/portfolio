# Photography folders

Each folder here is one series in the gallery (`/photography`). The folder
name must match a `slug` in `src/content/series.ts`:

| Folder       | Collection on the site |
| ------------ | ---------------------- |
| `events`     | School Events          |
| `portraits`  | Fashion Portraits      |
| `landscapes` | Natural Landscapes     |
| `concerts`   | Live Concerts & OPM    |
| `astro`      | Astrophotography       |

1. Export JPG/WebP images (2000–2400px on the long edge is plenty — Next.js
   makes smaller versions for phones automatically). HEIC isn't supported;
   export iPhone shots as JPG.
2. Drop them into the right folder, keeping your file names
   (`amf-12.jpg`, `wp-1.jpg`, `StreetConcert-17.jpg`…).
3. Captions come from `captions.json` in the same folder (already filled in
   for your photos — e.g. `IMG_3854.JPG` → "Rico Blanco"). Matching ignores
   upper/lower case and the extension. The **first entry is the big feature
   photo** for that collection, and photos follow the order of the file:

   ```json
   {
     "wp-1.jpg": { "title": "Studio session", "note": "Shot on Canon EOS 80D" },
     "Sky.jpg": "Star trails over San Jose City"
   }
   ```

4. Commit and deploy. Empty series show a "developing" placeholder.

To add a new series, add an entry to `src/content/series.ts` and create a
folder with the same slug.
