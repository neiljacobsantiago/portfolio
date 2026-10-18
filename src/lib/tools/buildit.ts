// A parts compatibility checker inspired by BuildIT, the PC builder Neil's
// team took from a C program to a Figma prototype to a cloud storefront. The
// parts are a small, hand-picked list with typical published specs (socket,
// memory type, board size, card length, power). No prices: those change
// weekly, and this is about whether parts fit, not what they cost.

export type Socket = "AM4" | "AM5" | "LGA1700";
export type MemType = "DDR4" | "DDR5";
export type FormFactor = "ATX" | "mATX" | "ITX";
export type PsuSize = "ATX" | "SFX";

export interface Cpu {
  id: string;
  name: string;
  socket: Socket;
  memory: MemType[];
  /** Typical package power under a gaming / all-core load, in watts. */
  watts: number;
  /** Has integrated graphics, so it can run without a graphics card. */
  igpu: boolean;
}
export interface Board {
  id: string;
  name: string;
  socket: Socket;
  memory: MemType;
  form: FormFactor;
  slots: number;
}
export interface Ram {
  id: string;
  name: string;
  type: MemType;
  sticks: number;
}
export interface Gpu {
  id: string;
  name: string;
  /** Typical partner-card length, mm. */
  length: number;
  watts: number;
}
export interface Case {
  id: string;
  name: string;
  boards: FormFactor[];
  /** Longest graphics card it takes, mm. */
  gpuClearance: number;
  psu: PsuSize[];
}
export interface Psu {
  id: string;
  name: string;
  watts: number;
  size: PsuSize;
}

export const CPUS: Cpu[] = [
  { id: "r5-5600", name: "AMD Ryzen 5 5600", socket: "AM4", memory: ["DDR4"], watts: 76, igpu: false },
  { id: "r5-7600", name: "AMD Ryzen 5 7600", socket: "AM5", memory: ["DDR5"], watts: 88, igpu: true },
  { id: "r7-7800x3d", name: "AMD Ryzen 7 7800X3D", socket: "AM5", memory: ["DDR5"], watts: 120, igpu: true },
  { id: "i5-13400f", name: "Intel Core i5-13400F", socket: "LGA1700", memory: ["DDR4", "DDR5"], watts: 148, igpu: false },
  { id: "i7-14700k", name: "Intel Core i7-14700K", socket: "LGA1700", memory: ["DDR4", "DDR5"], watts: 253, igpu: true },
];

export const BOARDS: Board[] = [
  { id: "b550", name: "B550 · ATX", socket: "AM4", memory: "DDR4", form: "ATX", slots: 4 },
  { id: "b650", name: "B650 · ATX", socket: "AM5", memory: "DDR5", form: "ATX", slots: 4 },
  { id: "a620m", name: "A620M · Micro-ATX", socket: "AM5", memory: "DDR5", form: "mATX", slots: 2 },
  { id: "b650i", name: "B650I · Mini-ITX", socket: "AM5", memory: "DDR5", form: "ITX", slots: 2 },
  { id: "b760m-d4", name: "B760M DDR4 · Micro-ATX", socket: "LGA1700", memory: "DDR4", form: "mATX", slots: 4 },
  { id: "z790", name: "Z790 · ATX", socket: "LGA1700", memory: "DDR5", form: "ATX", slots: 4 },
];

export const RAMS: Ram[] = [
  { id: "d4-16", name: "16 GB DDR4-3200 (2 × 8 GB)", type: "DDR4", sticks: 2 },
  { id: "d4-32", name: "32 GB DDR4-3600 (2 × 16 GB)", type: "DDR4", sticks: 2 },
  { id: "d5-32", name: "32 GB DDR5-6000 (2 × 16 GB)", type: "DDR5", sticks: 2 },
  { id: "d5-64", name: "64 GB DDR5-5600 (4 × 16 GB)", type: "DDR5", sticks: 4 },
];

export const GPUS: Gpu[] = [
  { id: "none", name: "None (use the CPU's graphics)", length: 0, watts: 0 },
  { id: "rtx4060", name: "GeForce RTX 4060 · dual fan", length: 240, watts: 115 },
  { id: "rx7800xt", name: "Radeon RX 7800 XT · triple fan", length: 300, watts: 263 },
  { id: "rtx4070s", name: "GeForce RTX 4070 SUPER · triple fan", length: 305, watts: 220 },
  { id: "rtx4090", name: "GeForce RTX 4090 · triple fan", length: 336, watts: 450 },
];

export const CASES: Case[] = [
  { id: "mid", name: "Mid tower (ATX)", boards: ["ATX", "mATX", "ITX"], gpuClearance: 360, psu: ["ATX", "SFX"] },
  { id: "matx", name: "Compact tower (Micro-ATX)", boards: ["mATX", "ITX"], gpuClearance: 310, psu: ["ATX", "SFX"] },
  { id: "sff", name: "Small form factor (Mini-ITX)", boards: ["ITX"], gpuClearance: 285, psu: ["SFX"] },
];

export const PSUS: Psu[] = [
  { id: "550", name: "550 W · ATX", watts: 550, size: "ATX" },
  { id: "650", name: "650 W · ATX", watts: 650, size: "ATX" },
  { id: "750", name: "750 W · ATX", watts: 750, size: "ATX" },
  { id: "1000", name: "1000 W · ATX", watts: 1000, size: "ATX" },
  { id: "750sfx", name: "750 W · SFX", watts: 750, size: "SFX" },
];

export interface Build {
  cpu: string;
  board: string;
  ram: string;
  gpu: string;
  case: string;
  psu: string;
}

