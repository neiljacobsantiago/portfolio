"use client";

import { motion, useScroll, useTransform } from "framer-motion";

export default function HeroSection() {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden px-6">
      <motion.div style={{ y: heroY }} className="text-center z-10 flex flex-col items-center">
        <h1 className="font-display text-[8vw] leading-[0.85] font-black uppercase tracking-tighter mix-blend-difference">
          Neil Jacob
          <br />
          Santiago
        </h1>
        <div className="mt-8 flex items-center space-x-4 opacity-80">
          <span className="font-mono text-sm tracking-widest uppercase">Production Director</span>
          <span className="w-2 h-2 bg-accentRed rounded-full" />
          <span className="font-mono text-sm tracking-widest uppercase">UI/UX Designer</span>
          <span className="w-2 h-2 bg-accentRed rounded-full" />
          <span className="font-mono text-sm tracking-widest uppercase">Network Engineer</span>
        </div>
      </motion.div>
      
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-butter/20 via-marine to-marine" />
    </section>
  );
}