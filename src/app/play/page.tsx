import type { Metadata } from "next";
import { Container } from "@/components/layout/PageHeader";
import ContactSheet from "@/components/play/ContactSheet";
import DriveGame from "@/components/play/drive/DriveGame";
import ShutterGame from "@/components/play/ShutterGame";
import PacketCheck from "@/components/play/PacketCheck";
import { reveal } from "@/lib/reveal";

export const metadata: Metadata = {
  title: "Play",
  description: "Set a lap on a floodlit 3D street circuit by the bay, where every pavilion opens one of Neil Jacob Santiago's projects. Then time a concert shot in Shutter, match pairs of his photographs in Contact Sheet, or play the router in Packet Check.",
};

export default function PlayPage() {
  return (
    <>
      <DriveGame />

      <div id="arcade" className="scroll-mt-16" />
      <Container className="py-24 md:py-32">
        <div className="mb-14 grid gap-6 md:grid-cols-12">
          <p className="label text-ember md:col-span-3">The arcade</p>
          <div className="md:col-span-9">
            <h2 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.04]">
              Three more, built from <em className="font-serif text-ember">the day jobs.</em>
            </h2>
            <p className="mt-5 max-w-xl font-serif text-xl leading-relaxed text-ink/75">
              A timing game for the photographer at the barricade, a quiz for the network engineer who also teaches people to spot a phishing email, and a pairs game dealt from his own prints.
            </p>
          </div>
        </div>

        <div className="grid gap-16 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-20">
          <section aria-labelledby="shutter-title" {...reveal("up")} className="min-w-0">
            <p className="label text-[0.6rem] text-ink/50">Game 02</p>
            <h3 id="shutter-title" className="mt-2 font-display text-4xl">Shutter</h3>
            <p className="mt-2 mb-6 font-serif text-lg text-ink/70 italic">Concert photography is timing. Follow the performer and shoot at the top of the jump, under a light. Easy mode shows you the moment; Pro tightens every window.</p>
            <ShutterGame />
          </section>
          <section aria-labelledby="packet-title" {...reveal("up", 120)} className="min-w-0">
            <p className="label text-[0.6rem] text-ink/50">Game 03</p>
            <h3 id="packet-title" className="mt-2 font-display text-4xl">Packet Check</h3>
            <p className="mt-2 mb-6 font-serif text-lg text-ink/70 italic">You&apos;re the router. Networking basics and everyday security, twelve questions at a time, with a short explanation after every answer.</p>
            <PacketCheck />
          </section>
          <section aria-labelledby="sheet-title" {...reveal("up")} className="min-w-0 lg:col-span-2">
            <p className="label text-[0.6rem] text-ink/50">Game 04</p>
            <h3 id="sheet-title" className="mt-2 font-display text-4xl">Contact Sheet</h3>
            <p className="mt-2 mb-6 max-w-2xl font-serif text-lg text-ink/70 italic">Pairs, played on Neil&apos;s photographs: festival stages, a blood moon, the coast and a few favourite places. Fewest moves wins.</p>
            <ContactSheet />
          </section>
        </div>
      </Container>
    </>
  );
}
