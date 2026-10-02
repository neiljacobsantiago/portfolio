"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const internalLinks = [
    { name: "Root", path: "/" },
    { name: "Systems", path: "/systems" },
    { name: "Media", path: "/media" },
    { name: "Gear", path: "/gear" },
    { name: "Clearance", path: "/clearance" },
    { name: "Terminal", path: "/terminal" }
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 w-full z-[999] transition-all duration-300 ${
        scrolled ? "py-4 bg-marine/90 backdrop-blur-xl border-b border-butter/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" : "py-8 bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-16 flex justify-between items-center">
        <Link href="/" className="flex flex-col group interactive cursor-none">
          <span className="font-display font-black text-xl tracking-tighter text-accentRed group-hover:text-butter transition-colors">
            NEIL.JACOB
          </span>
          <span className="font-mono text-[8px] uppercase tracking-widest opacity-50">Sys_Admin</span>
        </Link>

        {/* Desktop Direct Links */}
        <div className="hidden md:flex space-x-6 font-mono text-xs tracking-widest uppercase opacity-90">
          {internalLinks.map((item) => (
            <Link 
              key={item.name}
              href={item.path} 
              className={`interactive cursor-none relative group px-2 py-1 transition-colors ${pathname === item.path ? "text-accentRed font-bold" : "hover:text-accentRed text-butter/70"}`}
            >
              {item.name}
              {pathname === item.path && <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-accentRed" />}
            </Link>
          ))}
        </div>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden text-butter" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="absolute top-full left-0 w-full bg-marine/95 backdrop-blur-xl border-b border-butter/10 md:hidden flex flex-col font-mono text-sm uppercase tracking-widest">
          {internalLinks.map((item) => (
            <Link key={item.name} href={item.path} onClick={() => setMenuOpen(false)} className="p-4 border-b border-butter/5 hover:bg-butter/10 hover:text-accentRed transition-colors">
              {item.name}
            </Link>
          ))}
        </motion.div>
      )}
    </motion.nav>
  );
}