"use client";

import { useEffect, useState } from "react";
import { motion, useSpring } from "framer-motion";

export default function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false);
  
  const cursorX = useSpring(0, { stiffness: 800, damping: 35, mass: 0.1 });
  const cursorY = useSpring(0, { stiffness: 800, damping: 35, mass: 0.1 });

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      setIsHovering(!!target.closest("a, button, .interactive"));
    };

    window.addEventListener("mousemove", updateMousePosition);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, [cursorX, cursorY]);

  return (
    <motion.div
      className="fixed top-0 left-0 w-3 h-3 bg-butter rounded-full pointer-events-none z-[100] mix-blend-difference flex items-center justify-center"
      style={{
        x: cursorX,
        y: cursorY,
        translateX: "-50%",
        translateY: "-50%",
      }}
      animate={{
        scale: isHovering ? 2.5 : 1,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    />
  );
}