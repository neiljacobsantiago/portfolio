import { Titillium_Web } from "next/font/google";

// Race lettering for Bay Street Circuit only: the HUD, the lobby and the
// boards round the track. A squared, broadcast-style sans in the spirit of
// motorsport graphics; the rest of the site keeps its own type.
export const raceFont = Titillium_Web({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--font-race",
  fallback: ["Arial Narrow", "Arial", "sans-serif"],
});

/** The real (hashed) family name, for canvas text such as track boards. */
export const RACE_FAMILY = raceFont.style.fontFamily;

/** Resolves once the weights used on canvas are loaded, so boards don't bake in the fallback. */
export async function raceFontReady(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all(["600", "700", "900", "italic 900"].map((w) => document.fonts.load(`${w} 64px ${RACE_FAMILY}`)));
  } catch {}
}
