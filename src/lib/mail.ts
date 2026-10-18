import { briefCard, briefSections, type Brief, type BriefAnswers } from "@/content/briefs";
import { bookingSteps, bookingTerms, privateTerms, type Package, type Service } from "@/content/sessions";
import { site } from "@/lib/site";
import { bookingSections, time12, type Section, type ShootExtras } from "@/lib/tools/quote";

// The emails themselves: what Neil receives, the copy the client gets, and
// Neil's answers. Pure templates, safe to render in the browser (the booking
// page previews them); sending lives in lib/send-mail.ts.

export interface Inquiry {
  name: string;
  email: string;
  topic: string;
  message: string;
  booking?: { service: Service; pkg: Package; date: string; phone: string; extras?: ShootExtras };
  /** A project brief (website, video, network, security…), already checked. */
  brief?: { brief: Brief; answers: BriefAnswers };
}

/** Booking terms, plus the private-shoot rules for custom shoots. */
const termsFor = (service: Service) => (service.custom ? [...bookingTerms, ...privateTerms] : bookingTerms);


const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const prettyDate = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/* ── The look: the site's paper, ink, wine and ember, set like a printed invitation ── */

const C = { paper: "#fdf0d5", card: "#fffaf0", page: "#f3e3c3", ink: "#003049", wine: "#780000", ember: "#c1121f", sky: "#669bbc" };
const SERIF = "Georgia,'Times New Roman',serif";
const MONO = "'Courier New',Courier,monospace";
const label = (color: string) => `margin:0;color:${color};font:700 11px/1.4 ${MONO};letter-spacing:.16em;text-transform:uppercase`;

type Action = { label: string; href: string; tone: "ember" | "ink" | "ghost" };

interface Mail {
  /** Hidden preview line most inboxes show next to the subject. */
  preheader: string;
  eyebrow: string;
  heading: string;
  intro: string;
  /** The invitation card: a few centred lines, like a printed card. */
  card?: { kicker: string; title: string; lines: string[] };
  actions?: Action[];
  sections?: Section[];
  note?: { title: string; body: string };
  steps?: { title: string; items: string[] };
  smallPrint?: string[];
  footer: string;
}

function buttons(actions: Action[]) {
  const style = { ember: `background:${C.ember};color:${C.paper}`, ink: `background:${C.ink};color:${C.paper}`, ghost: `background:transparent;color:${C.ink};border:1px solid ${C.ink}55` };
  // Inline blocks rather than a table row, so the buttons wrap on phone mail apps.
  return actions
    .map((a) => `<a href="${esc(a.href)}" style="display:inline-block;margin:0 8px 8px 0;padding:13px 20px;border-radius:999px;${style[a.tone]};font:700 12px/1 ${MONO};letter-spacing:.12em;text-transform:uppercase;text-decoration:none">${esc(a.label)}</a>`)
    .join("");
}

const block = (inner: string, pad = "0 32px 24px") => `<tr><td style="padding:${pad}">${inner}</td></tr>`;

function render(m: Mail) {
  const card = m.card
    ? block(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.ink}"><tr><td style="padding:6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.ink}55"><tr><td align="center" style="padding:28px 20px">
