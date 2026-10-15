import CommitLog from "@/components/home/CommitLog";
import Hero from "@/components/home/Hero";
import PhotoMarquee from "@/components/home/PhotoMarquee";
import PlayTeaser from "@/components/home/PlayTeaser";
import PhotoTeaser from "@/components/home/PhotoTeaser";
import Practices from "@/components/home/Practices";
import RightNow from "@/components/home/RightNow";
import SelectedWork from "@/components/home/SelectedWork";
import Statement from "@/components/home/Statement";
import { getSeries } from "@/lib/photos";

// Re-generate (and refresh the weather and GitHub panels) at most every 30 minutes.
export const revalidate = 1800;

export default async function HomePage() {
  const series = await getSeries();
  // A few frames from every collection for the moving strip.
  const strip = series.flatMap((s) => s.photos.slice(0, 4)).slice(0, 18);
  return (
    <>
      <Hero />
      <Statement />
      <PhotoMarquee photos={strip} />
      <Practices />
      <SelectedWork />
      <PlayTeaser />
      <PhotoTeaser series={series} />
      <RightNow />
      <CommitLog />
    </>
  );
}
