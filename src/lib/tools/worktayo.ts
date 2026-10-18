// A registration desk inspired by WorkTayo, the conference registration
// monitoring system built on a relational MySQL database. Three tables, kept
// apart the way the real schema keeps them: participants, the workshops they
// signed up for (registrations) and who actually showed up (attendance).
// The conference, sessions and people are made up for the demo.

export interface Session {
  id: string;
  title: string;
  time: string;
  /** Open sessions take every participant; workshops need a registration. */
  open: boolean;
  capacity: number;
}

export interface Participant {
  id: number;
  code: string;
  name: string;
  email: string;
  affiliation: string;
}

export interface Registration {
  participantId: number;
  sessionId: string;
}

export interface Attendance {
  participantId: number;
  sessionId: string;
  /** Minutes since midnight. */
  at: number;
}

export interface Desk {
  sessions: Session[];
  participants: Participant[];
  registrations: Registration[];
  attendance: Attendance[];
  /** The desk's clock; each check-in moves it on a little. */
  clock: number;
}

export const SESSIONS: Session[] = [
  { id: "plenary", title: "Opening plenary", time: "08:30", open: true, capacity: 300 },
  { id: "ws-a", title: "Workshop A · Designing for low-end phones", time: "10:00", open: false, capacity: 6 },
  { id: "ws-b", title: "Workshop B · From spreadsheets to SQL", time: "10:00", open: false, capacity: 6 },
  { id: "closing", title: "Closing and certificates", time: "15:30", open: true, capacity: 300 },
];

const code = (id: number) => `WT-${String(id).padStart(4, "0")}`;

export function seedDesk(): Desk {
  const people: [string, string, string, ("ws-a" | "ws-b")[]][] = [
    ["Carmela Reyes", "carmela.reyes@example.edu", "College of Engineering", ["ws-a"]],
    ["Joshua Manalo", "joshua.manalo@example.edu", "College of Engineering", ["ws-b"]],
    ["Patricia Lim", "patricia.lim@example.org", "Provincial ICT Office", ["ws-a"]],
    ["Ramon Villanueva", "ramon.v@example.edu", "Graduate School", ["ws-b"]],
    ["Kristine Bautista", "kbautista@example.edu", "College of Education", ["ws-a"]],
    ["Enzo Dizon", "enzo.dizon@example.com", "Industry partner", []],
    ["Hannah Ocampo", "hannah.ocampo@example.edu", "College of Science", ["ws-a", "ws-b"]],
    ["Marvin Tolentino", "m.tolentino@example.org", "Provincial ICT Office", ["ws-b"]],
    ["Aira Navarro", "aira.navarro@example.edu", "College of Science", ["ws-a"]],
    ["Leo Castillo", "leo.castillo@example.com", "Speaker", []],
  ];
  const participants = people.map(([name, email, affiliation], i) => ({ id: i + 1, code: code(i + 1), name, email, affiliation }));
  const registrations = people.flatMap(([, , , ws], i) => ws.map((sessionId) => ({ participantId: i + 1, sessionId })));
  // Six people already through the door for the plenary.
  const attendance = [1, 3, 4, 6, 7, 10].map((participantId, i) => ({ participantId, sessionId: "plenary", at: 8 * 60 + 12 + i * 3 }));
  return { sessions: SESSIONS, participants, registrations, attendance, clock: 8 * 60 + 41 };
}

export const time = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const sessionOf = (desk: Desk, id: string) => desk.sessions.find((s) => s.id === id);
export const isRegistered = (desk: Desk, participantId: number, sessionId: string) =>
  !!sessionOf(desk, sessionId)?.open || desk.registrations.some((r) => r.participantId === participantId && r.sessionId === sessionId);
export const seatsTaken = (desk: Desk, sessionId: string) => desk.registrations.filter((r) => r.sessionId === sessionId).length;

