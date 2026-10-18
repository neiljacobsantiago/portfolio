import type { ReactNode } from "react";
import styles from "./about.module.css";

/**
 * Vertical rail that fills with colour as the timeline scrolls through the
 * screen. Pure CSS (a scroll timeline in about.module.css), so it costs
 * nothing on the main thread; without scroll timelines it shows filled.
 */
export default function TimelineRail({ children }: { children: ReactNode }) {
  return (
    <div className="relative pl-9 md:pl-14">
      <span aria-hidden className="absolute top-3 bottom-3 left-[0.45rem] w-[2px] rounded-full bg-ink/12 md:left-[1.1rem]">
        <span className={`${styles.rail} block h-full w-full rounded-full bg-ember`} />
      </span>
      {children}
    </div>
  );
}