<p style="${label(C.ember)}">${esc(m.card.kicker)}</p>
<p style="margin:12px 0 0;color:${C.ink};font:italic 30px/1.15 ${SERIF}">${esc(m.card.title)}</p>
<p style="margin:16px auto;width:48px;height:2px;background:${C.ember};line-height:2px;font-size:0">&nbsp;</p>
${m.card.lines.map((l) => `<p style="margin:4px 0 0;color:${C.ink};font:17px/1.45 ${SERIF}">${esc(l)}</p>`).join("")}
</td></tr></table></td></tr></table>`,
      )
    : "";
  const sections = (m.sections ?? [])
    .map((sec) =>
      block(
        `<p style="${label(C.sky)};padding:0 0 8px;border-bottom:1px solid ${C.ink}22">${esc(sec.title)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${sec.rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:9px 14px 9px 0;width:38%;color:${C.ink}99;font:13px/1.45 ${SERIF};vertical-align:top">${esc(k)}</td><td style="padding:9px 0;color:${C.ink};font:16px/1.45 ${SERIF};vertical-align:top;word-break:break-word">${esc(v)}</td></tr>`,
          )
          .join("")}</table>`,
        "0 32px 22px",
      ),
    )
    .join("");
  const note = m.note
    ? block(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border-left:3px solid ${C.ember}"><tr><td style="padding:16px 18px">
<p style="${label(C.ember)}">${esc(m.note.title)}</p>
<p style="margin:8px 0 0;color:${C.ink};font:16px/1.6 ${SERIF};white-space:pre-wrap">${esc(m.note.body)}</p></td></tr></table>`,
      )
    : "";
  const steps = m.steps
    ? block(
        `<p style="${label(C.sky)};padding:0 0 8px;border-bottom:1px solid ${C.ink}22">${esc(m.steps.title)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${m.steps.items
          .map(
            (s, i) =>
              `<tr><td style="padding:10px 12px 0 0;width:30px;vertical-align:top"><div style="width:26px;height:26px;border-radius:13px;background:${i === 0 ? C.ember : C.ink};color:${C.paper};font:700 12px/26px ${MONO};text-align:center">${i + 1}</div></td><td style="padding:12px 0 0;color:${C.ink};font:16px/1.5 ${SERIF}">${esc(s)}</td></tr>`,
          )
          .join("")}</table>`,
      )
    : "";
  const small = m.smallPrint?.length
    ? block(`<p style="margin:0;color:${C.ink}aa;font:13px/1.6 ${SERIF}">${m.smallPrint.map(esc).join("<br>")}</p>`)
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(m.heading)}</title></head>
<body style="margin:0;padding:0;background:${C.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(m.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.paper};border:1px solid ${C.ink}22">
<tr><td style="background:${C.wine};padding:22px 32px"><p style="${label(C.paper)}">${esc(site.name)}</p><p style="margin:6px 0 0;color:${C.paper}cc;font:italic 15px/1.3 ${SERIF}">Web · Photo &amp; Video · Networks</p></td></tr>
${block(`<p style="${label(C.ember)}">${esc(m.eyebrow)}</p><h1 style="margin:10px 0 0;color:${C.ink};font:400 34px/1.1 ${SERIF}">${esc(m.heading)}</h1><p style="margin:14px 0 0;color:${C.ink}cc;font:italic 18px/1.5 ${SERIF}">${esc(m.intro)}</p>`, "32px 32px 24px")}
${card}
${m.actions?.length ? block(buttons(m.actions), "0 32px 16px") : ""}
${sections}${note}${steps}${small}
${block(`<p style="margin:0;padding-top:18px;border-top:1px solid ${C.ink}22;color:${C.ink}99;font:14px/1.5 ${SERIF}">${esc(m.footer)}</p>`, "0 32px 32px")}
</table>
<p style="margin:16px 0 0;color:${C.ink}77;font:12px/1.5 ${SERIF}">${esc(site.name)} · ${esc(site.location)}, ${esc(site.country)}</p>
</td></tr></table></body></html>`;
}

/** Plain-text twin of every email, for clients that don't show HTML. */
function plainText(m: Mail) {
  const parts = [
    m.heading,
    m.intro,
    m.card && [m.card.kicker.toUpperCase(), m.card.title, ...m.card.lines].join("\n"),
    ...(m.sections ?? []).map((sec) => `${sec.title.toUpperCase()}\n${sec.rows.map(([k, v]) => `${k}: ${v}`).join("\n")}`),
    m.note && `${m.note.title.toUpperCase()}\n${m.note.body}`,
    m.steps && `${m.steps.title.toUpperCase()}\n${m.steps.items.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    m.smallPrint?.join("\n"),
    m.actions?.map((a) => `${a.label}: ${a.href}`).join("\n"),
    m.footer,
  ];
  return parts.filter(Boolean).join("\n\n") + "\n";
}

