"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if hovering over anything clickable
      if (target.closest('button, a, input, [class*="interactive"], [role="button"]')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener("mousemove", updateMousePosition);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  return (
    <>
      {/* Brutal global override to ensure the system cursor NEVER shows up */}
      <style jsx global>{`
        *, *::before, *::after {
          cursor: none !important;
        }
      `}</style>

      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[10000]"
        animate={{
          x: mousePosition.x,
          y: mousePosition.y,
          scale: isHovering ? 1.4 : 1,
          rotate: isHovering ? 15 : 0,
        }}
        transition={{ type: "tween", ease: "backOut", duration: 0.15 }}
        style={{ translateX: "-20%", translateY: "-20%" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_10px_rgba(255,250,138,0.6)]">
          <path 
            d="M5.5 3L18.5 13.5L12 14.5L10 20L5.5 3Z" 
            fill={isHovering ? "#E51A1A" : "#FFFA8A"} 
            stroke={isHovering ? "#FFFA8A" : "#0A1128"} 
            strokeWidth="1.5" 
            strokeLinejoin="round"
            className="transition-colors duration-200"
          />
        </svg>
      </motion.div>
    </>
  );
}