export const DEFAULT_BUILD: Build = { cpu: "r5-7600", board: "b650", ram: "d5-32", gpu: "rtx4060", case: "mid", psu: "650" };

/** Board, memory, drives and fans, on top of the CPU and graphics card. */
export const BASE_WATTS = 60;
/** Aim to load the power supply no more than this, leaving room for spikes and ageing. */
export const COMFORT = 0.7;

export type Level = "ok" | "warn" | "fail";
export interface Check {
  id: "socket" | "memory" | "slots" | "board-fit" | "gpu-fit" | "psu-fit" | "power" | "graphics";
  level: Level;
  title: string;
  detail: string;
}

export interface Report {
  checks: Check[];
  draw: number;
  /** Smallest PSU that keeps the draw at or under the comfort line, rounded up to 50 W. */
  recommended: number;
  /** Draw as a share of the chosen PSU. */
  load: number;
  verdict: Level;
}

const by = <T extends { id: string }>(list: T[], id: string) => list.find((x) => x.id === id) ?? list[0];

/** Runs every rule against a build. Order matches how you'd assemble it. */
export function check(build: Build): Report {
  const cpu = by(CPUS, build.cpu);
  const board = by(BOARDS, build.board);
  const ram = by(RAMS, build.ram);
  const gpu = by(GPUS, build.gpu);
  const box = by(CASES, build.case);
  const psu = by(PSUS, build.psu);
  const checks: Check[] = [];
  const add = (id: Check["id"], level: Level, title: string, detail: string) => checks.push({ id, level, title, detail });

  add(
    "socket",
    cpu.socket === board.socket ? "ok" : "fail",
    cpu.socket === board.socket ? `CPU fits the board (${cpu.socket})` : "CPU and board sockets differ",
    cpu.socket === board.socket
      ? `Both use ${cpu.socket}.`
      : `The ${cpu.name} needs an ${cpu.socket} board; the ${board.name.split(" · ")[0]} is ${board.socket}. The pins physically won't line up.`,
  );

  const memOk = ram.type === board.memory && cpu.memory.includes(ram.type);
  add(
    "memory",
    memOk ? "ok" : "fail",
    memOk ? `${ram.type} memory matches` : "Wrong memory type",
    memOk
      ? `The board has ${board.memory} slots and the CPU supports ${ram.type}.`
      : ram.type !== board.memory
        ? `The board takes ${board.memory}; this kit is ${ram.type}. DDR4 and DDR5 are notched differently and won't seat.`
        : `The board takes ${board.memory}, but the ${cpu.name} only supports ${cpu.memory.join(" or ")}.`,
  );

  add(
    "slots",
    ram.sticks <= board.slots ? "ok" : "fail",
    ram.sticks <= board.slots ? `${ram.sticks} of ${board.slots} memory slots used` : "Not enough memory slots",
    ram.sticks <= board.slots ? "Room for every stick in the kit." : `The kit has ${ram.sticks} sticks; the board has only ${board.slots} slots.`,
  );

  const boardFits = box.boards.includes(board.form);
  add(
    "board-fit",
    boardFits ? "ok" : "fail",
    boardFits ? `${board.form === "mATX" ? "Micro-ATX" : board.form === "ITX" ? "Mini-ITX" : "ATX"} board fits the case` : "Board too big for the case",
    boardFits ? `The case has mounts for ${box.boards.join(", ")}.` : `The case only takes ${box.boards.join(" or ")} boards.`,
  );

  if (gpu.length > 0) {
    const spare = box.gpuClearance - gpu.length;
    add(
      "gpu-fit",
      spare < 0 ? "fail" : spare < 15 ? "warn" : "ok",
      spare < 0 ? "Graphics card too long" : spare < 15 ? "Graphics card fits, barely" : "Graphics card fits",
      spare < 0
        ? `The card is about ${gpu.length} mm; the case clears ${box.gpuClearance} mm. ${-spare} mm short.`
        : `About ${gpu.length} mm in a ${box.gpuClearance} mm space: ${spare} mm to spare${spare < 15 ? ", so front fans or cables may get in the way" : ""}.`,
    );
  } else {
    add(
      "graphics",
      cpu.igpu ? "ok" : "fail",
      cpu.igpu ? "Display from the CPU's graphics" : "No graphics at all",
      cpu.igpu ? "Fine for desktop work; add a card for games." : `The ${cpu.name} has no built-in graphics, so it needs a graphics card to show a picture.`,
    );
  }

  const psuFits = box.psu.includes(psu.size);
  add(
    "psu-fit",
    psuFits ? "ok" : "fail",
    psuFits ? `${psu.size} power supply fits` : "Power supply won't fit",
    psuFits ? (psu.size === "SFX" && box.psu.includes("ATX") ? "SFX units fit ATX cases with an adapter bracket." : `The case takes ${psu.size} units.`) : `This case only takes ${box.psu.join(" or ")} units.`,
  );

  const draw = cpu.watts + gpu.watts + BASE_WATTS;
  const load = draw / psu.watts;
  const recommended = Math.ceil(draw / COMFORT / 50) * 50;
  add(
    "power",
    load <= COMFORT ? "ok" : load <= 0.9 ? "warn" : "fail",
    load <= COMFORT ? "Power with headroom" : load <= 0.9 ? "Power is tight" : "Power supply too small",
    `About ${draw} W under load is ${Math.round(load * 100)}% of ${psu.watts} W. ${load <= COMFORT ? "Comfortable." : `Aim for ${recommended} W or more so it isn't running near its limit.`}`,
  );

  const verdict: Level = checks.some((c) => c.level === "fail") ? "fail" : checks.some((c) => c.level === "warn") ? "warn" : "ok";
  return { checks, draw, recommended, load, verdict };
}
