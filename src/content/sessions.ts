// Photography services & packages (from the photography site's booking form).
// The contact form's booking mode reads this, so prices live in one place.

export interface Package {
  id: string;
  name: string;
  price: string;
  detail: string;
}

export interface Service {
  id: string;
  name: string;
  blurb: string;
  packages: Package[];
  /** Built to order: the booking form asks for time, place, people, add-ons and photo use. */
  custom?: boolean;
  /** What every package of this service comes with. */
  includes?: string[];
  /** Shot at Neil's in-house studio, so the booking form doesn't ask where. */
  atStudio?: boolean;
  /** Example answer for "What's the occasion?" */
  occasion?: string;
}

export const services: Service[] = [
  {
    id: "private",
    name: "Custom Private Photoshoot",
    occasion: "e.g. a birthday concept, a couple shoot, a personal brand",
    blurb: "One-on-one and built around your idea — your place, your pace, and photos that stay private unless you say so.",
    custom: true,
    packages: [
      { id: "private_1h", name: "1 Hour", price: "₱1,999", detail: "1 location · 2 outfits · 15 retouches" },
      { id: "private_2h", name: "2 Hours", price: "₱3,499", detail: "Up to 2 locations · 4 outfits · 30 retouches" },
      { id: "private_3h", name: "3 Hours", price: "₱4,799", detail: "Up to 3 locations · any outfits · 45 retouches" },
      { id: "private_half", name: "Half Day · 5 Hours", price: "₱7,499", detail: "Photos + 60-sec reel · 75 retouches" },
      { id: "private_full", name: "Full Day · 8 Hours", price: "₱11,999", detail: "Photos + cinematic video · 120 retouches" },
    ],
    includes: [
      "A concept call and mood board before the shoot",
      "Posing direction the whole time — no experience needed",
      "Every usable frame colour-graded, plus your retouches",
      "A private online gallery within 7–10 days",
      "Up to 2 people; anyone else is added per head",
      "Nothing is posted anywhere without your permission",
    ],
  },
  {
    id: "id_portrait",
    name: "ID & Corporate Headshots",
    atStudio: true,
    occasion: "e.g. job application, company ID, LinkedIn",
    blurb: "Clean, professional portraits for IDs, CVs and profiles.",
    packages: [
      { id: "id_express", name: "Express Editorial ID", price: "₱299", detail: "15 mins · 1×1 / 2×2 prints + digital" },
      { id: "id_standard", name: "Corporate Headshot", price: "₱599", detail: "30 mins · CV half-body + ID prints" },
      { id: "id_bundle", name: "The Professional Bundle", price: "₱999", detail: "1 hr · 2 outfits · full profile kit" },
    ],
  },
  {
    id: "graduation",
    name: "Graduation Photoshoot",
    occasion: "e.g. BSIT graduation, CLSU Class of 2027",
    blurb: "Celebrate the milestone — solo, duo or with the barkada.",
    packages: [
      { id: "grad_solo", name: "Solo", price: "₱1,799", detail: "2 hrs · 1–2 outfits · 15 retouches" },
      { id: "grad_duo", name: "Couple / Duo", price: "₱2,499", detail: "2.5 hrs · 25 retouches" },
      { id: "grad_group", name: "Group (3+)", price: "₱799 / head", detail: "3 hrs · 5 retouches per person" },
      { id: "grad_cinematic", name: "Cinematic Bundle", price: "₱4,999", detail: "3 hrs photo + highlight reel video" },
    ],
  },
  {
    id: "studio",
    name: "In-House Studio Portraits",
    atStudio: true,
    occasion: "e.g. portfolio update, family portrait",
    blurb: "Controlled light, editorial looks, your choice of backdrop.",
    packages: [
      { id: "studio_a", name: "Standard", price: "₱1,999", detail: "Up to 2 hrs · 15 retouches" },
      { id: "studio_b", name: "Extended", price: "₱2,999", detail: "Up to 3 hrs · complex lighting" },
      { id: "studio_c", name: "Editorial Campaign", price: "₱4,499", detail: "4 hrs · custom set · 30 retouches" },
    ],
  },
  {
    id: "funshoot",
    name: "Outside Funshoot & Lifestyle",
    occasion: "e.g. barkada day out, café shoot",
    blurb: "Streets, cafés and parks — relaxed, natural and cinematic.",
    packages: [
      { id: "fun_a", name: "Quick", price: "₱499", detail: "40 mins · 1 location" },
      { id: "fun_b", name: "Standard", price: "₱2,499", detail: "2 hrs · lots of outfit changes" },
      { id: "fun_c_video", name: "Cinematic", price: "₱3,999", detail: "4 hrs photo + highlight reel video" },
      { id: "fun_d_hybrid", name: "Ultimate Hybrid", price: "₱5,999", detail: "Half-day full photo & video" },
    ],
  },
  {
    id: "pre_event",
    name: "Pre-Debut / Pre-Birthday",
    occasion: "e.g. 18th birthday on 12 December",
    blurb: "Studio or on-location shoots before the big day.",
    packages: [
      { id: "pre_studio", name: "Studio Pre-Shoot", price: "₱2,499", detail: "Photos only · flash-controlled studio" },
      { id: "pre_outside", name: "On-Location Pre-Shoot", price: "₱3,499", detail: "Cinematic lifestyle setup" },
      { id: "pre_video_bundle", name: "Cinematic Pre-Shoot Bundle", price: "₱4,999", detail: "Photos + same-day-edit teaser video" },
    ],
  },
  {
    id: "event",
    name: "Full Event Coverage",
    occasion: "e.g. wedding, seminar, company party (with expected guests)",
    blurb: "Birthdays, debuts, weddings, seminars and live gigs.",
    packages: [
      { id: "evt_standard", name: "Standard Photo Coverage", price: "₱4,999", detail: "Photos only · unlimited captures" },
      { id: "evt_premium", name: "Premium Coverage", price: "₱9,999", detail: "Photo coverage + highlight video reel" },
      { id: "evt_ultimate", name: "Ultimate Cinematic", price: "₱14,999", detail: "Full photo team + video SDE" },
      { id: "evt_custom", name: "Live Gig / Corporate", price: "Quote", detail: "Subject to final quote" },
    ],
  },
];

