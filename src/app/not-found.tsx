import type { Metadata } from "next";
import Link from "next/link";
import CurrentPath from "@/components/effects/CurrentPath";
import { mainNav } from "@/lib/site";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[100svh] max-w-[90rem] flex-col justify-center px-5 pt-28 pb-16 md:px-10">
      <p className="label animate-rise-in text-ember">Error 404 · Overexposed</p>
      <h1 className="mt-6 overflow-hidden font-display text-[clamp(3.5rem,13vw,11rem)] leading-[0.9]">
        <span className="animate-line-up block">
          This frame <em className="font-serif text-ember">didn&apos;t develop.</em>
        </span>
      </h1>
      <p className="animate-rise-in mt-8 max-w-xl font-serif text-xl text-ink/80" style={{ animationDelay: "200ms" }}>
        Nothing lives at <code className="font-mono text-base text-ember"><CurrentPath /></code>. It may have moved when the site was redesigned.
      </p>
      <div className="animate-rise-in mt-10 flex flex-wrap gap-3" style={{ animationDelay: "300ms" }}>
        <Link href="/" className="label rounded-full bg-ink px-7 py-4 text-paper hover:bg-ember">
          Back to the start
        </Link>
        {mainNav.map((n) => (
          <Link key={n.href} href={n.href} className="label rounded-full border border-ink/25 px-6 py-4 hover:border-ink">
            {n.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
