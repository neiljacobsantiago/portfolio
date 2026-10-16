import CommitLog from "@/components/home/CommitLog";
import Hero from "@/components/home/Hero";
import Manifesto from "@/components/home/Manifesto";
import PhotoMarquee from "@/components/home/PhotoMarquee";
import PhotoTeaser from "@/components/home/PhotoTeaser";
import PhotoZoom from "@/components/home/PhotoZoom";
import PlayTeaser from "@/components/home/PlayTeaser";
import Practices from "@/components/home/Practices";
import RightNow from "@/components/home/RightNow";
import SelectedWork from "@/components/home/SelectedWork";
import Statement from "@/components/home/Statement";
import { getSeries, type Photo, type SeriesWithPhotos } from "@/lib/photos";

// Re-generate (and refresh the weather and GitHub panels) at most every 30 minutes.
export const revalidate = 1800;

/** One from each collection in turn, so neighbouring frames never come from the same set. */
function roundRobin(lists: Photo[][]) {
  const out: Photo[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

/**
 * Frames for the contact-sheet scene: a concert cover leads (it fills the
 * screen first), then frames the moving strip above hasn't already shown.
 */
function contactSheet(series: SeriesWithPhotos[], shown: Photo[]) {
  const lead = series.find((s) => s.slug === "concerts")?.photos[0] ?? series[0]?.photos[0];
  const seen = new Set(shown.map((p) => p.src));
  const rest = series.map((s) => s.photos.filter((p) => p !== lead));
  const photos = [...roundRobin(rest.map((l) => l.filter((p) => !seen.has(p.src)))), ...roundRobin(rest.map((l) => l.filter((p) => seen.has(p.src))))];
  return { lead, photos };
}

export default async function HomePage() {
  const series = await getSeries();
  // A few frames from every collection for the moving strip.
  const strip = series.flatMap((s) => s.photos.slice(0, 4)).slice(0, 18);
  const sheet = contactSheet(series, strip);
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
      {sheet.lead && <PhotoZoom lead={sheet.lead} photos={sheet.photos} />}
      <PhotoTeaser series={series} />
      <RightNow />
      <CommitLog />
    </>
  );
}
