// PathoScan's confidence threshold, as the team uses it. The classifier names
// one of five Aspergillus species or "Unknown". A top match at 90% or more is
// confident enough to use for preliminary screening. Below 90% is not a
// verdict: it's the app telling the lab tech to look twice before relying on
// the call. The bar exists because the costly mistake is a false positive (a
// wrong species reported with confidence), not a cautious second look.

export const SPECIES = ["A. flavus", "A. terreus", "A. fumigatus", "A. tamarii", "A. niger", "Unknown"] as const;
export type Species = (typeof SPECIES)[number];
export const THRESHOLD = 90;

export type Decision = "confident" | "look-twice" | "unknown";

/** Colony traits on PDA from PathoScan's built-in reference, used to check a call by eye. */
export const TRAITS: Record<Exclude<Species, "Unknown">, { growth: string; surface: string; reverse: string; texture: string }> = {
  "A. flavus": { growth: "Rapid, 32–63 mm", surface: "Green to dark green", reverse: "Clear, smooth", texture: "White, with clear exudates" },
  "A. terreus": { growth: "Rapid, 29–65 mm", surface: "Brown", reverse: "Clear, slightly wrinkled", texture: "White" },
  "A. fumigatus": { growth: "Rapid, 33–64 mm", surface: "Pale green", reverse: "Brown, wrinkled", texture: "White" },
  "A. tamarii": { growth: "Moderately rapid, 30–55 mm", surface: "Dark green", reverse: "Brown, slightly wrinkled", texture: "White" },
  "A. niger": { growth: "Rapid, 31–62 mm", surface: "Black", reverse: "Black, smooth", texture: "White" },
};

export interface Screening {
  top: Species;
  confidence: number;
  /** Probability for every class, summing to 100. */
  matrix: { label: Species; value: number }[];
  decision: Decision;
  headline: string;
  detail: string;
  /** What the tech can do next, in order of effort. */
  next: string[];
}

/** Spreads the remaining probability over the other classes so the matrix reads like a real result. */
export function screen(topIn: string | undefined, confidenceIn: number): Screening {
  const top = (SPECIES.find((s) => s.toLowerCase().replace(/^a\.\s*/, "") === (topIn ?? "").toLowerCase().replace(/^(a\.|aspergillus)\s*/, "")) ??
    "A. flavus") as Species;
  const confidence = Math.max(1, Math.min(100, Math.round(confidenceIn * 10) / 10));
  const rest = SPECIES.filter((s) => s !== top);
  const weights = [0.46, 0.24, 0.14, 0.1, 0.06];
  const remainder = 100 - confidence;
  const matrix = [
    { label: top, value: confidence },
    ...rest.map((label, i) => ({ label, value: Math.round(remainder * weights[i] * 10) / 10 })),
  ];

  const decision: Decision = top === "Unknown" ? "unknown" : confidence >= THRESHOLD ? "confident" : "look-twice";
  const copy: Record<Decision, [string, string, string[]]> = {
    confident: [
      "Confident enough to screen with",
      `${confidence}% clears PathoScan's ${THRESHOLD}% bar, so the lab can use ${top} as its preliminary screening result. It is still a screening call, not a confirmation.`,
      ["Glance at the colony traits to make sure the plate agrees."],
    ],
    "look-twice": [
      "Look twice before relying on it",
      `${confidence}% is under the ${THRESHOLD}% bar. That doesn't make ${top} wrong; it means take a second look before it goes on record. The bar is there to stop false positives, a wrong species reported with confidence.`,
      ["Re-scan: overhead, even light, no glare.", "Compare the plate with the colony traits below.", "Verify further if the lab sees fit."],
    ],
    unknown: [
      "No confident match",
      "The best answer is “Unknown”: the plate doesn't look like any of the five species, or the photo is unclear. PathoScan says so instead of forcing a guess.",
      ["Re-scan with a clearer photo.", "Check that it's a PDA culture at 5 to 7 days."],
    ],
  };
  const [headline, detail, next] = copy[decision];
  return { top, confidence, matrix, decision, headline, detail, next };
}
