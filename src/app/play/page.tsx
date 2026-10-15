import type { Metadata } from "next";
import { Container } from "@/components/layout/PageHeader";
import DriveGame from "@/components/play/drive/DriveGame";
import ShutterGame from "@/components/play/ShutterGame";
import SubnetSprint from "@/components/play/SubnetSprint";
import { reveal } from "@/lib/reveal";

export const metadata: Metadata = {
  title: "Play",
  description: "Drive a jeepney around a 3D island of Neil Jacob Santiago's projects, time a concert shot, or race the clock on subnetting.",
};

export default function PlayPage() {
  return (
    <>
      <DriveGame />

      <Container className="py-24 md:py-32">
        <div className="mb-14 grid gap-6 md:grid-cols-12">
          <p className="label text-ember md:col-span-3">The arcade</p>
          <div className="md:col-span-9">
            <h2 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.04]">
              Two more, from <em className="font-serif text-ember">the day jobs.</em>
            </h2>
            <p className="mt-5 max-w-xl font-serif text-xl leading-relaxed text-ink/75">
              One for the photographer at the barricade, one for the network engineer with a subnet mask stuck in his head.
            </p>
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-10">
          <section aria-labelledby="shutter-title" {...reveal("up")} className="min-w-0">
            <p className="label text-[0.6rem] text-ink/50">Game 02</p>
            <h3 id="shutter-title" className="mt-2 font-display text-4xl">Shutter</h3>
            <p className="mt-2 mb-6 font-serif text-lg text-ink/70 italic">Concert photography is timing. Follow the performer, wait for the strobe and the top of the jump — and catch the pyro.</p>
            <ShutterGame />
          </section>
          <section aria-labelledby="sprint-title" {...reveal("up", 120)} className="min-w-0">
            <p className="label text-[0.6rem] text-ink/50">Game 03</p>
            <h3 id="sprint-title" className="mt-2 font-display text-4xl">Subnet Sprint</h3>
            <p className="mt-2 mb-6 font-serif text-lg text-ink/70 italic">You&apos;re the router: sixty seconds of the maths behind every network Neil designs.</p>
            <SubnetSprint />
          </section>
        </div>
      </Container>
    </>
  );
}
