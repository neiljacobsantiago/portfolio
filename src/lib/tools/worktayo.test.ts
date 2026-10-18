// Run: npx tsx --tsconfig tsconfig.json src/lib/tools/worktayo.test.ts
import assert from "node:assert/strict";
import { board, checkIn, find, register, seatsTaken, seedDesk, time, undo, type Desk } from "./worktayo";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`ok - ${name}`);
};
const stat = (d: Desk, id: string) => board(d).find((s) => s.session.id === id)!;

test("seed data is consistent", () => {
  const d = seedDesk();
  assert.equal(d.participants.length, 10);
  assert.equal(new Set(d.participants.map((p) => p.email)).size, 10);
  assert.equal(seatsTaken(d, "ws-a"), 5);
  assert.equal(seatsTaken(d, "ws-b"), 4);
  assert.deepEqual([stat(d, "plenary").present, stat(d, "plenary").expected], [6, 10]);
});

test("find accepts codes in any shape, or a unique name", () => {
  const d = seedDesk();
  for (const q of ["WT-0007", "wt7", "wt-07", "7", " 0007 "]) {
    const r = find(d, q);
    assert.ok("participant" in r && r.participant.name === "Hannah Ocampo", q);
  }
  const byName = find(d, "tolentino");
  assert.ok("participant" in byName && byName.participant.code === "WT-0008");
  assert.ok("error" in find(d, "WT-0099"));
  assert.ok("error" in find(d, "an"), "ambiguous names ask for a code");
  assert.ok("error" in find(d, ""));
});

test("check-in adds one attendance row and moves the desk clock", () => {
  const d = seedDesk();
  const r = checkIn(d, "WT-0002", "plenary");
  assert.ok(r.ok);
  assert.equal(r.desk.attendance.length, d.attendance.length + 1);
  assert.equal(r.desk.attendance.at(-1)!.at, d.clock);
  assert.equal(r.desk.clock, d.clock + 2);
  assert.equal(stat(r.desk, "plenary").present, 7);
  assert.equal(d.attendance.length, 6, "original untouched");
});

test("no duplicate check-ins, and workshops only take people registered for them", () => {
  const d = seedDesk();
  const twice = checkIn(d, "WT-0001", "plenary");
  assert.ok(!twice.ok && /already checked in at 08:12/.test(twice.error));
  const notRegistered = checkIn(d, "WT-0002", "ws-a"); // Joshua is in Workshop B
  assert.ok(!notRegistered.ok && /isn't registered for Workshop A/.test(notRegistered.error));
  assert.ok(checkIn(d, "WT-0002", "ws-b").ok);
  assert.ok(checkIn(d, "WT-0006", "closing").ok, "open sessions take everyone");
});

test("undo removes only that row", () => {
  const d = seedDesk();
  const u = undo(d, 1, "plenary");
  assert.equal(u.attendance.length, 5);
  assert.ok(checkIn(u, "WT-0001", "plenary").ok, "can check in again after an undo");
});

test("walk-in registration validates and enforces unique email and workshop capacity", () => {
  const d = seedDesk();
  const base = { name: "Juan Dela Cruz", email: "Juan@Example.com", affiliation: "", workshop: null };
  const r = register(d, base);
  assert.ok(r.ok);
  assert.equal(r.participant.code, "WT-0011");
  assert.equal(r.participant.email, "juan@example.com");
  assert.equal(r.participant.affiliation, "Walk-in");
  const dupe = register(r.desk, { ...base, name: "Someone Else", email: "JUAN@example.com" });
  assert.ok(!dupe.ok && /already registered/.test(dupe.error));
  assert.ok(!register(d, { ...base, name: "J" }).ok);
  assert.ok(!register(d, { ...base, email: "juan@" }).ok);
  assert.ok(!register(d, { ...base, workshop: "plenary" }).ok, "plenary isn't a workshop");

  // Workshop A has one seat left.
  const first = register(d, { ...base, workshop: "ws-a" });
  assert.ok(first.ok && seatsTaken(first.desk, "ws-a") === 6);
  const full = register(first.desk, { ...base, email: "another@example.com", workshop: "ws-a" });
  assert.ok(!full.ok && /full/.test(full.error));
  assert.ok(register(first.desk, { ...base, email: "another@example.com", workshop: "ws-b" }).ok);
});

test("the board counts expected, present and missing per session", () => {
  let d = seedDesk();
  const ws = stat(d, "ws-a");
  assert.deepEqual([ws.expected, ws.present, ws.missing.length], [5, 0, 5]);
  for (const code of ["WT-0001", "WT-0003"]) {
    const r = checkIn(d, code, "ws-a");
    assert.ok(r.ok);
    d = r.desk;
  }
  const after = stat(d, "ws-a");
  assert.equal(after.present, 2);
  assert.equal(after.rate, 2 / 5);
  assert.ok(!after.missing.some((p) => p.code === "WT-0001"));
  assert.equal(time(8 * 60 + 5), "08:05");
});

console.log(`\n${passed} worktayo tests passed`);
