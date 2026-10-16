// The launcher's one-time nudge. Kept free of content imports: the launcher
// ships on every page, so this stays a few hundred bytes.

const BY_PAGE: [RegExp, string[]][] = [
  [/^\/work\/./, ["Want this project explained simply? Ask me 👀", "Ask me who worked on this one 👥", "Liked this? I'll find you a similar project 🔎"]],
  [/^\/work/, ["Not sure where to start? I'll pick a project for you 🎲", "Ask me what any of these actually do 🔬", "Want the story behind one of these? 👀"]],
  [/^\/photography/, ["Want the price of a grad shoot? I know the list 📸", "Ask me which bands Neil has shot 🎸", "Curious what's in his camera bag? 🎒", "Ask me about the night-sky shots 🌌"]],
  [/^\/lab/, ["Every tool here runs in my chat too 🧪", "Paste a sketchy link — I'll check it 🛡️", "I can plan your VLANs in one message 🌐"]],
  [/^\/play/, ["Stuck on Subnet Sprint? I can subnet for you 🌐", "Want the story behind Island Drive? 🚙"]],
  [/^\/(about|resume)/, ["Ask me about Neil's orgs or certificates 🎓", "Want the 30-second version of Neil? 👋", "Ask what Neil does off the clock 🏎️"]],
  [/^\/(contact|bookings)/, ["Not sure what to book? I can quote it first 💬", "Ask me how fast Neil replies ⏱️"]],
];

const ANYWHERE = [
  "Psst — want to see the concert shots? 🎸",
  "Ask me what PathoScan does 🔬",
  "Need a photoshoot? I know the rates 📸",
  "Curious who Neil is? Ask me! 👋",
  "Tap me and hit 🎲 for something random",
  "I can check a suspicious link for you 🛡️",
  "Want to drive a jeepney around Neil's projects? 🚙",
];

function byHour(hour: number): string[] {
  if (hour < 5 || hour >= 22) return ["Up late? The astrophotography is my favourite 🌌", "Night owl? Let's find you something to read 🦉"];
  if (hour < 12) return ["Good morning! Want a quick tour of Neil's work? ☕"];
  if (hour >= 18) return ["Evening! Want a random project to wind down with? 🌆"];
  return [];
}

/** A nudge that fits the page and the hour; the page's own lines are twice as likely. */
export function teaserFor(path: string, hour: number, rng: () => number = Math.random): string {
  const page = BY_PAGE.find(([re]) => re.test(path))?.[1] ?? [];
  const options = [...page, ...page, ...byHour(hour), ...ANYWHERE];
  return options[Math.floor(rng() * options.length)];
}