/** Extras for custom private shoots. `amount: null` means quoted case by case. */
export interface AddOn {
  id: string;
  name: string;
  amount: number | null;
  detail: string;
}

export const addOns: AddOn[] = [
  { id: "extra_hour", name: "Extra hour", amount: 1299, detail: "Keep shooting past your package" },
  { id: "hmua", name: "Hair & makeup artist", amount: 1500, detail: "Booked with a partner artist, ready before call time" },
  { id: "reel", name: "60-second vertical reel", amount: 1999, detail: "Edited for Reels and TikTok" },
  { id: "retouch10", name: "10 more retouches", amount: 800, detail: "On top of your package" },
  { id: "rush", name: "Rush delivery", amount: 1000, detail: "Gallery in 3 days instead of 7–10" },
  { id: "prints", name: "10 printed photos", amount: 500, detail: "4R, matte, picked by you" },
  { id: "travel", name: "Travel outside San Jose City", amount: null, detail: "Quoted by distance" },
];

/** Private shoots cover up to this many people; each extra person is a flat fee. */
export const PRIVATE_PEOPLE_INCLUDED = 2;
export const EXTRA_PERSON = 500;

export const locationTypes = ["Your home or place", "An outdoor spot", "A rented studio", "A hotel or venue", "Help me choose"];

export const photoUses = [
  { id: "private", label: "Keep them private", detail: "Only you get the photos" },
  { id: "ask", label: "Ask me first", detail: "Neil asks before sharing any" },
  { id: "share", label: "Okay to share a few", detail: "For Neil's portfolio and socials" },
] as const;

export type PhotoUse = (typeof photoUses)[number]["id"];

/** Extra ground rules for private shoots, shown with the booking terms. */
export const privateTerms = [
  "Venue, entrance and permit fees are paid by you.",
  "Running more than 15 minutes late comes out of the booked time.",
  "One free reschedule with at least 48 hours' notice.",
];

export const bookingTerms = [
  "A 30% non-refundable downpayment secures the shoot date.",
  "Strictly no RAW files — every delivered image is edited to the studio's standard.",
];

/** How the client would like to be reached about the booking. */
export const contactPrefs = ["Email", "Call or text", "Messenger", "Viber"] as const;

/** How the client plans to pay the 30% downpayment. */
export const paymentMethods = ["GCash", "Maya", "Bank transfer", "Cash on meet-up"] as const;

export const referralSources = ["Instagram", "Facebook", "TikTok", "A friend", "Saw Neil at an event", "Google", "Other"] as const;

/** What happens after a booking request, in the order it happens. Shown on the form and in both emails. */
export const bookingSteps = [
  "The date is checked and you get a reply within 24 hours.",
  "You pay the 30% downpayment to lock the date; payment details come with the reply.",
  "A quick call or chat to plan outfits, places and the shot list.",
  "Shoot day: arrive ready, the posing is directed for you.",
  "Your edited photos arrive in a private online gallery.",
];
