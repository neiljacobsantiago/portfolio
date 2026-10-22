import type { CSSProperties } from "react";

// Each line is true to a featured project (see content/work.ts) or the Web practice.
const SEGMENTS: { text: string; em?: boolean }[] = [
  { text: "Plan it first,", em: true },
  { text: "then build it in small steps and test each one." },
  { text: "A classifier that names fungal species without the internet." },
  { text: "A shop that checks your PC parts fit." },
  { text: "Six short videos on data privacy." },
  { text: "A festival day from the front barrier.", em: true },
];

// Slice of the paragraph's pass through the screen (CSS `cover` range) in which the words fill in.
const START = 24;
const SPAN = 38;

/**
 * A paragraph that fills in word by word as it scrolls through the screen,
 * Apple-keynote style. CSS only (a view timeline on the paragraph, one slice
 * per word, opacity only); without scroll timelines, with reduced motion or
 * on low-power devices it is simply the paragraph.
 */
export default function Manifesto() {
  const words = SEGMENTS.flatMap((s) => s.text.split(" ").map((w) => ({ w, em: s.em })));
  const n = words.length;

  return (
    <section aria-labelledby="approach-title" className="mx-auto max-w-[90rem] px-5 py-24 md:px-10 md:py-36">
      <div className="grid gap-6 md:grid-cols-12">
        <h2 id="approach-title" className="label pt-3 text-ember md:col-span-3">
          The approach
        </h2>
        <p className="wr-text font-display text-[clamp(2rem,5.4vw,4.75rem)] leading-[1.1] tracking-[-0.01em] md:col-span-9">
          {words.map(({ w, em }, i) => {
            const s = START + (SPAN * i) / n;
            return (
              <span key={i}>
                <span className={em ? "wr-word font-serif text-ember italic" : "wr-word"} style={{ "--s": `${s.toFixed(2)}%`, "--e": `${(s + 7).toFixed(2)}%` } as CSSProperties}>
                  {w}
                </span>{" "}
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}
