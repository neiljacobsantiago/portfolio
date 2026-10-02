"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CustomCursor() {
  // useMotionValue tracks values outside of React's render cycle for extreme performance
  const cursorX = useMotionValue(-100);
  const cursorXSpring = useSpring(cursorX, { damping: 30, stiffness: 700 });
  
  const cursorY = useMotionValue(-100);
  const cursorYSpring = useSpring(cursorY, { damping: 30, stiffness: 700 });
  
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      // Offset by a few pixels so the actual click point is exactly at the tip of the arrow
      cursorX.set(e.clientX - 2); 
      cursorY.set(e.clientY - 2);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Triggers the animation when hovering over interactive elements
      if (target.closest('.interactive, a, button, input, textarea')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener("mousemove", moveCursor);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, [cursorX, cursorY, isVisible]);

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-[999999]"
      style={{
        x: cursorXSpring,
        y: cursorYSpring,
        opacity: isVisible ? 1 : 0 // Hides the cursor until the mouse first moves
      }}
      animate={{
        scale: isHovering ? 1.4 : 1,
        rotate: isHovering ? 15 : 0,
      }}
      transition={{ type: "tween", duration: 0.15 }}
    >
      {/* Cyberpunk Arrowhead SVG */}
      <svg 
        width="28" 
        height="28" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_8px_rgba(229,26,26,0.8)]"
      >
        <path 
          d="M3 2L21 12L3 22L7 12L3 2Z" 
          fill="#E51A1A" 
          stroke="#FFFA8A" 
          strokeWidth="1" 
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}