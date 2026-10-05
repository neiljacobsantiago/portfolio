"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function NavBar() {
  const pathname = usePathname();

  const internalLinks = [
    { name: "Root", path: "/" },
    { name: "Systems", path: "/systems" },
    { name: "Media", path: "/media" },
    { name: "Gear", path: "/gear" },
    { name: "Clearance", path: "/clearance" },
    { name: "Terminal", path: "/terminal" },
    { name: "Contact", path: "/contact" },
    { name: "Logs", path: "/logs" }
  ];

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: "circOut" }}
      className="fixed top-0 left-0 w-full z-[50] bg-marine/80 backdrop-blur-md border-b border-butter/10"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-16 h-20 flex items-center justify-between">
        
        {/* Brand */}
        <Link href="/" className="group flex flex-col interactive">
          <span className="font-display font-black text-2xl tracking-tighter text-accentRed uppercase group-hover:text-butter transition-colors">
            Neil.Jacob
          </span>
          <span className="font-mono text-[8px] uppercase tracking-widest text-butter/50">
            Sys_Admin
          </span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8">
          {internalLinks.map((link) => {
            const isActive = pathname === link.path;
            return (
              <Link 
                key={link.name} 
                href={link.path}
                className="relative group interactive"
              >
                <span className={`font-mono text-xs tracking-widest uppercase transition-colors ${isActive ? 'text-accentRed' : 'text-butter/60 group-hover:text-butter'}`}>
                  {link.name}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="navIndicator"
                    className="absolute -bottom-2 left-0 right-0 h-[2px] bg-accentRed"
                  />
                )}
              </Link>
            );
          })}
        </div>
        
      </div>
    </motion.nav>
  );
}