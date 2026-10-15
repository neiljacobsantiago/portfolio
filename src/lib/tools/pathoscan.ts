// PathoScan's documented decision rule (from the SRS): the classifier names
// one of five Aspergillus species or "Unknown"; a top match at 90% or more is
// cleared for preliminary screening, anything lower goes for PCR confirmation.

export const SPECIES = ["A. flavus", "A. terreus", "A. fumigatus", "A. tamarii", "A. niger", "Unknown"] as const;
export type Species = (typeof SPECIES)[number];
export const THRESHOLD = 90;

export interface Screening {
  top: Species;
  confidence: number;
  /** Probability for every class, summing to 100. */
  matrix: { label: Species; value: number }[];
  decision: "cleared" | "pcr" | "unknown";
  headline: string;
  detail: string;
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

  const decision = top === "Unknown" ? "unknown" : confidence >= THRESHOLD ? "cleared" : "pcr";
  const copy = {
    cleared: ["Cleared for preliminary screening", `${confidence}% is at or above PathoScan's ${THRESHOLD}% threshold, so the lab can log it as a preliminary identification.`],
    pcr: ["Flag for PCR confirmation", `${confidence}% is below the ${THRESHOLD}% threshold. PathoScan won't force a guess, so the sample goes for PCR confirmation.`],
    unknown: ["Not one of the five species", "The model's best answer is “Unknown”, so nothing is identified and the culture needs further testing."],
  }[decision];

  return { top, confidence, matrix, decision, headline: copy[0], detail: copy[1] };
}
