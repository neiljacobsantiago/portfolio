// A lot attendant's desk inspired by ParkMate, the Java Swing + MySQL app that
// replaced a parking lot's paper logbook: log a vehicle in, give it a slot,
// fix or delete a wrong entry, and check it out. The rates below are made up
// for the demo (ParkMate's own were set by the lot), but they work the way
// parking rates usually do: a grace period, a first block, then per hour.

export type Vehicle = "car" | "motorcycle";

export interface Slot {
  id: string;
  type: Vehicle;
}

/** Closest to the entrance first; allocation always takes the lowest free number. */
export const SLOTS: Slot[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: `C${i + 1}`, type: "car" as const })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `M${i + 1}`, type: "motorcycle" as const })),
];

export interface Rate {
  /** Minutes free at the start (drop-offs, wrong turns). */
  grace: number;
  /** First block: this many hours for `first` pesos. */
  firstHours: number;
  first: number;
  /** Every hour (or part of one) after the first block. */
  perHour: number;
  /** Most you pay for any 24 hours. */
  dailyCap: number;
}

export const RATES: Record<Vehicle, Rate> = {
  car: { grace: 15, firstHours: 3, first: 50, perHour: 20, dailyCap: 300 },
  motorcycle: { grace: 15, firstHours: 3, first: 20, perHour: 10, dailyCap: 120 },
};

export interface Ticket {
  no: number;
  plate: string;
  type: Vehicle;
  slot: string;
  /** Minutes since midnight of day 1. */
  inAt: number;
  outAt?: number;
  fee?: number;
}

export interface Lot {
  tickets: Ticket[];
  next: number;
}

export const emptyLot = (): Lot => ({ tickets: [], next: 1 });

/** Plates are stored without spaces in capitals; "abc-1234" and "ABC 1234" are the same car. */
export function normalisePlate(text: string): { plate: string } | { error: string } {
  const plate = text.toUpperCase().replace(/[\s-]/g, "");
  if (!plate) return { error: "Enter the plate number." };
  if (!/^[A-Z0-9]{5,8}$/.test(plate)) return { error: "Plates are 5 to 8 letters and numbers, like ABC 1234." };
  if (!/[A-Z]/.test(plate) || !/\d/.test(plate)) return { error: "A plate has both letters and numbers." };
  return { plate };
}

/** "ABC1234" → "ABC 1234": a space wherever letters meet numbers. */
export const showPlate = (plate: string) => plate.replace(/([A-Z])(?=\d)|(\d)(?=[A-Z])/g, "$1$2 ");

export const open = (lot: Lot) => lot.tickets.filter((t) => t.outAt === undefined);
export const freeSlots = (lot: Lot, type: Vehicle) => SLOTS.filter((s) => s.type === type && !open(lot).some((t) => t.slot === s.id));

type Done = { ok: true; lot: Lot; ticket: Ticket } | { ok: false; error: string };

export function park(lot: Lot, plateText: string, type: Vehicle, now: number): Done {
  const p = normalisePlate(plateText);
  if ("error" in p) return { ok: false, error: p.error };
  const inside = open(lot).find((t) => t.plate === p.plate);
  if (inside) return { ok: false, error: `${showPlate(p.plate)} is already parked in ${inside.slot}. Check it out first.` };
  const slot = freeSlots(lot, type)[0];
  if (!slot) return { ok: false, error: `No ${type === "car" ? "car" : "motorcycle"} slots left. The lot is full for that vehicle type.` };
  const ticket: Ticket = { no: lot.next, plate: p.plate, type, slot: slot.id, inAt: now };
  return { ok: true, ticket, lot: { tickets: [...lot.tickets, ticket], next: lot.next + 1 } };
}

