"use client";

import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { handle, programs, ROLES, SEED, sections, type Action, type Payload, type Response, type Role, type Student } from "@/lib/tools/registrar";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { Field, Note, Segmented, input } from "./ui";

const ACTIONS: { value: Action; label: string }[] = [
  { value: "index", label: "Browse" },
  { value: "store", label: "Add" },
  { value: "update", label: "Edit" },
  { value: "destroy", label: "Delete" },
];

const BLANK: Payload = { firstName: "", lastName: "", programId: 1, sectionId: 1, hometown: "", enrollmentYear: 2026, status: "active" };
const fromStudent = (s: Student): Payload => ({ firstName: s.firstName, lastName: s.lastName, programId: s.programId, sectionId: s.sectionId, hometown: s.hometown, enrollmentYear: s.enrollmentYear, status: s.status });

const tone = (status: number) => (status < 300 ? "bg-[#2e7d32] text-paper" : status === 422 ? "bg-[#d9a441] text-ink" : "bg-ember text-paper");

/**
 * The Student Information System's Laravel API, acted out in the browser:
 * pick who's signed in and what they try, and see the HTTP response and the
 * server code path that produced it.
 */
export default function RegistrarTool({ compact }: { compact?: boolean }) {
  const [students, setStudents] = useState<Student[]>(SEED);
  const [role, setRole] = useState<Role>("admin");
  const [action, setAction] = useState<Action>("store");
  const [targetId, setTargetId] = useState(SEED[0].id);
  const [form, setForm] = useState<Payload>({ ...BLANK, firstName: "Juan", lastName: "Dela Cruz", hometown: "San Jose City" });
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Response | null>(null);
  const target = students.find((s) => s.id === targetId) ?? students[0];
  const roleInfo = ROLES.find((r) => r.id === role)!;
  const set = <K extends keyof Payload>(k: K, v: Payload[K]) => setForm((f) => ({ ...f, [k]: v }));

  const send = () => {
    haptic(10);
    const out = handle(students, { role, action, id: target?.id, payload: form, q });
    setRes(out);
    setStudents(out.students);
    if (action === "destroy" && out.status === 204) setTargetId(out.students[0]?.id ?? 0);
  };

  const pick = (a: Action) => {
    setAction(a);
    setRes(null);
    if (a === "update" && target) setForm(fromStudent(target));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className="label block text-3xs text-ink/70">Signed in as</span>
        <Segmented label="Signed in as" value={role} onChange={(r) => (setRole(r), setRes(null))} options={ROLES.map((r) => ({ value: r.id, label: r.label }))} />
        <Note>
          {roleInfo.email && <span className="font-mono not-italic text-ink/70">{roleInfo.email} · </span>}
          {roleInfo.can}
        </Note>
      </div>

      <div className="space-y-2">
        <span className="label block text-3xs text-ink/70">Request</span>
        <Segmented label="Request" value={action} onChange={pick} options={ACTIONS} />
      </div>

      {action === "index" && (
        <Field label="Search (name, hometown or student no.)">
          <input value={q} onChange={(e) => setQ(e.target.value)} className={input} placeholder="e.g. santos" />
        </Field>
      )}

      {(action === "update" || action === "destroy") && students.length > 0 && (
        <Field label="Record">
          <select
            value={target?.id}
            onChange={(e) => {
              const id = Number(e.target.value);
              setTargetId(id);
              const s = students.find((x) => x.id === id);
              if (s && action === "update") setForm(fromStudent(s));
            }}
            className={cn(input, "cursor-pointer")}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.studentNo} · {s.lastName}, {s.firstName} · {sections.find((x) => x.id === s.sectionId)?.code}
              </option>
            ))}
          </select>
        </Field>
      )}

      {(action === "store" || action === "update") && (
        <div className={cn("grid [&>*]:min-w-0 gap-3", !compact && "sm:grid-cols-2")}>
          <Field label="first_name">
            <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className={input} placeholder="Leave blank to see a 422" />
          </Field>
          <Field label="last_name">
            <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className={input} />
          </Field>
          <Field label="program_id">
            <select value={form.programId} onChange={(e) => set("programId", Number(e.target.value))} className={cn(input, "cursor-pointer")}>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code}
                </option>
              ))}
            </select>
          </Field>
          <Field label="section_id">
            <select value={form.sectionId} onChange={(e) => set("sectionId", Number(e.target.value))} className={cn(input, "cursor-pointer")}>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} ({students.filter((x) => x.sectionId === s.id).length}/{s.capacity})
                </option>
              ))}
            </select>
          </Field>
          <Field label="hometown">
            <input value={form.hometown} onChange={(e) => set("hometown", e.target.value)} className={input} />
          </Field>
          <Field label="status">
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className={cn(input, "cursor-pointer")}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </Field>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={send} className="btn bg-ink py-3 text-paper hover:bg-ember">
          Send request <Icon name="arrow-right" className="arrow" />
        </button>
        <button
          type="button"
          onClick={() => {
            setStudents(SEED);
            setRes(null);
          }}
          className="label press text-3xs text-ink/70 hover:text-ink"
        >
          Reset data
        </button>
      </div>

      {res && (
        <div className="animate-pop-in space-y-3" aria-live="polite">
          <div className="overflow-hidden rounded-[2px] bg-ink text-paper">
            <div className="flex flex-wrap items-center gap-2 border-b border-paper/10 px-3 py-2 font-mono text-[0.7rem]">
              <span className="text-sky">{res.method}</span>
              <span className="min-w-0 flex-1 break-all text-paper/80">{res.url}</span>
              <span className={cn("rounded-full px-2 py-0.5 font-bold", tone(res.status))}>{res.status}</span>
            </div>
            <pre className={cn("no-scrollbar overflow-auto px-3 py-3 font-mono leading-relaxed text-paper/85", compact ? "max-h-48 text-2xs" : "max-h-72 text-[0.7rem]")}>
              {res.body === null ? "(204 No Content)" : JSON.stringify(res.body, null, 2)}
            </pre>
          </div>
          <div>
            <p className="label mb-2 text-3xs text-ink/70">What ran on the server</p>
            <ol className="space-y-1.5">
              {res.trace.map((t, i) => (
                <li key={i} className="flex gap-2.5 font-serif text-sm leading-snug">
                  <span aria-hidden className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-paper", t.ok ? "bg-[#2e7d32]" : "bg-ember")}>
                    <Icon name={t.ok ? "check" : "close"} className="h-2.5 w-2.5" strokeWidth={2.5} />
                  </span>
                  <span>
                    <code className="font-mono text-[0.72rem] text-ink">{t.at}</code> <span className="text-ink/75">{t.note}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <Note>
        Try it: delete as the Adviser (403), add a student with a blank name (422), put a BSIT student in BSCS 1-1 (422), or keep adding to BSIT 1-1 until it&apos;s full. The data is made up and resets on reload.
      </Note>
    </div>
  );
}
