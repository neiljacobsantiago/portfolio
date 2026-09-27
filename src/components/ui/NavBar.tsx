"use client";

import { useEffect, useState } from "react";

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-marine/90 backdrop-blur-md border-b border-butter/10 py-4" : "bg-transparent py-6"} px-6 md:px-12 flex flex-col md:flex-row justify-between items-start md:items-center font-mono text-xs uppercase tracking-widest text-butter`}>
      <div className="flex flex-col mb-4 md:mb-0">
        <span className="font-bold">Neil Jacob Santiago</span>
        <span className="opacity-60">Network Systems & Infrastructure Engineering</span>
      </div>
      <div className="flex space-x-6 md:space-x-12">
        <a href="#about" onClick={(e) => handleNavClick(e, 'about')} className="interactive transition-colors hover:text-accentRed">About</a>
        <a href="#skills" onClick={(e) => handleNavClick(e, 'skills')} className="interactive transition-colors hover:text-accentRed">Skills</a>
        <a href="#systems" onClick={(e) => handleNavClick(e, 'systems')} className="interactive transition-colors hover:text-accentRed">Systems</a>
        <a href="#media" onClick={(e) => handleNavClick(e, 'media')} className="interactive transition-colors hover:text-accentRed">Media</a>
      </div>
    </nav>
  );
}