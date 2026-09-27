"use client";

import SpringCard from "@/components/ui/SpringCard";

export default function FeaturedPortals() {
  return (
    <section className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-24 font-mono uppercase text-sm tracking-widest border-b border-butter/20 pb-12">
        <div className="flex flex-col"><span className="text-5xl font-display text-accentRed mb-2 font-black">14</span> Deployed Projects</div>
        <div className="flex flex-col"><span className="text-5xl font-display text-accentRed mb-2 font-black">7</span> Blog Entries</div>
        <div className="flex flex-col"><span className="text-5xl font-display text-accentRed mb-2 font-black">3</span> Certifications</div>
        <div className="flex flex-col"><span className="text-5xl font-display text-accentRed mb-2 font-black">1</span> Unified Portfolio</div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <SpringCard title="Systems & Web" subtitle="Interface Design / Linux Configurations / Network Architecture" />
        <SpringCard title="Multimedia" subtitle="Event Photography / Production Direction / OPM Concert Coverage" />
      </div>
    </section>
  );
}