/** Finds someone by code ("WT-0007", "wt7", "7") or, failing that, a unique name match. */
export function find(desk: Desk, query: string): { participant: Participant } | { error: string } {
  const q = query.trim();
  if (!q) return { error: "Scan or type a registration code, or a name." };
  const digits = q.match(/^(?:wt)?[\s-]*0*(\d{1,4})$/i);
  if (digits) {
    const p = desk.participants.find((x) => x.id === Number(digits[1]));
    return p ? { participant: p } : { error: `No one is registered as ${code(Number(digits[1]))}.` };
  }
  const hits = desk.participants.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  if (hits.length === 1) return { participant: hits[0] };
  if (hits.length > 1) return { error: `${hits.length} people match “${q}”. Use their code instead.` };
  return { error: `No registration found for “${q}”. Register them as a walk-in.` };
}

type Done = { ok: true; desk: Desk; participant: Participant; note: string } | { ok: false; error: string };

export function checkIn(desk: Desk, query: string, sessionId: string): Done {
  const s = sessionOf(desk, sessionId);
  if (!s) return { ok: false, error: "Pick a session." };
  const found = find(desk, query);
  if ("error" in found) return { ok: false, error: found.error };
  const p = found.participant;
  if (!isRegistered(desk, p.id, s.id)) return { ok: false, error: `${p.name} isn't registered for ${s.title.split(" · ")[0]}. Seats are tied to registrations.` };
  const already = desk.attendance.find((a) => a.participantId === p.id && a.sessionId === s.id);
  if (already) return { ok: false, error: `${p.name} already checked in at ${time(already.at)}. One row per person per session.` };
  const at = desk.clock;
  return {
    ok: true,
    participant: p,
    note: `${p.name} checked in to ${s.title.split(" · ")[0]} at ${time(at)}.`,
    desk: { ...desk, attendance: [...desk.attendance, { participantId: p.id, sessionId: s.id, at }], clock: at + 2 },
  };
}

/** Undo a check-in made by mistake. */
export function undo(desk: Desk, participantId: number, sessionId: string): Desk {
  return { ...desk, attendance: desk.attendance.filter((a) => !(a.participantId === participantId && a.sessionId === sessionId)) };
}

export interface NewParticipant {
  name: string;
  email: string;
  affiliation: string;
  workshop: string | null;
}

export function register(desk: Desk, input: NewParticipant): Done | { ok: false; error: string; field: "name" | "email" | "workshop" } {
  const name = input.name.trim().replace(/\s+/g, " ");
  const email = input.email.trim().toLowerCase();
  if (name.length < 2) return { ok: false, field: "name", error: "Enter the participant's full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, field: "email", error: "That email address doesn't look complete." };
  const dupe = desk.participants.find((p) => p.email.toLowerCase() === email);
  if (dupe) return { ok: false, field: "email", error: `${email} is already registered to ${dupe.name} (${dupe.code}). Emails are unique.` };
  const ws = input.workshop ? sessionOf(desk, input.workshop) : null;
  if (input.workshop && (!ws || ws.open)) return { ok: false, field: "workshop", error: "Pick one of the workshops." };
  if (ws && seatsTaken(desk, ws.id) >= ws.capacity) return { ok: false, field: "workshop", error: `${ws.title.split(" · ")[0]} is full (${ws.capacity} of ${ws.capacity}). Register without it, or pick the other.` };
  const id = Math.max(0, ...desk.participants.map((p) => p.id)) + 1;
  const participant: Participant = { id, code: code(id), name, email, affiliation: input.affiliation.trim() || "Walk-in" };
  return {
    ok: true,
    participant,
    note: `${name} registered as ${participant.code}${ws ? ` with a seat in ${ws.title.split(" · ")[0]}` : ""}.`,
    desk: { ...desk, participants: [...desk.participants, participant], registrations: ws ? [...desk.registrations, { participantId: id, sessionId: ws.id }] : desk.registrations },
  };
}

export interface SessionStats {
  session: Session;
  expected: number;
  present: number;
  rate: number;
  missing: Participant[];
}

/** The live board: who each session expects, who's in, and who hasn't shown. */
export function board(desk: Desk): SessionStats[] {
  return desk.sessions.map((session) => {
    const expected = desk.participants.filter((p) => isRegistered(desk, p.id, session.id));
    const inside = new Set(desk.attendance.filter((a) => a.sessionId === session.id).map((a) => a.participantId));
    const present = expected.filter((p) => inside.has(p.id)).length;
    return { session, expected: expected.length, present, rate: expected.length ? present / expected.length : 0, missing: expected.filter((p) => !inside.has(p.id)) };
  });
}
