"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";
import { ACCOUNT_NAMES, apply, peso, reconcile, sampleBank, type AccountId, type Bank, type Kind } from "@/lib/tools/banko";
import { cn } from "@/lib/utils";
import { Field, Note, Segmented, input } from "./ui";

const KINDS: { value: Kind; label: string }[] = [
  { value: "transfer", label: "Transfer" },
  { value: "deposit", label: "Deposit" },
  { value: "withdraw", label: "Withdraw" },
];
const QUICK = ["500", "1,000", "5,000"];

/** A pocket version of BankoSantiago's dashboard: balances, transfers and a ledger that must reconcile. */
export default function BankoTool({ compact }: { compact?: boolean }) {
  const [bank, setBank] = useState<Bank>(sampleBank);
  const [kind, setKind] = useState<Kind>("transfer");
  const [from, setFrom] = useState<AccountId>("savings");
  const [to, setTo] = useState<AccountId>("everyday");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const rec = reconcile(bank);

  const submit = () => {
    const r =
      kind === "deposit"
        ? apply(bank, { kind, to, amount, memo })
        : kind === "withdraw"
          ? apply(bank, { kind, from, amount, memo })
          : apply(bank, { kind, from, to, amount, memo });
    if (!r.ok) {
      haptic(20);
      setMsg({ ok: false, text: r.error });
      return;
    }
    haptic(10);
    setBank(r.bank);
    setFresh(r.ref);
    setAmount("");
    setMemo("");
    const line = r.bank.ledger[0];
    setMsg({ ok: true, text: `${r.ref} posted · ${peso(Math.abs(line.amount))} ${kind === "transfer" ? `from ${ACCOUNT_NAMES[from]} to ${ACCOUNT_NAMES[to]}` : kind === "deposit" ? `into ${ACCOUNT_NAMES[to]}` : `out of ${ACCOUNT_NAMES[from]}`}.` });
  };

  const accountSelect = (label: string, value: AccountId, onChange: (v: AccountId) => void) => (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value as AccountId)} className={cn(input, "cursor-pointer")}>
        {bank.accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} · {peso(a.balance)}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <div className="space-y-5">
      {/* Balances */}
      <ul className={cn("grid gap-px overflow-hidden rounded-[2px] bg-ink/10 ring-1 ring-ink/10", compact ? "grid-cols-1" : "sm:grid-cols-3")}>
        {bank.accounts.map((a) => (
          <li key={a.id} className={cn("flex items-center justify-between gap-3 bg-paper p-3.5", !compact && "sm:block")}>
            <div className="min-w-0">
              <p className="label text-[0.55rem] text-ink/60">{a.name}</p>
              {!compact && <p className="mt-0.5 font-mono text-[0.62rem] text-ink/40">{a.number}</p>}
            </div>
            <p className={cn("font-display text-xl leading-none tabular-nums", !compact && "sm:mt-3 sm:text-[1.7rem]")}>{peso(a.balance)}</p>
          </li>
        ))}
      </ul>

      {/* New transaction */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-3"
      >
        <Segmented label="Transaction" value={kind} onChange={(k) => (setKind(k), setMsg(null))} options={KINDS} />
        <div className={cn("grid gap-3", !compact && "sm:grid-cols-2")}>
          {kind !== "deposit" && accountSelect("From", from, setFrom)}
          {kind !== "withdraw" && accountSelect(kind === "deposit" ? "Into" : "To", to, setTo)}
          <Field label="Amount (₱)">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              aria-invalid={msg?.ok === false || undefined}
              className={cn(input, "font-display text-lg tabular-nums")}
            />
          </Field>
          <Field label="Note (optional)">
            <input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={40} placeholder={kind === "transfer" ? "e.g. Rent share" : "e.g. Payday"} className={input} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => setAmount(q)} className="label press rounded-full border border-ink/15 px-3 py-1.5 text-[0.55rem] text-ink/65 hover:border-ink hover:text-ink">
              ₱{q}
            </button>
          ))}
          <button type="submit" className="btn ml-auto bg-ink py-3 text-paper hover:bg-ember">
            {KINDS.find((k) => k.value === kind)!.label} <Icon name="arrow-right" className="arrow" />
          </button>
        </div>
        {msg && (
          <p
            role={msg.ok ? "status" : "alert"}
            className={cn("flex items-start gap-2 rounded-[2px] border-l-2 px-3 py-2 font-serif text-sm leading-snug", msg.ok ? "border-[#2e7d32] bg-[#2e7d32]/[0.07] text-ink/80" : "border-ember bg-ember/[0.06] text-ink/85")}
          >
            <Icon name={msg.ok ? "check" : "warning"} className={cn("mt-[0.15em] h-4 w-4", msg.ok ? "text-[#2e7d32]" : "text-ember")} />
            {msg.text}
          </p>
        )}
      </form>

      {/* Ledger */}
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="label text-[0.55rem] text-ink/55">Ledger · newest first</p>
          <button
            type="button"
            onClick={() => {
              setBank(sampleBank());
              setMsg(null);
              setFresh(null);
            }}
            className="label press inline-flex items-center gap-1.5 text-[0.55rem] text-ink/50 hover:text-ink"
          >
            <Icon name="refresh" /> Reset
          </button>
        </div>
        <ol className={cn("no-scrollbar divide-y divide-ink/10 overflow-y-auto rounded-[2px] ring-1 ring-ink/10", compact ? "max-h-56" : "max-h-80")}>
          {bank.ledger.map((e, i) => (
            <li key={`${e.ref}-${e.account}-${i}`} className={cn("grid grid-cols-[1fr_auto] gap-x-3 px-3 py-2.5 transition-colors", e.ref === fresh ? "bg-[#d9a441]/15" : "bg-paper")}>
              <div className="min-w-0">
                <p className="truncate font-serif text-[0.95rem] leading-tight">{e.memo}</p>
                <p className="mt-0.5 truncate font-mono text-[0.6rem] text-ink/45">
                  {e.ref} · {ACCOUNT_NAMES[e.account]}
                  {e.kind === "transfer" && e.counterpart ? ` · ${e.amount < 0 ? "to" : "from"} ${ACCOUNT_NAMES[e.counterpart]}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className={cn("font-mono text-sm tabular-nums", e.amount < 0 ? "text-ember" : "text-[#2e7d32]")}>
                  {e.amount > 0 ? "+" : ""}
                  {peso(e.amount)}
                </p>
                <p className="font-mono text-[0.6rem] text-ink/45 tabular-nums">bal {peso(e.balance)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Reconciliation */}
      <div className={cn("flex items-start gap-3 rounded-[2px] p-3.5", rec.balanced ? "bg-ink text-paper" : "bg-ember text-paper")}>
        <Icon name={rec.balanced ? "check" : "warning"} className="mt-0.5 h-5 w-5 shrink-0 text-[#7bd88f]" />
        <div className="min-w-0 font-mono text-[0.66rem] leading-relaxed text-paper/80">
          <p className="label mb-1 text-[0.55rem] text-paper">{rec.balanced ? "Books balance" : "Out of balance"}</p>
          <p className="break-words">
            {peso(bank.opening)} opening + {peso(rec.deposits)} in − {peso(rec.withdrawals)} out = <span className="text-paper">{peso(rec.expected)}</span>
          </p>
          <p>Transfers net {peso(rec.transfersNet)}: every peso that left one account landed in another.</p>
        </div>
      </div>

      <Note>
        Try sending more than an account holds, an amount like 10.555, or a transfer into the same account. Inspired by BankoSantiago; accounts, numbers and the ₱100,000 cap are made up, and it resets on reload.
      </Note>
    </div>
  );
}
