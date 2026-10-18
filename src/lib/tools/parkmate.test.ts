// Run: npx tsx --tsconfig tsconfig.json src/lib/tools/parkmate.test.ts
import assert from "node:assert/strict";
import { RATES, SLOTS, checkout, clock, duration, editPlate, emptyLot, fee, freeSlots, normalisePlate, open, park, remove, sampleLot, showPlate, type Lot } from "./parkmate";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`ok - ${name}`);
};
const parked = (lot: Lot, plate: string, type: "car" | "motorcycle", at = 480) => {
  const r = park(lot, plate, type, at);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r;
};

test("plates normalise and validate", () => {
  assert.deepEqual(normalisePlate("abc-1234"), { plate: "ABC1234" });
  assert.deepEqual(normalisePlate(" 128 klm "), { plate: "128KLM" });
  for (const bad of ["", "AB1", "ABCDEFGHI1", "ABCDEF", "123456", "AB#123"]) assert.ok("error" in normalisePlate(bad), bad);
  assert.equal(showPlate("ABC1234"), "ABC 1234");
  assert.equal(showPlate("128KLM"), "128 KLM");
});

test("allocation takes the nearest free slot of the right type", () => {
  let lot = emptyLot();
  const a = parked(lot, "AAA 1111", "car");
  assert.equal(a.ticket.slot, "C1");
  lot = a.lot;
  const b = parked(lot, "BBB 2222", "car");
  assert.equal(b.ticket.slot, "C2");
  lot = b.lot;
  const m = parked(lot, "123 ABC", "motorcycle");
  assert.equal(m.ticket.slot, "M1");
  lot = m.lot;
  // Free C1, and the next car takes it again (nearest to the entrance).
  lot = (checkout(lot, a.ticket.no, 600) as { lot: Lot }).lot;
  assert.equal(parked(lot, "CCC 3333", "car").ticket.slot, "C1");
});

test("a plate already inside can't be logged twice, and a full lot says so", () => {
  let lot = parked(emptyLot(), "NBC 1452", "car").lot;
  const dupe = park(lot, "nbc-1452", "car", 500);
  assert.ok(!dupe.ok && /already parked in C1/.test(dupe.error));
  const motos = SLOTS.filter((s) => s.type === "motorcycle").length;
  for (let i = 0; i < motos; i++) lot = parked(lot, `${100 + i} MC`, "motorcycle").lot;
  assert.equal(freeSlots(lot, "motorcycle").length, 0);
  const full = park(lot, "999 ZZZ", "motorcycle", 500);
  assert.ok(!full.ok && /full/.test(full.error));
  assert.ok(park(lot, "XYZ 7777", "car", 500).ok, "cars still have room");
});

test("fees: grace period, first block, per extra hour or part of one", () => {
  const car = RATES.car;
  assert.equal(fee("car", 0).total, 0);
  assert.equal(fee("car", 15).total, 0);
  assert.equal(fee("car", 16).total, car.first);
  assert.equal(fee("car", 180).total, car.first);
  assert.equal(fee("car", 181).total, car.first + car.perHour);
  assert.equal(fee("car", 240).total, car.first + car.perHour);
  assert.equal(fee("car", 241).total, car.first + 2 * car.perHour);
  assert.equal(fee("motorcycle", 300).total, RATES.motorcycle.first + 2 * RATES.motorcycle.perHour);
});

test("fees: capped per 24 hours, and the lines add up to the total", () => {
  const car = RATES.car;
  assert.equal(fee("car", 23 * 60).total, car.dailyCap);
  assert.equal(fee("car", 24 * 60).total, car.dailyCap);
  assert.equal(fee("car", 24 * 60 + 60).total, car.dailyCap + car.first);
  for (const m of [16, 200, 700, 1439, 1500, 4000]) {
    for (const t of ["car", "motorcycle"] as const) {
      const f = fee(t, m);
      assert.equal(f.lines.reduce((s, l) => s + l.amount, 0), f.total, `${t} ${m}`);
      assert.ok(f.total <= Math.ceil(m / 1440) * RATES[t].dailyCap, `${t} ${m} under the cap`);
    }
  }
});

test("checkout closes the ticket, frees the slot and keeps the record", () => {
  const p = parked(emptyLot(), "DAJ 8820", "car", 7 * 60 + 40);
  const r = checkout(p.lot, p.ticket.no, 12 * 60 + 5); // 4 h 25 min
  assert.ok(r.ok);
  assert.equal(r.receipt.minutes, 265);
  assert.equal(r.receipt.total, RATES.car.first + 2 * RATES.car.perHour);
  assert.equal(open(r.lot).length, 0);
  assert.equal(r.lot.tickets[0].fee, r.receipt.total);
  assert.ok(!checkout(r.lot, p.ticket.no, 800).ok, "can't check out twice");
  assert.ok(!checkout(p.lot, p.ticket.no, 100).ok, "time out before time in");
});

test("update and delete only touch open entries", () => {
  const p = parked(parked(emptyLot(), "AAA 1111", "car").lot, "BBB 2222", "car");
  const fixed = editPlate(p.lot, p.ticket.no, "bbb 2223");
  assert.ok(fixed.ok && fixed.ticket.plate === "BBB2223" && fixed.ticket.slot === "C2");
  assert.ok(!editPlate(p.lot, p.ticket.no, "AAA 1111").ok, "can't rename to a car that's inside");
  const gone = remove(p.lot, p.ticket.no);
  assert.ok(gone.ok && gone.lot.tickets.length === 1);
  const closed = checkout(p.lot, p.ticket.no, 600);
  assert.ok(closed.ok);
  assert.ok(!remove(closed.lot, p.ticket.no).ok, "paid tickets stay as records");
  assert.ok(!editPlate(closed.lot, p.ticket.no, "ZZZ 9999").ok);
});

test("clock and duration read naturally", () => {
  assert.equal(clock(485), "08:05");
  assert.equal(clock(1440 + 75), "Day 2, 01:15");
  assert.equal(duration(45), "45 min");
  assert.equal(duration(265), "4 h 25 min");
  assert.equal(open(sampleLot()).length, 3);
});

console.log(`\n${passed} parkmate tests passed`);
