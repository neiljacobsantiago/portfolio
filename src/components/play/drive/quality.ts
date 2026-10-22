// Graphics tiers for the circuit, and the governor that keeps it smooth.
//   · the tier is a guess from the GPU's own name (WEBGL_debug_renderer_info),
//     memory, cores and the screen; ?gfx=low|medium|high overrides it
//   · a warm-up during the title shots measures real frame times; a device
//     that can't keep up is remembered, and gets a lower tier next visit
//   · while driving, the governor sheds effects first (bloom, grass reach)
//     and resolution last, with hysteresis so it doesn't flicker; phones
//     with sharp screens never drop under one pixel per CSS pixel unless
//     nothing else is left

export type Quality = "low" | "medium" | "high";

export interface GraphicsProfile {
  quality: Quality;
  /** The tier was guessed (not forced with ?gfx), so the warm-up may revise it. */
  auto: boolean;
  /** The GPU's name, for remembering a revised tier against the same hardware. */
  gpu: string;
  /** A phone or tablet: coarse pointer. */
  phone: boolean;
  /** ?gfxlock: hold the tier's full resolution and effects (for testing and screenshots). */
  lock: boolean;
  /** html.low-power or reduced motion: no swaying grass. */
  calm: boolean;
  /** ?gfxoff=grass,trees,post: switches parts off, for profiling. */
  off: string[];
}

const STORE = "bay-circuit-gfx";
const ORDER: Quality[] = ["low", "medium", "high"];
const lower = (q: Quality): Quality => ORDER[Math.max(0, ORDER.indexOf(q) - 1)];

/** The GPU's name: "Adreno (TM) 610", "Mali-G57 MC2", "Apple GPU", "ANGLE (NVIDIA, …)". */
function gpuName() {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return name;
  } catch {
    return "";
  }
}

/** A tier from the GPU's name alone, or null when it doesn't say enough. */
function fromGpu(name: string, phone: boolean): Quality | null {
  const n = name.toLowerCase();
  if (!n) return null;
  if (/swiftshader|llvmpipe|software|basic render/.test(n)) return "low";
  // Apple: every iPhone since WebGL 2 arrived (A12 and later) and every M-series Mac copes well
  if (/apple (gpu|m\d)/.test(n)) return "high";
  const adreno = n.match(/adreno[^\d]*(\d{3})/);
  if (adreno) {
    const v = Number(adreno[1]);
    if (v >= 730 || (v >= 640 && v < 700)) return "high";
    if (v >= 618) return "medium"; // 618–630, and the 7xx mid-rangers (710, 720, 725)
    return "low"; // 610, 612, 616 and the 5xx
  }
  if (/immortalis/.test(n)) return "high";
  const mali = n.match(/mali-?g(\d{2,3})/);
  if (mali) {
    const v = Number(mali[1]);
    if (v >= 710 || v === 78 || v === 77) return "high"; // flagship Malis
    if (v >= 610 || v === 76 || v === 68) return "medium";
    return "low"; // G31, G51, G52, G57, G72
  }
  if (/mali/.test(n)) return "low"; // T-series
  if (/xclipse/.test(n)) return "high";
  if (/powervr|img bxm|img bxe/.test(n)) return "low";
  if (/nvidia|geforce|rtx|radeon rx|radeon pro|quadro/.test(n)) return "high";
  if (/intel.*(iris|arc)/.test(n)) return phone ? "medium" : "high";
  if (/intel|radeon/.test(n)) return "medium";
  return null;
}

/** Picks a graphics tier from what the device tells us. */
export function detectGraphics(coarse: boolean): GraphicsProfile {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const params = new URLSearchParams(location.search);
  const lock = params.has("gfxlock");
  const calm = document.documentElement.classList.contains("low-power") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gpu = gpuName();
  const base = { gpu, phone: coarse, lock, calm, off: (params.get("gfxoff") ?? "").split(",").filter(Boolean) };
  // ?gfx=low|medium|high overrides the guess (handy on a device that guesses wrong)
  const forced = params.get("gfx");
  if (forced === "low" || forced === "medium" || forced === "high") return { ...base, quality: forced, auto: false };

  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  let quality: Quality;
  if (document.documentElement.classList.contains("low-power") || nav.connection?.saveData || memory <= 2) quality = "low";
  else {
    const guess = fromGpu(gpu, coarse);
    if (guess) quality = guess;
    // Nothing from the GPU: fall back on memory and cores
    else if (coarse) quality = memory <= 3 || cores <= 4 ? "low" : "medium";
    else quality = cores >= 8 && memory >= 8 ? "high" : "medium";
    // A small-memory phone with a huge screen pays for every pixel
    if (coarse && quality === "high" && memory <= 4 && screen.width * screen.height * devicePixelRatio ** 2 > 3.2e6) quality = "medium";
  }
  // The warm-up on an earlier visit found this GPU slower than its name suggests
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? "null") as { gpu?: string; quality?: Quality } | null;
    if (saved?.gpu === gpu && saved.quality && ORDER.indexOf(saved.quality) < ORDER.indexOf(quality)) quality = saved.quality;
  } catch {}
  return { ...base, quality, auto: true };
}

