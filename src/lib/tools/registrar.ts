// A tiny in-browser stand-in for the Student Information System's Laravel API
// (INTECH 3112). The rules mirror the real backend: Sanctum sign-in,
// StudentPolicy (admin / staff adviser / student), $request->validate(), the
// "section must belong to the program" rule and section capacity. Nothing here
// talks to a server; it shows what the server decides and why.

export type Role = "guest" | "student" | "staff" | "admin";

export const ROLES: { id: Role; label: string; email: string | null; can: string }[] = [
  { id: "guest", label: "Signed out", email: null, can: "Nothing: every data route sits behind auth:sanctum." },
  { id: "student", label: "Student", email: "student@clsu.edu.ph", can: "Read only. The Edit and Delete buttons are hidden, and the policy refuses them anyway." },
  { id: "staff", label: "Adviser", email: "delacruz@clsu.edu.ph", can: "Add students, and edit those in the section they advise (BSIT 1-1). Can't delete." },
  { id: "admin", label: "Registrar", email: "admin@clsu.edu.ph", can: "Everything, including delete." },
];

export interface Section {
  id: number;
  code: string;
  programId: number;
  yearLevel: string;
  capacity: number;
  /** The adviser who may edit this section's students. */
  adviser: Role | null;
}

export const programs = [
  { id: 1, code: "BSIT" },
  { id: 2, code: "BSCS" },
];

export const sections: Section[] = [
  { id: 1, code: "BSIT 1-1", programId: 1, yearLevel: "1st Year", capacity: 4, adviser: "staff" },
  { id: 2, code: "BSIT 2-1", programId: 1, yearLevel: "2nd Year", capacity: 2, adviser: null },
  { id: 3, code: "BSCS 1-1", programId: 2, yearLevel: "1st Year", capacity: 40, adviser: null },
];

export interface Student {
  id: number;
  studentNo: string;
  firstName: string;
  lastName: string;
  programId: number;
  sectionId: number;
  hometown: string;
  enrollmentYear: number;
  status: "active" | "inactive";
}

/** Sample records (made up for the demo). Section capacities are small so "full" is easy to hit. */
export const SEED: Student[] = [
  { id: 1, studentNo: "ID126-0001", firstName: "Miguel", lastName: "Santos", programId: 1, sectionId: 1, hometown: "Cabanatuan City", enrollmentYear: 2026, status: "active" },
  { id: 2, studentNo: "ID126-0002", firstName: "Angela", lastName: "Reyes", programId: 1, sectionId: 1, hometown: "Science City of Muñoz", enrollmentYear: 2026, status: "active" },
  { id: 3, studentNo: "ID125-0003", firstName: "Paolo", lastName: "Garcia", programId: 1, sectionId: 2, hometown: "San Jose City", enrollmentYear: 2025, status: "active" },
  { id: 4, studentNo: "ID125-0004", firstName: "Bea", lastName: "Mendoza", programId: 1, sectionId: 2, hometown: "Guimba", enrollmentYear: 2025, status: "inactive" },
];

export type Action = "index" | "store" | "update" | "destroy";

export interface Payload {
  firstName: string;
  lastName: string;
  programId: number;
  sectionId: number;
  hometown: string;
  enrollmentYear: number;
  status: string;
}

export interface Request {
  role: Role;
  action: Action;
  /** Target record for update / destroy. */
  id?: number;
  payload?: Payload;
  q?: string;
}

export interface Response {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  status: number;
  body: unknown;
  /** What ran on the server, in order: file → method → outcome. */
  trace: { at: string; note: string; ok: boolean }[];
  students: Student[];
}

const resource = (s: Student) => {
  const sec = sections.find((x) => x.id === s.sectionId)!;
  return {
    id: s.id,
    studentNo: s.studentNo,
    firstName: s.firstName,
    lastName: s.lastName,
    program: programs.find((p) => p.id === s.programId)?.code,
    section: sec.code,
    yearLevel: sec.yearLevel,
    hometown: s.hometown,
    enrollmentYear: s.enrollmentYear,
    status: s.status,
  };
};

const ROUTE: Record<Action, { method: Response["method"]; name: string }> = {
  index: { method: "GET", name: "registrar.students.index" },
  store: { method: "POST", name: "registrar.students.store" },
  update: { method: "PUT", name: "registrar.students.update" },
  destroy: { method: "DELETE", name: "registrar.students.destroy" },
};

