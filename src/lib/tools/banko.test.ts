// Run: npx tsx --tsconfig tsconfig.json src/lib/tools/banko.test.ts
import assert from "node:assert/strict";
import { LIMIT, apply, openBank, parseAmount, peso, reconcile, sampleBank, total, type Bank } from "./banko";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`ok - ${name}`);
};
const ok = (r: ReturnType<typeof apply>): Bank => {
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.bank;
};
const bal = (b: Bank, id: string) => b.accounts.find((a) => a.id === id)!.balance;

test("peso formats centavos with grouping and two decimals", () => {
  assert.equal(peso(0), "₱0.00");
  assert.equal(peso(5), "₱0.05");
  assert.equal(peso(125050), "₱1,250.50");
  assert.equal(peso(100_000_00), "₱100,000.00");
  assert.equal(peso(-2500), "−₱25.00");
});

test("parseAmount reads what people type and rejects the rest", () => {
  assert.deepEqual(parseAmount("1,250.5"), { centavos: 125050 });
  assert.deepEqual(parseAmount("₱300"), { centavos: 30000 });
  assert.deepEqual(parseAmount(" 0.10 "), { centavos: 10 });
  assert.deepEqual(parseAmount(".5"), { centavos: 50 });
  for (const bad of ["", "abc", "0", "0.00", "-5", "10.555", "1e3"]) assert.ok("error" in parseAmount(bad), bad);
  assert.match((parseAmount("10.555") as { error: string }).error, /two decimal/);
  assert.ok("error" in parseAmount(String(LIMIT / 100 + 1)));
  assert.deepEqual(parseAmount(String(LIMIT / 100)), { centavos: LIMIT });
});

test("centavo maths is exact (no floating point drift)", () => {
  let b = openBank();
  for (const a of ["0.10", "0.20"]) b = ok(apply(b, { kind: "deposit", to: "everyday", amount: a }));
  assert.equal(bal(b, "everyday"), 12_480_50 + 30);
});

test("deposit, withdraw and transfer move the right balances", () => {
  let b = openBank();
  b = ok(apply(b, { kind: "deposit", to: "tuition", amount: "1000" }));
  assert.equal(bal(b, "tuition"), 7_500_00);
  b = ok(apply(b, { kind: "withdraw", from: "everyday", amount: "480.50" }));
  assert.equal(bal(b, "everyday"), 12_000_00);
  b = ok(apply(b, { kind: "transfer", from: "savings", to: "everyday", amount: "8,000" }));
  assert.equal(bal(b, "savings"), 40_000_00);
  assert.equal(bal(b, "everyday"), 20_000_00);
});

test("a transfer writes two ledger lines under one reference, newest first", () => {
  const b = ok(apply(openBank(), { kind: "transfer", from: "savings", to: "tuition", amount: "500", memo: "Books" }));
  assert.equal(b.ledger.length, 2);
  assert.equal(b.ledger[0].ref, b.ledger[1].ref);
  assert.equal(b.ledger[0].ref, "BS-00001");
  assert.deepEqual(
    b.ledger.map((e) => [e.account, e.amount, e.counterpart]),
    [
      ["tuition", 50000, "savings"],
      ["savings", -50000, "tuition"],
    ],
  );
  assert.equal(b.ledger[0].balance, 7_000_00, "running balance after the line");
  assert.equal(b.ledger[0].memo, "Books");
  const next = ok(apply(b, { kind: "deposit", to: "savings", amount: "1" }));
  assert.equal(next.ledger[0].ref, "BS-00002");
});

test("validation refuses overdrafts, same-account transfers and bad amounts without changing anything", () => {
  const b = openBank();
  const over = apply(b, { kind: "withdraw", from: "tuition", amount: "6500.01" });
  assert.ok(!over.ok && /only has ₱6,500.00/.test(over.error));
  const same = apply(b, { kind: "transfer", from: "savings", to: "savings", amount: "10" });
  assert.ok(!same.ok && same.field === "to");
  const bad = apply(b, { kind: "deposit", to: "savings", amount: "ten" });
  assert.ok(!bad.ok && bad.field === "amount");
  assert.deepEqual(b, openBank(), "original untouched");
  // Exactly the balance is fine.
  assert.equal(bal(ok(apply(b, { kind: "withdraw", from: "tuition", amount: "6500" })), "tuition"), 0);
});

test("the books reconcile after any mix of operations", () => {
  let b = sampleBank();
  assert.equal(b.ledger.length, 4);
  for (const op of [
    { kind: "transfer", from: "savings", to: "everyday", amount: "3,333.33" },
    { kind: "deposit", to: "tuition", amount: "0.01" },
    { kind: "withdraw", from: "savings", amount: "9,999.99" },
    { kind: "transfer", from: "everyday", to: "tuition", amount: "1,234.56" },
  ] as const) b = ok(apply(b, op));
  const r = reconcile(b);
  assert.ok(r.balanced);
  assert.equal(r.transfersNet, 0);
  assert.equal(r.actual, total(b.accounts));
  assert.equal(r.expected, b.opening + r.deposits - r.withdrawals);
});

console.log(`\n${passed} banko tests passed`);