/** What each tier draws. Counts are for the whole circuit; the governor trims reach, not counts. */
export interface TierSettings {
  /** Internal resolution cap, as a multiple of CSS pixels. */
  ratio: number;
  /** Lowest the governor goes before the last resort, and the last resort. */
  floor: number;
  lastResort: number;
  /** Bloom and a colour grade through a half-float target with 4× MSAA. */
  post: boolean;
  bloomMips: number;
  shadowMap: number;
  /** Grass: blades per side of the near and far grids (0: no far grid), and how far each reaches (m). */
  grassGrid: [number, number];
  grassReach: [number, number];
  trees: number;
  shrubs: number;
  /** Leaf cards per canopy puff. */
  cards: number;
  lanterns: number;
  rocks: number;
  petals: number;
}

export function tierSettings(q: Quality, phone: boolean): TierSettings {
  const dpr = typeof devicePixelRatio === "number" ? devicePixelRatio : 1;
  // Sharp phone screens hold at least one device pixel per CSS pixel
  const sharp = phone && dpr >= 2;
  const cap = (r: number) => Math.min(dpr, r);
  switch (q) {
    case "low":
      return { ratio: cap(phone ? 1.25 : 1), floor: cap(sharp ? 1 : 0.85), lastResort: cap(0.75), post: false, bloomMips: 0, shadowMap: 0, grassGrid: [120, 0], grassReach: [22, 0], trees: 110, shrubs: 70, cards: 6, lanterns: 34, rocks: 60, petals: 0 };
    case "medium":
      return { ratio: cap(1.5), floor: cap(sharp ? 1 : 0.85), lastResort: cap(0.8), post: true, bloomMips: 4, shadowMap: 1024, grassGrid: [170, 90], grassReach: [26, 70], trees: 220, shrubs: 150, cards: 9, lanterns: 60, rocks: 130, petals: 900 };
    default:
      return { ratio: cap(2), floor: cap(sharp ? 1.25 : 1), lastResort: cap(sharp ? 1 : 0.85), post: true, bloomMips: 5, shadowMap: 2048, grassGrid: [240, 150], grassReach: [30, 100], trees: 340, shrubs: 240, cards: 12, lanterns: 90, rocks: 220, petals: 2200 };
  }
}

/** Knobs the governor turns, in the order it gives them up. */
export interface Knobs {
  bloom: (on: boolean) => void;
  /** Grass and tree reach as a fraction of the tier's. */
  reach: (k: number) => void;
  ratio: (r: number) => void;
}

/**
 * Watches frame times and trades quality for frames. Steps down quickly
 * when a 1.5 s window averages under ~42 fps, steps back up only after four
 * windows in a row near the display's own rate.
 */
export function createGovernor(profile: GraphicsProfile, tier: TierSettings, knobs: Knobs) {
  // The ladder: each rung is one step down from the one before
  type Rung = { bloom: boolean; reach: number; ratio: number };
  const ladder: Rung[] = [];
  let r: Rung = { bloom: tier.post, reach: 1, ratio: tier.ratio };
  ladder.push(r);
  if (tier.post) ladder.push((r = { ...r, bloom: false }));
  ladder.push((r = { ...r, reach: 0.65 }));
  for (let x = tier.ratio - 0.25; x > tier.floor + 0.01; x -= 0.25) ladder.push((r = { ...r, ratio: x }));
  if (tier.floor < r.ratio) ladder.push((r = { ...r, ratio: tier.floor }));
  ladder.push((r = { ...r, reach: 0.45 }));
  if (tier.lastResort < tier.floor) ladder.push({ ...r, ratio: tier.lastResort });

  let rung = 0;
  let sum = 0;
  let count = 0;
  let frames = 0;
  let good = 0;
  let cooldown = 0;
  let warmed = false;
  const apply = () => {
    const x = ladder[rung];
    knobs.bloom(x.bloom);
    knobs.reach(x.reach);
    knobs.ratio(x.ratio);
  };
  apply();
  return {
    get ratio() {
      return ladder[rung].ratio;
    },
    get rung() {
      return rung;
    },
    tick(dt: number) {
      if (profile.lock) return;
      frames++;
      // The first frames compile shaders and upload geometry: not a fair test
      if (frames < 30) return;
      sum += dt;
      count++;
      if (count < (warmed ? 90 : 60)) return;
      const avg = sum / count;
      sum = 0;
      count = 0;
      if (!warmed) {
        warmed = true;
        // Warm-up: a device far off the pace jumps several rungs at once, and is remembered
        if (avg > 1 / 26) {
          rung = Math.min(ladder.length - 1, rung + Math.ceil(ladder.length / 2));
          if (profile.auto && profile.quality !== "low")
            try {
              localStorage.setItem(STORE, JSON.stringify({ gpu: profile.gpu, quality: lower(profile.quality) }));
            } catch {}
          apply();
          cooldown = 2;
          return;
        }
      }
      if (cooldown > 0) cooldown--;
      if (avg > 1 / 42 && rung < ladder.length - 1 && cooldown === 0) {
        rung++;
        good = 0;
        cooldown = 1;
        apply();
      } else if (avg < 1 / 55 && rung > 0) {
        if (++good >= 4) {
          good = 0;
          rung--;
          cooldown = 2;
          apply();
        }
      } else good = 0;
    },
  };
}