const out = (subject: string, m: Mail) => ({ subject, html: render(m), text: plainText(m) });

/** Date, time and place for the invitation card. */
function cardLines(b: NonNullable<Inquiry["booking"]>) {
  const x = b.extras ?? {};
  const where = b.service.atStudio ? "Neil's in-house studio" : [x.location, x.locationType].filter(Boolean)[0];
  return [`${prettyDate(b.date)}${x.time ? ` · ${time12(x.time)}` : ""}`, where ?? "", `${b.pkg.name} · ${b.pkg.price}`].filter(Boolean);
}

/** What Neil receives. Bookings come with one-click links to answer the client. */
export function ownerEmail(inq: Inquiry, respond?: { confirm: string; reschedule: string; decline: string }) {
  const b = inq.booking;
  const who = inq.name || inq.email;
  const br = inq.brief;
  if (!b && br && br.brief.id !== "other") {
    const card = briefCard(br.brief, br.answers);
    const phone = typeof br.answers.phone === "string" ? br.answers.phone : "";
    const tel = phone.replace(/[^\d+]/g, "");
    return out(`${br.brief.emoji} ${br.brief.topic}: ${card.title} — ${who}`, {
      preheader: [card.title, ...card.lines].join(" · "),
      eyebrow: `New ${br.brief.topic.toLowerCase()} brief`,
      heading: `${who} has a ${br.brief.topic.toLowerCase()}`,
      intro: "Everything they filled in is below, grouped the way they answered it. Hit reply to answer them directly; they've been told to expect a reply within 24 hours.",
      card,
      actions: [
        { label: "Reply by email", href: `mailto:${inq.email}?subject=${encodeURIComponent(`Re: your ${br.brief.topic.toLowerCase()}`)}`, tone: "ember" },
        ...(tel ? ([{ label: "Call client", href: `tel:${tel}`, tone: "ghost" }] as Action[]) : []),
      ],
      sections: [{ title: "Client", rows: [["Name", inq.name], ["Email", inq.email]] }, ...briefSections(br.brief, br.answers)],
      note: { title: "In their words", body: inq.message },
      steps: { title: "What they were told happens next", items: br.brief.next },
      footer: "Sent from the project brief form on your portfolio.",
    });
  }
  if (!b) {
    const extra = br ? briefSections(br.brief, br.answers).flatMap((s) => s.rows) : [];
    return out(`✉️ ${inq.topic} — ${who}`, {
      preheader: inq.message.slice(0, 120),
      eyebrow: "New message",
      heading: `${who} wrote in`,
      intro: `About ${inq.topic.toLowerCase()}. Hit reply to answer them directly.`,
      sections: [{ title: "From", rows: [["Name", inq.name || "—"], ["Email", inq.email], ["Topic", inq.topic], ...extra] }],
      note: { title: "Their message", body: inq.message },
      footer: "Sent from the contact form on your portfolio.",
    });
  }
  const sections = bookingSections(b.service, b.pkg, b.date, b.phone, b.extras);
  sections.unshift({ title: "Client", rows: [["Name", inq.name], ["Email", inq.email]] });
  const tel = b.phone.replace(/[^\d+]/g, "");
  return out(`📸 Booking request: ${b.service.name} on ${prettyDate(b.date)} — ${who}`, {
    preheader: `${b.pkg.name} · ${b.pkg.price} · ${cardLines(b)[0]}`,
    eyebrow: "New booking request",
    heading: `${who} wants a shoot`,
    intro: "Everything they told the booking form is below. Use the buttons to confirm, offer another date or decline: each opens a page where you add the details and send the client a matching email.",
    card: { kicker: "Requested", title: b.service.name, lines: cardLines(b) },
    actions: [
      ...(respond
        ? ([
            { label: "✓ Confirm booking", href: respond.confirm, tone: "ember" },
            { label: "Suggest a date", href: respond.reschedule, tone: "ink" },
            { label: "Decline", href: respond.decline, tone: "ghost" },
          ] as Action[])
        : []),
      ...(tel ? ([{ label: "Call client", href: `tel:${tel}`, tone: "ghost" }] as Action[]) : []),
    ],
    sections,
    note: { title: "Their vision & notes", body: inq.message },
    smallPrint: [`They agreed to: ${termsFor(b.service).join(" ")}`],
    footer: "Hit reply to write to the client directly. Booking links stay valid for 60 days.",
  });
}

