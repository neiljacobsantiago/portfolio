// Dynamic memory partitioning, as in Neil's CS 2101 Memory Allocation Simulator:
// processes are placed into free holes; whatever a process doesn't use stays
// behind as a smaller hole that later processes can take.

export type Algorithm = "first" | "best" | "worst" | "next";

export const ALGORITHMS: Record<Algorithm, { label: string; rule: string }> = {
  first: { label: "First-Fit", rule: "Takes the first hole big enough, scanning from the start." },
  best: { label: "Best-Fit", rule: "Takes the smallest hole that still fits — least leftover." },
  worst: { label: "Worst-Fit", rule: "Takes the largest hole — leaves the biggest leftover." },
  next: { label: "Next-Fit", rule: "Like First-Fit, but resumes scanning where the last placement ended." },
};

export interface Segment {
  /** null = free space */
  process: number | null;
  size: number;
}

export interface Placement {
  process: number;
  size: number;
  /** Index of the original block it landed in, or null if it had to wait. */
  block: number | null;
}

export interface AllocationResult {
  algorithm: Algorithm;
  blocks: { size: number; segments: Segment[] }[];
  placements: Placement[];
  freeLeft: number;
  largestHole: number;
  /** External fragmentation: free memory exists in total, but no single hole fits a waiting process. */
  externalFragmentation: boolean;
  utilization: number;
}

export const DEFAULT_BLOCKS = [100, 500, 200, 300, 600];
export const DEFAULT_PROCESSES = [212, 417, 112, 426];

export function allocate(blocksIn: number[], processesIn: number[], algorithm: Algorithm): AllocationResult {
  const clamp = (xs: number[]) => xs.map((x) => Math.round(Number(x))).filter((x) => Number.isFinite(x) && x > 0 && x <= 1_000_000).slice(0, 12);
  const blockSizes = clamp(blocksIn);
  const processes = clamp(processesIn);

  // Each block keeps an ordered list of segments; free segments are the holes.
  const blocks = blockSizes.map((size) => ({ size, segments: [{ process: null, size }] as Segment[] }));
  const placements: Placement[] = [];
  let lastBlock = 0;

  processes.forEach((size, p) => {
    const holes: { block: number; seg: number; size: number }[] = [];
    blocks.forEach((b, bi) => b.segments.forEach((s, si) => s.process === null && s.size >= size && holes.push({ block: bi, seg: si, size: s.size })));

    let pick: (typeof holes)[number] | undefined;
    if (algorithm === "first") pick = holes[0];
    else if (algorithm === "best") pick = holes.reduce<typeof pick>((a, h) => (!a || h.size < a.size ? h : a), undefined);
    else if (algorithm === "worst") pick = holes.reduce<typeof pick>((a, h) => (!a || h.size > a.size ? h : a), undefined);
    else pick = holes.find((h) => h.block >= lastBlock) ?? holes[0];

    if (!pick) {
      placements.push({ process: p + 1, size, block: null });
      return;
    }
    const segs = blocks[pick.block].segments;
    const leftover = segs[pick.seg].size - size;
    segs.splice(pick.seg, 1, { process: p + 1, size }, ...(leftover > 0 ? [{ process: null, size: leftover }] : []));
    placements.push({ process: p + 1, size, block: pick.block });
    lastBlock = pick.block;
  });

  const holes = blocks.flatMap((b) => b.segments.filter((s) => s.process === null).map((s) => s.size));
  const freeLeft = holes.reduce((a, b) => a + b, 0);
  const largestHole = Math.max(0, ...holes);
  const total = blockSizes.reduce((a, b) => a + b, 0);
  const waiting = placements.filter((p) => p.block === null);

  return {
    algorithm,
    blocks,
    placements,
    freeLeft,
    largestHole,
    externalFragmentation: waiting.some((w) => w.size <= freeLeft && w.size > largestHole),
    utilization: total ? (total - freeLeft) / total : 0,
  };
}

/** "100, 500 200" → [100, 500, 200] */
export const parseSizes = (text: string) =>
  text
    .split(/[^\d]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => n > 0)
    .slice(0, 12);
