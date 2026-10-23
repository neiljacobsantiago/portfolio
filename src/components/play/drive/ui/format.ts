// Times the way timing screens print them.

/** 1:23.456 */
export const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, "0")}.${String(Math.floor(ms % 1000)).padStart(3, "0")}`;
/** 23.456 */
export const secs = (ms: number) => (ms / 1000).toFixed(3);
/** +0.412 or −0.412 (a real minus sign, the same width as the plus) */
export const signed = (ms: number, digits = 3) => `${ms > 0 ? "+" : "−"}${(Math.abs(ms) / 1000).toFixed(digits)}`;

/**
 * Sector colours, as on every timing screen: purple for the best there is,
 * green for a personal best (here: this session), yellow for slower.
 */
export type SectorTone = "purple" | "green" | "yellow" | "none";
export const SECTOR_BG: Record<SectorTone, string> = {
  purple: "bg-[#a259ff]",
  green: "bg-[#2fd27a]",
  yellow: "bg-[#ffd23f]",
  none: "bg-paper/15",
};
export const SECTOR_TEXT: Record<SectorTone, string> = {
  purple: "text-[#c9a2ff]",
  green: "text-[#5fe39b]",
  yellow: "text-[#ffe07a]",
  none: "text-paper/60",
};