/** The copy the client receives after sending the form. */
export function senderEmail(inq: Inquiry) {
  const b = inq.booking;
  const first = inq.name.split(" ")[0] || "there";
  const br = inq.brief;
  if (!b && br && br.brief.id !== "other") {
    const topic = br.brief.topic.toLowerCase();
    return out(`Your ${topic} brief — received`, {
      preheader: "Your brief is in. Neil replies within 24 hours.",
      eyebrow: "Brief received",
      heading: `Thanks, ${first}. It's in.`,
      intro: `Thank you for thinking of me for your ${topic}. Here's your brief exactly as I received it, so we're on the same page. Nothing is booked or charged yet.`,
      card: briefCard(br.brief, br.answers),
      sections: briefSections(br.brief, br.answers),
      note: { title: "In your words", body: inq.message },
      steps: { title: "What happens next", items: br.brief.next },
      smallPrint: br.brief.partners ? [br.brief.partners] : undefined,
      footer: `— ${site.firstName} · Reply to this email to add anything or send files.`,
    });
  }
  if (!b) {
    return out(`Thanks for reaching out, ${first}`, {
      preheader: "Your message is in. Neil replies within 24 hours.",
      eyebrow: "Message received",
      heading: `Thanks, ${first}!`,
      intro: "Your message is in. I read every one myself and reply within 24 hours.",
      note: { title: "What you sent", body: inq.message },
      footer: `— ${site.firstName}. This is an automatic copy; just reply if you'd like to add anything.`,
    });
  }
  return out(`Your booking request — ${b.service.name} on ${prettyDate(b.date)}`, {
    preheader: "Your request is in. Neil replies within 24 hours to confirm the date.",
    eyebrow: "Booking request received",
    heading: `You're on the list, ${first}.`,
    intro: "Thank you for choosing me for your shoot. This isn't a confirmed booking yet: I'll check my calendar and reply within 24 hours. Here's everything you sent, so we're on the same page.",
    card: { kicker: "Your shoot request", title: b.service.name, lines: cardLines(b) },
    sections: bookingSections(b.service, b.pkg, b.date, b.phone, b.extras),
    note: { title: "Your notes", body: inq.message },
    steps: { title: "What happens next", items: bookingSteps },
    smallPrint: termsFor(b.service),
    footer: `— ${site.firstName} · Reply to this email if anything needs to change.`,
  });
}


/* ── Neil's answer to a booking request, sent to the client ── */

export type BookingAnswer = "confirm" | "reschedule" | "decline";

export interface AnswerDetails {
  time?: string;
  location?: string;
  payment?: string;
  newDates?: string;
  note?: string;
}