/** Runs one request against `students` and returns the response plus the new table. */
export function handle(students: Student[], req: Request): Response {
  const r = ROUTE[req.action];
  const url = `/api/registrar/students${req.id && req.action !== "index" && req.action !== "store" ? `/${req.id}` : ""}${req.action === "index" && req.q ? `?q=${encodeURIComponent(req.q)}` : ""}`;
  const trace: Response["trace"] = [{ at: "routes/api.php", note: `${r.method} ${url} matches ${r.name}`, ok: true }];
  const done = (status: number, body: unknown, next = students): Response => ({ method: r.method, url, status, body, trace, students: next });
  const role = ROLES.find((x) => x.id === req.role)!;

  // auth:sanctum
  if (req.role === "guest") {
    trace.push({ at: "auth:sanctum", note: "No bearer token, so the request stops here", ok: false });
    return done(401, { message: "Unauthenticated." });
  }
  trace.push({ at: "auth:sanctum", note: `Token belongs to ${role.email} (${req.role === "staff" ? "staff" : req.role})`, ok: true });

  const target = req.id ? students.find((s) => s.id === req.id) : undefined;
  if ((req.action === "update" || req.action === "destroy") && !target) {
    trace.push({ at: "Route model binding", note: `No student with id ${req.id}`, ok: false });
    return done(404, { message: "No query results for model [App\\Models\\Student]." });
  }

  // StudentPolicy
  const policy = (() => {
    if (req.action === "index") return { ok: true, why: "viewAny: any signed-in user" };
    if (req.action === "store") return req.role === "student" ? { ok: false, why: "create: only admin or staff" } : { ok: true, why: `create: ${req.role === "admin" ? "admin" : "staff"} may add` };
    if (req.action === "destroy") return req.role === "admin" ? { ok: true, why: "delete: admin" } : { ok: false, why: "delete: registrar (admin) only, even for an adviser" };
    if (req.role === "admin") return { ok: true, why: "update: admin" };
    const advises = sections.find((s) => s.id === target!.sectionId)?.adviser === req.role;
    return req.role === "staff" && advises ? { ok: true, why: "update: staff advising this student's section" } : { ok: false, why: req.role === "staff" ? "update: staff, but not this section's adviser" : "update: students can't edit records" };
  })();
  trace.push({ at: `StudentPolicy@${req.action === "index" ? "viewAny" : req.action === "store" ? "create" : req.action === "destroy" ? "delete" : "update"}`, note: policy.why, ok: policy.ok });
  if (!policy.ok) return done(403, { message: "This action is unauthorized." });

  if (req.action === "index") {
    const q = req.q?.trim().toLowerCase();
    const rows = students.filter((s) => !q || [s.firstName, s.lastName, s.hometown, s.studentNo].some((v) => v.toLowerCase().includes(q)));
    trace.push({ at: "Student::search()->sorted()", note: `${rows.length} match${rows.length === 1 ? "" : "es"}, sorted by last name, 8 per page`, ok: true });
    const sorted = [...rows].sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
    return done(200, { data: sorted.map(resource), meta: { current_page: 1, per_page: 8, total: rows.length } });
  }

  if (req.action === "destroy") {
    trace.push({ at: "StudentController@destroy", note: `$student->delete() removed row ${target!.id}`, ok: true });
    return done(204, null, students.filter((s) => s.id !== target!.id));
  }

  // store / update: validation first, then the capacity rule
  const p = req.payload!;
  const errors: Record<string, string[]> = {};
  const need = (k: string, v: string, label: string) => {
    if (!v.trim()) errors[k] = [`The ${label} field is required.`];
  };
  need("first_name", p.firstName, "first name");
  need("last_name", p.lastName, "last name");
  need("hometown", p.hometown, "hometown");
  const year = new Date().getFullYear();
  if (!Number.isInteger(p.enrollmentYear) || p.enrollmentYear < 2000 || p.enrollmentYear > year + 1) errors.enrollment_year = [`The enrollment year field must be between 2000 and ${year + 1}.`];
  if (!["active", "inactive"].includes(p.status)) errors.status = ["The selected status is invalid."];
  const section = sections.find((s) => s.id === p.sectionId);
  if (!section || section.programId !== p.programId) errors.section_id = ["That section does not belong to the selected program."];
  if (Object.keys(errors).length) {
    trace.push({ at: "$request->validate()", note: `Failed: ${Object.keys(errors).join(", ")}`, ok: false });
    return done(422, { message: "The given data was invalid.", errors });
  }
  trace.push({ at: "$request->validate()", note: "Every rule passed", ok: true });

  const moving = req.action === "store" || target!.sectionId !== p.sectionId;
  if (moving) {
    const count = students.filter((s) => s.sectionId === section!.id).length;
    if (count >= section!.capacity) {
      trace.push({ at: "sectionCapacityError()", note: `${section!.code} has ${count}/${section!.capacity}: full`, ok: false });
      return done(422, { message: "The given data was invalid.", errors: { section_id: [`Section ${section!.code} is already at its capacity of ${section!.capacity}.`] } });
    }
    trace.push({ at: "sectionCapacityError()", note: `${section!.code} has ${count}/${section!.capacity}: room left`, ok: true });
  } else {
    trace.push({ at: "sectionCapacityError()", note: "Same section, so capacity isn't re-checked", ok: true });
  }

  const fields = {
    firstName: p.firstName.trim(),
    lastName: p.lastName.trim(),
    programId: p.programId,
    sectionId: p.sectionId,
    hometown: p.hometown.trim(),
    enrollmentYear: p.enrollmentYear,
    status: p.status as Student["status"],
  };
  if (req.action === "store") {
    const id = Math.max(0, ...students.map((s) => s.id)) + 1;
    const created: Student = { id, studentNo: `ID1${String(p.enrollmentYear).slice(-2)}-${String(id).padStart(4, "0")}`, ...fields };
    trace.push({ at: "Student::create()", note: `Row ${id} inserted; the created event stamps student_no ${created.studentNo}`, ok: true });
    return done(201, { data: resource(created) }, [...students, created]);
  }
  const updated: Student = { ...target!, ...fields };
  trace.push({ at: "$student->update()", note: `Row ${target!.id} saved; student_no ${target!.studentNo} never changes`, ok: true });
  return done(200, { data: resource(updated) }, students.map((s) => (s.id === target!.id ? updated : s)));
}