/** Update: correct a plate typed wrong at the gate. The slot and time in stay. */
export function editPlate(lot: Lot, no: number, plateText: string): Done {
  const t = lot.tickets.find((x) => x.no === no);
  if (!t || t.outAt !== undefined) return { ok: false, error: "Only vehicles still inside can be edited." };
  const p = normalisePlate(plateText);
  if ("error" in p) return { ok: false, error: p.error };
  if (open(lot).some((x) => x.plate === p.plate && x.no !== no)) return { ok: false, error: `${showPlate(p.plate)} is already inside.` };
  const ticket = { ...t, plate: p.plate };
  return { ok: true, ticket, lot: { ...lot, tickets: lot.tickets.map((x) => (x.no === no ? ticket : x)) } };
}

/** Delete: remove an entry logged by mistake. Closed tickets are records and stay. */
export function remove(lot: Lot, no: number): Done {
  const t = lot.tickets.find((x) => x.no === no);
  if (!t || t.outAt !== undefined) return { ok: false, error: "Only open entries can be deleted; paid tickets are kept as records." };
  return { ok: true, ticket: t, lot: { ...lot, tickets: lot.tickets.filter((x) => x.no !== no) } };
}

export interface Line {
  label: string;
  amount: number;
}

/** The fee for a stay, with each charge spelled out the way a receipt would. */
export function fee(type: Vehicle, minutes: number): { total: number; lines: Line[] } {
  const r = RATES[type];
  const mins = Math.max(0, Math.round(minutes));
  if (mins <= r.grace) return { total: 0, lines: [{ label: `Grace period (${r.grace} min or less)`, amount: 0 }] };
  const lines: Line[] = [];
  const days = Math.floor(mins / 1440);
  const rest = mins % 1440;
  if (days) lines.push({ label: `${days} full day${days > 1 ? "s" : ""} at the daily cap`, amount: days * r.dailyCap });
  if (rest > 0) {
    const extraHours = Math.max(0, Math.ceil((rest - r.firstHours * 60) / 60));
    const uncapped = r.first + extraHours * r.perHour;
    lines.push({ label: `First ${r.firstHours} hours`, amount: r.first });
    if (extraHours) lines.push({ label: `${extraHours} more hour${extraHours > 1 ? "s" : ""} × ₱${r.perHour}`, amount: extraHours * r.perHour });
    if (uncapped > r.dailyCap) lines.push({ label: `Capped at ₱${r.dailyCap} for the day`, amount: r.dailyCap - uncapped });
  }
  return { total: lines.reduce((s, l) => s + l.amount, 0), lines };
}

export interface Receipt {
  ticket: Ticket;
  minutes: number;
  lines: Line[];
  total: number;
}

export function checkout(lot: Lot, no: number, now: number): { ok: true; lot: Lot; receipt: Receipt } | { ok: false; error: string } {
  const t = lot.tickets.find((x) => x.no === no);
  if (!t || t.outAt !== undefined) return { ok: false, error: "That vehicle isn't inside." };
  if (now < t.inAt) return { ok: false, error: "Time out can't be before time in." };
  const minutes = now - t.inAt;
  const f = fee(t.type, minutes);
  const ticket = { ...t, outAt: now, fee: f.total };
  return { ok: true, lot: { ...lot, tickets: lot.tickets.map((x) => (x.no === no ? ticket : x)) }, receipt: { ticket, minutes, lines: f.lines, total: f.total } };
}

/** 485 → "08:05"; past midnight it says which day. */
export function clock(minutes: number): string {
  const day = Math.floor(minutes / 1440) + 1;
  const m = minutes % 1440;
  const hhmm = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return day > 1 ? `Day ${day}, ${hhmm}` : hhmm;
}

export const duration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
};

/** A morning already under way, so the lot isn't empty on first look. */
export function sampleLot(): Lot {
  let lot = emptyLot();
  for (const [plate, type, at] of [
    ["NBC 1452", "car", 7 * 60 + 12],
    ["DAJ 8820", "car", 7 * 60 + 40],
    ["128 KLM", "motorcycle", 7 * 60 + 55],
  ] as const) {
    const r = park(lot, plate, type, at);
    if (r.ok) lot = r.lot;
  }
  return lot;
}

export const START = 9 * 60;
