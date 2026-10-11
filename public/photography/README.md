# Photography folders

Each folder here is one series in the gallery (`/photography`). The folder
name must match a `slug` in `src/content/series.ts`:

| Folder       | Series on the site |
| ------------ | ------------------ |
| `concerts`   | Concerts           |
| `portraits`  | Portraits          |
| `astro`      | Night Sky          |
| `events`     | Campus & Events    |
| `field`      | Field Notes        |

1. Export JPG/WebP images (2000–2400px on the long edge is plenty — Next.js
   makes smaller versions for phones automatically). HEIC isn't supported;
   export iPhone shots as JPG.
2. Drop them into the right folder. They show in alphabetical order, so you
   can keep your names (`amf-12.jpg`, `wp-1.jpg`, `StreetConcert-17.jpg`…) or
   prefix numbers to control the order.
3. Captions come from the file name unless you add them to `captions.json`
   in the same folder:

   ```json
   {
     "wp-1.jpg": { "title": "Studio session", "note": "Shot on Canon EOS 80D" },
     "Sky.jpg": "Star trails over San Jose City"
   }
   ```

4. Commit and deploy. Empty series show a "developing" placeholder.

To add a new series, add an entry to `src/content/series.ts` and create a
folder with the same slug.
