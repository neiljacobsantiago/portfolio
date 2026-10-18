// A pocket ledger inspired by BankoSantiago (ACCT 1001): balances, transfers
// and a running transaction log. The accounts, names and limits are made up
// for the demo. Money is kept in whole centavos so ₱0.10 + ₱0.20 is exactly
// ₱0.30, and every transfer is written twice — out of one account, into the
// other — under one reference, so the books always balance.

export type AccountId = "everyday" | "savings" | "tuition";

export interface Account {
  id: AccountId;
  name: string;
  number: string;
  /** Centavos. */
  balance: number;
}

export type Kind = "deposit" | "withdraw" | "transfer";

export interface Entry {
  ref: string;
  account: AccountId;
  kind: Kind;
  /** Signed centavos: positive money in, negative money out. */
  amount: number;
  /** Balance of `account` right after this line. */
  balance: number;
  memo: string;
  /** For transfers, the other side. */
  counterpart?: AccountId;
}

export interface Bank {
  accounts: Account[];
  ledger: Entry[];
  /** Next reference number. */
  seq: number;
  /** Opening total, for the reconciliation check. */
  opening: number;
}

export type Op =
  | { kind: "deposit"; to: AccountId; amount: string; memo?: string }
  | { kind: "withdraw"; from: AccountId; amount: string; memo?: string }
  | { kind: "transfer"; from: AccountId; to: AccountId; amount: string; memo?: string };

export type Result = { ok: true; bank: Bank; ref: string } | { ok: false; error: string; field: "amount" | "from" | "to" };

/** Demo rule: no single transaction above ₱100,000. */
export const LIMIT = 100_000_00;

export const ACCOUNT_NAMES: Record<AccountId, string> = { everyday: "Everyday", savings: "Savings", tuition: "Tuition fund" };

export function openBank(): Bank {
  const accounts: Account[] = [
    { id: "everyday", name: ACCOUNT_NAMES.everyday, number: "0142-3381-07", balance: 12_480_50 },
    { id: "savings", name: ACCOUNT_NAMES.savings, number: "0142-3381-15", balance: 48_000_00 },
    { id: "tuition", name: ACCOUNT_NAMES.tuition, number: "0142-3381-23", balance: 6_500_00 },
  ];
  return { accounts, ledger: [], seq: 1, opening: total(accounts) };
}

export const total = (accounts: Account[]) => accounts.reduce((s, a) => s + a.balance, 0);

/** "₱1,250.50" from 125050 centavos; negatives get a leading minus. */
export function peso(centavos: number): string {
  const sign = centavos < 0 ? "−" : "";
  const abs = Math.abs(Math.round(centavos));
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}₱${whole}.${String(abs % 100).padStart(2, "0")}`;
}

/**
 * Reads what someone typed ("1,250.5", "₱300", " 20 ") into centavos.
 * Returns an error message instead when it isn't a usable amount.
 */
export function parseAmount(text: string): { centavos: number } | { error: string } {
  const clean = text.replace(/[₱,\s]/g, "").replace(/^php/i, "");
  if (!clean) return { error: "Enter an amount." };
  if (!/^\d+(\.\d{1,2})?$/.test(clean) && !/^\.\d{1,2}$/.test(clean)) {
    return /^\d*\.\d{3,}$/.test(clean) ? { error: "Pesos only go to two decimal places (centavos)." } : { error: "That isn't an amount. Use digits, like 1,250.50." };
  }
  const [w, f = ""] = clean.split(".");
  const centavos = Number(w || "0") * 100 + Number(f.padEnd(2, "0"));
  if (centavos <= 0) return { error: "The amount has to be more than ₱0.00." };
  if (centavos > LIMIT) return { error: `This demo caps a single transaction at ${peso(LIMIT)}.` };
  return { centavos };
}

const fail = (error: string, field: "amount" | "from" | "to" = "amount"): Result => ({ ok: false, error, field });

/** Applies one operation. Never mutates `bank`; on failure nothing changes. */
export function apply(bank: Bank, op: Op): Result {
  const parsed = parseAmount(op.amount);
  if ("error" in parsed) return fail(parsed.error);
  const amt = parsed.centavos;
  const find = (id: AccountId) => bank.accounts.find((a) => a.id === id);
  const ref = `BS-${String(bank.seq).padStart(5, "0")}`;
  const memo = (op.memo ?? "").trim().slice(0, 40);

  const debit = op.kind === "deposit" ? null : find(op.from);
  const credit = op.kind === "withdraw" ? null : find(op.to);
  if (op.kind !== "deposit" && !debit) return fail("Pick the account the money leaves from.", "from");
  if (op.kind !== "withdraw" && !credit) return fail("Pick the account the money goes to.", "to");
  if (op.kind === "transfer" && debit!.id === credit!.id) return fail("Moving money into the same account changes nothing. Pick a different one.", "to");
  if (debit && amt > debit.balance) return fail(`${debit.name} only has ${peso(debit.balance)} available.`);

  const balances = new Map(bank.accounts.map((a) => [a.id, a.balance]));
  const lines: Entry[] = [];
  const post = (account: AccountId, signed: number, counterpart?: AccountId) => {
    const next = balances.get(account)! + signed;
    balances.set(account, next);
    const label = op.kind === "deposit" ? "Cash deposit" : op.kind === "withdraw" ? "Cash withdrawal" : signed < 0 ? `To ${ACCOUNT_NAMES[counterpart!]}` : `From ${ACCOUNT_NAMES[counterpart!]}`;
    lines.push({ ref, account, kind: op.kind, amount: signed, balance: next, memo: memo || label, counterpart });
  };
  if (debit) post(debit.id, -amt, credit?.id);
  if (credit) post(credit.id, amt, debit?.id);

  return {
    ok: true,
    ref,
    bank: {
      ...bank,
      seq: bank.seq + 1,
      accounts: bank.accounts.map((a) => ({ ...a, balance: balances.get(a.id)! })),
      // Newest first, the way a statement on a phone reads.
      ledger: [...lines.reverse(), ...bank.ledger],
    },
  };
}

/** A bank with a little history, so the ledger isn't empty on first look. */
export function sampleBank(): Bank {
  let bank = openBank();
  const ops: Op[] = [
    { kind: "deposit", to: "everyday", amount: "2,500", memo: "Allowance" },
    { kind: "transfer", from: "everyday", to: "tuition", amount: "1,850", memo: "Lab fee" },
    { kind: "withdraw", from: "everyday", amount: "600", memo: "Jeepney and lunch" },
  ];
  for (const op of ops) {
    const r = apply(bank, op);
    if (r.ok) bank = r.bank;
  }
  return bank;
}

/**
 * The reconciliation an accountant would run: opening total plus deposits
 * minus withdrawals must equal what the accounts hold now, and the two legs
 * of every transfer must cancel out.
 */
export function reconcile(bank: Bank) {
  const sum = (k: Kind) => bank.ledger.filter((e) => e.kind === k).reduce((s, e) => s + e.amount, 0);
  const deposits = sum("deposit");
  const withdrawals = -sum("withdraw");
  const transfersNet = sum("transfer");
  const expected = bank.opening + deposits - withdrawals;
  const actual = total(bank.accounts);
  return { deposits, withdrawals, transfersNet, expected, actual, balanced: expected === actual && transfersNet === 0 };
}
