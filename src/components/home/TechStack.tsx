import Link from "next/link";
import { reveal } from "@/lib/reveal";

const techBadges = [
  {
    name: "Next.js",
    category: "framework",
    svg: <path fillRule="evenodd" clipRule="evenodd" d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24ZM16.032 15.588L9.41588 6.816H7.14695V17.184H8.95904V8.75261L15.203 17.077C15.4889 16.6193 15.7782 16.1161 16.032 15.588ZM16.9525 6.816H15.1404V17.184H16.9525V6.816Z" fill="currentColor"/>
  },
  {
    name: "React",
    category: "library",
    svg: <path d="M11.854.912c-3.136 0-6.198 1.156-8.528 3.23-2.327 2.071-3.664 4.887-3.664 7.858 0 2.97 1.337 5.787 3.664 7.857 2.33 2.074 5.392 3.231 8.528 3.231s6.198-1.157 8.529-3.231c2.326-2.07 3.663-4.887 3.663-7.857 0-2.971-1.337-5.787-3.663-7.858-2.331-2.074-5.393-3.23-8.529-3.23zm0 2.217c2.56 0 5.06.945 6.963 2.64 1.9 1.691 2.99 3.988 2.99 6.231s-1.09 4.54-2.99 6.23c-1.903 1.696-4.403 2.641-6.963 2.641-2.561 0-5.061-.945-6.964-2.641-1.9-1.69-2.99-3.987-2.99-6.23 0-2.243 1.09-4.54 2.99-6.231 1.903-1.695 4.403-2.64 6.964-2.64zm0 6.643c-1.2 0-2.17.971-2.17 2.172 0 1.2.97 2.172 2.17 2.172 1.2 0 2.172-.972 2.172-2.172 0-1.201-.972-2.172-2.172-2.172z" fill="currentColor"/>
  },
  {
    name: "TypeScript",
    category: "language",
    svg: <path d="M1.5 1.5v21h21v-21h-21zm11.373 9.475c-.347-.384-.962-.703-1.85-.703-1.328 0-2.187.876-2.187 2.126 0 2.193 3.655 1.77 3.655 4.542 0 1.636-1.328 2.505-2.887 2.505-1.284 0-2.227-.47-2.813-1.127l1.042-1.353c.477.502 1.157.942 1.83.942 1.05 0 1.554-.601 1.554-1.282 0-2.09-3.655-1.724-3.655-4.595 0-1.6 1.258-2.52 2.766-2.52 1.158 0 1.947.382 2.455.877l-1.092 1.353zm-6.685-1.425v9.117h-1.688v-9.117h-2.502v-1.488h6.685v1.488h-2.495z" fill="currentColor"/>
  },
  {
    name: "JavaScript",
    category: "language",
    svg: <path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.463.675-.63 1.124-.601.593.042 1.085.342 1.455.706l1.246-1.517c-.779-.766-1.789-1.206-2.909-1.286-1.62-.123-3.136.634-3.765 2.05-.386.877-.386 1.867-.03 2.72.378.887 1.173 1.565 2.152 1.94 1.344.516 2.08.795 2.302 1.313.125.297.108.647-.075.908-.24.341-.75.525-1.228.484-.71-.057-1.393-.417-1.841-.954l-1.334 1.405c.828 1.01 2.052 1.637 3.376 1.705 1.55.08 3.013-.67 3.655-2.072.482-.982.497-2.146.035-3.127zm-7.669 3.076l1.834-1.81V8.653h-1.834v12.7z" fill="currentColor"/>
  },
  {
    name: "HTML5",
    category: "markup",
    svg: <path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm17.09 4.16l-.298-3.35H5.71l-.165 1.85h11.23l-.165 1.849H5.875l-.165 1.85h10.9l-.513 5.753-4.12 1.135-4.12-1.135-.264-2.96H5.711l.462 5.198 5.804 1.61 5.805-1.61.76-8.528H7.954l.115-1.285h10.52z" fill="currentColor"/>
  },
  {
    name: "CSS3",
    category: "styling",
    svg: <path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm17.09 4.16H5.71l.165 1.85h11.066l-.165 1.849H6.04l.165 1.85h10.57l-.513 5.753-4.12 1.135-4.12-1.135-.264-2.96H5.711l.462 5.198 5.804 1.61 5.805-1.61.76-8.528z" fill="currentColor"/>
  },
  {
    name: "Tailwind CSS",
    category: "styling",
    svg: <path d="M12 6.5C14.5 3.5 17.5 3.5 19.5 5.5C21.5 7.5 21.5 10.5 19 13.5C16.5 16.5 13.5 16.5 11.5 14.5C9.5 12.5 9.5 9.5 12 6.5ZM5 10.5C7.5 7.5 10.5 7.5 12.5 9.5C14.5 11.5 14.5 14.5 12 17.5C9.5 20.5 6.5 20.5 4.5 18.5C2.5 16.5 2.5 13.5 5 10.5Z" fill="currentColor"/>
  },
  {
    name: "Vercel",
    category: "deployment",
    svg: <path fillRule="evenodd" clipRule="evenodd" d="M12 2L24 22H0L12 2Z" fill="currentColor"/>
  },
  {
    name: "PWA",
    category: "architecture",
    svg: <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  },
  {
    name: "Laravel",
    category: "framework",
    svg: <path d="M12 2l10 5v10l-10 5-10-5V7l10-5zm0 2.8l-7.5 3.75v7.5L12 19.8l7.5-3.75v-7.5L12 4.8z" fill="currentColor"/>
  },
  {
    name: "PHP",
    category: "language",
    svg: <path d="M2.5 12C2.5 8.96243 8.32843 6.5 12 6.5C15.6716 6.5 21.5 8.96243 21.5 12C21.5 15.0376 15.6716 17.5 12 17.5C8.32843 17.5 2.5 15.0376 2.5 12Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  },
  {
    name: "Python",
    category: "language",
    svg: <path d="M11.96 1.026c-6.264 0-7.1 2.744-7.1 2.744v3.153h7.243v.756H4.267s-3.328-.286-3.328 4.562c0 4.85 2.816 4.743 2.816 4.743h1.564v-3.4s-.136-4.256 4.34-4.256h5.053s4.04-.112 4.04-3.83c0-3.716-2.753-4.472-6.804-4.472zM9.56 2.836a.91.91 0 110 1.819.91.91 0 010-1.819zm10.153 6.942c0-4.85-2.816-4.743-2.816-4.743h-1.565v3.4s.137 4.256-4.34 4.256H5.94s-4.04.112-4.04 3.83c0 3.716 2.753 4.471 6.805 4.471 6.264 0 7.1-2.743 7.1-2.743v-3.154h-7.243v-.755h7.836s3.328.286 3.328-4.562z" fill="currentColor"/>
  },
  {
    name: "C",
    category: "language",
    svg: <path d="M17 7C15.5 5.5 13.5 4.5 11 4.5C6.5 4.5 3 8 3 12.5C3 17 6.5 20.5 11 20.5C13.5 20.5 15.5 19.5 17 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
  },
  {
    name: "Java",
    category: "language",
    svg: <path d="M16 14C16 16.5 13.5 18 10 18C6.5 18 4 16.5 4 14C4 11.5 6.5 10 10 10C13.5 10 16 11.5 16 14ZM16 14H19C20.5 14 21 12.5 21 11C21 9.5 20.5 8 19 8H15V4M10 22C14 22 18 21 18 20.5C18 20 14 19 10 19C6 19 2 20 2 20.5C2 21 6 22 10 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  },
  {
    name: "MySQL",
    category: "database",
    svg: <path d="M20 7C20 8.65685 16.4183 10 12 10C7.58172 10 4 8.65685 4 7M4 7C4 5.34315 7.58172 4 12 4C16.4183 4 20 5.34315 20 7M4 7V17C4 18.6569 7.58172 20 12 20C16.4183 20 20 18.6569 20 17V7M4 12C4 13.6569 7.58172 15 12 15C16.4183 15 20 13.6569 20 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  },
  {
    name: "Kali Linux",
    category: "OS",
    svg: <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  },
  {
    name: "Cisco Packet Tracer",
    category: "infrastructure",
    svg: <path d="M4.5 12V6.5h2V12h-2zm4 4V3.5h2V16h-2zm4 4.5V1.5h2v19h-2zm4-4.5V3.5h2V16h-2zm4-4V6.5h2V12h-2z" fill="currentColor"/>
  },
  {
    name: "Nmap",
    category: "security",
    svg: <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  },
  {
    name: "Snort IDS",
    category: "security",
    svg: <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  },
  {
    name: "Suricata",
    category: "security",
    svg: <path d="M12 4L4 8v6c0 5 8 8 8 8s8-3 8-8V8l-8-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  },
  {
    name: "OBS Studio",
    category: "media",
    svg: <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" fill="none"/>
  },
  {
    name: "Lightroom",
    category: "media",
    svg: <path d="M6 6H18V18H6V6ZM10 14H15M10 10V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  }
];

export default function TechStack() {
  return (
    <section id="stack" aria-labelledby="stack-title" className="relative z-10 w-full overflow-hidden border-y border-butter/10 bg-black/40 px-4 py-16 sm:px-6 md:px-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-4 md:mb-12 md:flex-row md:items-end">
          <div>
            <span className="mb-2 block font-mono text-xs tracking-[0.2em] text-accentRed uppercase">Sys_Config //</span>
            <h2 id="stack-title" className="font-display text-3xl font-black tracking-tight uppercase sm:text-4xl md:text-5xl">
              Technology Stack
            </h2>
          </div>
          <p className="max-w-xs font-mono text-xs uppercase opacity-60 md:text-right">Verified protocols and frameworks governing host operations.</p>
        </div>

        <ul className="flex flex-wrap items-center justify-start gap-2 sm:gap-3 md:gap-4">
          {techBadges.map((tech, i) => (
            <li
              key={tech.name}
              {...reveal("scale", i * 25)}
              className="group interactive flex items-center gap-2.5 rounded-sm border border-butter/20 bg-marine/80 px-3 py-2 transition-colors duration-300 hover:border-accentRed hover:bg-accentRed/5 sm:gap-3 sm:px-4 sm:py-2.5"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 text-butter transition-colors group-hover:text-accentRed sm:h-5 sm:w-5">
                {tech.svg}
              </svg>
              <span className="font-mono text-[11px] font-bold tracking-wide text-butter/90 uppercase transition-colors group-hover:text-butter sm:text-xs">
                {tech.name}
              </span>
            </li>
          ))}
        </ul>

        <Link
          href="/systems"
          className="interactive mt-10 inline-flex items-center gap-2 border-b border-accentRed pb-1 font-mono text-xs tracking-widest text-accentRed uppercase transition-colors hover:text-butter"
        >
          See it deployed → /systems
        </Link>
      </div>
    </section>
  );
}
