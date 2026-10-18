import Image from "next/image";
import Link from "next/link";
import Magnetic from "@/components/ui/Magnetic";
import Tilt from "@/components/ui/Tilt";
import { reveal } from "@/lib/reveal";
import Icon from "@/components/ui/Icon";

const GAMES = [
  { title: "Island Drive", line: "Drift, jump and take the driver's seat — every project is a landmark." },
  { title: "Shutter", line: "Follow the band; shoot the jump under the strobe." },
  { title: "Subnet Sprint", line: "Be the router: sixty seconds of network maths." },
];

/** Home-page invitation into /play, with a real render of the island. */
export default function PlayTeaser() {
  return (
    <section aria-labelledby="play-title" className="mx-auto max-w-[90rem] px-5 py-24 md:px-10 md:py-32">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="label flex items-center gap-2 text-ember">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ember text-paper">
              <Icon name="play" className="ml-px h-2 w-2" />
            </span>
            Play
          </p>
          <h2 id="play-title" className="mt-5 font-display text-[clamp(2.75rem,6vw,5.5rem)] leading-[1]">
            Too much reading? <em className="font-serif text-ember">Drive it.</em>
          </h2>
          <p className="mt-6 max-w-md font-serif text-xl leading-relaxed text-ink/75">
            Take the jeepney around a 3D island where every landmark is one of Neil&apos;s projects. Drift the ring road, jump the ramps, smash the crates — then drive it after dark from the driver&apos;s seat.
          </p>
          <ul className="mt-8 space-y-3">
            {GAMES.map((g, i) => (
              <li key={g.title} {...reveal("left", i * 90)} className="flex items-baseline gap-4 border-b border-ink/10 pb-3">
                <span className="label text-[0.6rem] text-ink/40">0{i + 1}</span>
                <span className="font-display text-2xl">{g.title}</span>
                <span className="hidden font-serif text-ink/60 italic sm:inline">{g.line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Magnetic>
              <Link href="/play" className="btn bg-ink text-paper hover:bg-ember">
                Start the engine <Icon name="arrow-right" className="arrow" />
              </Link>
            </Magnetic>
          </div>
        </div>

        <div {...reveal("scale")} className="lg:col-span-7">
          <Tilt max={5} className="rounded-[18px]">
            <Link href="/play" className="group relative block overflow-hidden rounded-[18px] bg-sky shadow-[0_50px_100px_-40px_rgb(0_48_73/0.6)] ring-1 ring-ink/10">
              <Image
                src="/play/island-preview.jpg"
                alt="Island Drive at golden hour: the jeepney on the ring road, heading for a jump ramp between palms and flame trees"
                width={1600}
                height={1000}
                sizes="(min-width: 1024px) 55vw, 92vw"
                className="h-auto w-full transition-transform duration-[1.6s] ease-[var(--ease-apple)] group-hover:scale-[1.06]"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-paper/95 text-ink shadow-2xl transition-transform duration-500 ease-[var(--ease-spring)] group-hover:scale-110 md:h-24 md:w-24">
                  <Icon name="play" className="ml-1 h-8 w-8 md:h-9 md:w-9" />
                </span>
              </span>
              <span className="label absolute bottom-4 left-4 rounded-full bg-paper/90 px-3 py-1.5 text-[0.55rem] text-ink">WASD · arrows · or a thumb on your phone</span>
            </Link>
          </Tilt>
        </div>
      </div>
    </section>
  );
}
