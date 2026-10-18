import CommitLog from "@/components/home/CommitLog";
import Hero from "@/components/home/Hero";
import Manifesto from "@/components/home/Manifesto";
import PhotoMarquee from "@/components/home/PhotoMarquee";
import PhotoTeaser from "@/components/home/PhotoTeaser";
import PhotoZoom, { type Panel } from "@/components/home/PhotoZoom";
import PlayTeaser from "@/components/home/PlayTeaser";
import Practices from "@/components/home/Practices";
import RightNow from "@/components/home/RightNow";
import SelectedWork from "@/components/home/SelectedWork";
import Statement from "@/components/home/Statement";
import { getSeries, type Photo, type SeriesWithPhotos } from "@/lib/photos";

// Re-generate (and refresh the weather and GitHub panels) at most every 30 minutes.
export const revalidate = 1800;

/** Collections in the order the cover-art grid hands out its panels (big slots first). */
const PANEL_ORDER = ["portraits", "photo-mode", "everyday", "astro", "events", "landscapes"];
const PANELS = 7;

/**
 * Panels for the cover-art grid: a concert frame takes the hero slot, then one
 * frame from every other collection (preferring ones the moving strip above
 * hasn't shown), then second frames if a small library leaves slots empty.
 */
function coverPanels(series: SeriesWithPhotos[], shown: Photo[]): Panel[] {
  const heroSeries = series.find((s) => s.slug === "concerts" && s.photos.length > 0) ?? series.find((s) => s.photos.length > 0);
  if (!heroSeries) return [];
  const seen = new Set(shown.map((p) => p.src));
  const used = new Set([heroSeries.photos[0].src]);
  const pick = (s: SeriesWithPhotos): Panel | null => {
    const photo = s.photos.find((p) => !used.has(p.src) && !seen.has(p.src)) ?? s.photos.find((p) => !used.has(p.src));
    if (!photo) return null;
    used.add(photo.src);
    return { photo, slug: s.slug, title: s.title };
  };
  const rank = (slug: string) => (PANEL_ORDER.includes(slug) ? PANEL_ORDER.indexOf(slug) : PANEL_ORDER.length);
  const others = series.filter((s) => s !== heroSeries).sort((a, b) => rank(a.slug) - rank(b.slug));
  const panels: Panel[] = [{ photo: heroSeries.photos[0], slug: heroSeries.slug, title: heroSeries.title }];
  // One per collection first; later passes fill any empty slots with more frames.
  for (let pass = 0; pass < 4 && panels.length < PANELS; pass++) {
    for (const s of pass === 0 ? others : [...others, heroSeries]) {
      if (panels.length >= PANELS) break;
      const next = pick(s);
      if (next) panels.push(next);
    }
  }
  return panels;
}

export default async function HomePage() {
  const series = await getSeries();
  // A few frames from every collection for the moving strip.
  const strip = series.flatMap((s) => s.photos.slice(0, 4)).slice(0, 18);
  const panels = coverPanels(series, strip);
  // Two prints for the hero: a concert frame and a landscape, if those collections exist.
  const prints = ["concerts", "landscapes", "astro"].map((slug) => series.find((s) => s.slug === slug)?.photos[1] ?? series.find((s) => s.slug === slug)?.photos[0]).filter((p) => p !== undefined);
  // Pinned scenes are spaced out so two never run back to back.
  return (
    <>
      <Hero prints={prints} collections={series.length} />
      <Statement />
      <PhotoMarquee photos={strip} />
      <Practices />
      <Manifesto />
      <SelectedWork />
      <PlayTeaser />
      {panels.length >= PANELS && <PhotoZoom panels={panels} collections={series.length} />}
      <PhotoTeaser series={series} />
      <RightNow />
      <CommitLog />
    </>
  );
}
