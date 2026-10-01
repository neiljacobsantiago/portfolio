"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "py-4 bg-marine/80 backdrop-blur-xl border-b border-butter/10 shadow-lg" : "py-8 bg-transparent"
      }`}
      aria-label="Main Navigation"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-16 flex justify-between items-center">
        <a href="#" className="flex flex-col group interactive" aria-label="Neil Jacob Santiago Home">
          <span className="font-display font-black text-xl tracking-tighter text-accentRed group-hover:text-butter transition-colors">
            NEIL.JACOB
          </span>
          <span className="font-mono text-[8px] uppercase tracking-widest opacity-50">Sys_Admin</span>
        </a>

        <div className="hidden md:flex space-x-8 font-mono text-xs tracking-widest uppercase opacity-80" role="menubar">
          <a href="#about" role="menuitem" className="hover:text-accentRed transition-colors interactive">About</a>
          <a href="#systems" role="menuitem" className="hover:text-accentRed transition-colors interactive">Systems</a>
          <a href="#github" role="menuitem" className="hover:text-accentRed transition-colors interactive">Commits</a>
          <a href="#media" role="menuitem" className="hover:text-accentRed transition-colors interactive">Media</a>
        </div>
      </div>
    </motion.nav>
  );
}