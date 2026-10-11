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
}

export const services: Service[] = [
  {
    id: "id_portrait",
    name: "ID & Corporate Headshots",
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
    blurb: "Birthdays, debuts, weddings, seminars and live gigs.",
    packages: [
      { id: "evt_standard", name: "Standard Photo Coverage", price: "₱4,999", detail: "Photos only · unlimited captures" },
      { id: "evt_premium", name: "Premium Coverage", price: "₱9,999", detail: "Photo coverage + highlight video reel" },
      { id: "evt_ultimate", name: "Ultimate Cinematic", price: "₱14,999", detail: "Full photo team + video SDE" },
      { id: "evt_custom", name: "Live Gig / Corporate", price: "Quote", detail: "Subject to final quote" },
    ],
  },
];

export const bookingTerms = [
  "A 30% non-refundable downpayment secures the shoot date.",
  "Strictly no RAW files — every delivered image is edited to the studio's standard.",
];