export function bookingAnswerEmail(
  b: { name: string; service: Service; pkg: Package; date: string; downpayment: number | null; extras?: ShootExtras },
  action: BookingAnswer,
  d: AnswerDetails,
) {
  const first = b.name.split(" ")[0] || "there";
  const when = prettyDate(b.date);
  const sign = `— ${site.firstName}`;
  const clean = (v?: string) => (v ?? "").trim();

  if (action === "confirm") {
    const x = b.extras ?? {};
    const place = clean(d.location) || (b.service.atStudio ? "Neil's in-house studio" : [x.location, x.locationType].filter(Boolean)[0] ?? "");
    const time = clean(d.time) || (x.time ? time12(x.time) : "");
    // People, add-ons and the total, as booked; the date and place as confirmed.
    const booked = bookingSections(b.service, b.pkg, b.date, "", b.extras)
      .flatMap((sec) => sec.rows)
      .filter(([k]) => ["People", "Add-ons", "Estimated total", "Photo use"].includes(k))
      .map(([k, v]): [string, string] => [k === "Estimated total" ? "Total" : k, v]);
    const sections: Section[] = [
      {
        title: "Your booking",
        rows: [
          ["Service", b.service.name],
          ["Package", `${b.pkg.name} — ${b.pkg.price}`],
          ["Includes", b.pkg.detail],
          ["Date", when],
          ...(time ? ([["Call time", time]] as [string, string][]) : []),
          ...(place ? ([["Location", place]] as [string, string][]) : []),
          ...booked,
        ],
      },
      { title: "To lock the date", rows: [["Downpayment", b.downpayment ? `₱${b.downpayment.toLocaleString("en-PH")} (30%)` : "30% of the total"], ...(clean(d.payment) ? ([["How to pay", clean(d.payment)]] as [string, string][]) : [])] },
    ];
    return out(`✅ Confirmed: your ${b.service.name} on ${when}`, {
      preheader: `See you on ${when}. Downpayment details inside.`,
      eyebrow: "Booking confirmed",
      heading: `You're booked, ${first}!`,
      intro: `Your ${b.service.name.toLowerCase()} is confirmed. Here's everything for the day; keep this email handy.`,
      card: { kicker: "Save the date", title: b.service.name, lines: [`${when}${time ? ` · ${time}` : ""}`, place, `${b.pkg.name} · ${b.pkg.price}`].filter(Boolean) },
      sections,
      note: clean(d.note) ? { title: "A note from Neil", body: clean(d.note) } : undefined,
      steps: { title: "From here", items: ["Pay the 30% downpayment using the details above; that locks your date.", ...bookingSteps.slice(2)] },
      smallPrint: termsFor(b.service),
      footer: `${sign} · Reply to this email if anything needs to change.`,
    });
  }

  if (action === "reschedule") {
    return out(`📅 About your ${b.service.name} booking — can we pick another date?`, {
      preheader: `${when} doesn't work, but here are dates that do.`,
      eyebrow: "A new date",
      heading: `Can we move it, ${first}?`,
      intro: `Thanks for booking! ${when} doesn't work on my side, but I'd love to do your shoot.`,
      card: clean(d.newDates) ? { kicker: "Available instead", title: b.service.name, lines: clean(d.newDates).split(/\n|;\s*/).filter(Boolean) } : undefined,
      sections: [{ title: "Your request", rows: [["Service", b.service.name], ["Package", `${b.pkg.name} — ${b.pkg.price}`], ["You asked for", when]] }],
      note: { title: "A note from Neil", body: clean(d.note) || `${when} is already taken. Reply with the date that works best and I'll lock it in.` },
      footer: `${sign} · Just reply to this email to choose a date.`,
    });
  }

  return out(`About your ${b.service.name} booking request`, {
    preheader: "Thank you for thinking of me for your shoot.",
    eyebrow: "About your request",
    heading: `Thank you, ${first}`,
    intro: `I'm sorry — I can't take your booking for ${when}.`,
    sections: [{ title: "Your request", rows: [["Service", b.service.name], ["Date requested", when]] }],
    note: { title: "A note from Neil", body: clean(d.note) || "Unfortunately I can't take this booking, but I hope we get to work together another time." },
    footer: `${sign} · You can always reply to this email.`,
  });
}
