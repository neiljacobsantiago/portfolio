import Hero from "@/components/home/Hero";
import PhotoTeaser from "@/components/home/PhotoTeaser";
import Practices from "@/components/home/Practices";
import RightNow from "@/components/home/RightNow";
import SelectedWork from "@/components/home/SelectedWork";
import Statement from "@/components/home/Statement";
import { getSeries } from "@/lib/photos";

// Re-generate (and refresh the weather/GitHub panel) at most every 30 minutes.
export const revalidate = 1800;

export default async function HomePage() {
  const series = await getSeries();
  return (
    <>
      <Hero />
      <Statement />
      <Practices />
      <SelectedWork />
      <PhotoTeaser series={series} />
      <RightNow />
    </>
  );
}
