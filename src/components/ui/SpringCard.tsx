"use client";

import React, { useRef } from "react";
import { useSpring, animated } from "@react-spring/web";

interface SpringCardProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

const calc = (x: number, y: number, rect: DOMRect) => [
  -(y - rect.top - rect.height / 2) / 10,
  (x - rect.left - rect.width / 2) / 10,
  1.05,
];
const trans = (x: number, y: number, s: number) =>
  `perspective(600px) rotateX(${x}deg) rotateY(${y}deg) scale(${s})`;

export default function SpringCard({ title, subtitle, children }: SpringCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [props, set] = useSpring(() => ({
    xys: [0, 0, 1],
    config: { mass: 5, tension: 350, friction: 40 },
  }));

  return (
    <animated.div
      ref={ref}
      className="interactive relative w-full h-80 bg-marine border border-butter/20 rounded-none overflow-hidden group cursor-none"
      onMouseMove={(e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        set({ xys: calc(e.clientX, e.clientY, rect) });
      }}
      onMouseLeave={() => set({ xys: [0, 0, 1] })}
      style={{ transform: props.xys.to(trans) }}
    >
      <div className="absolute inset-0 bg-butter/0 group-hover:bg-butter transition-colors duration-500 z-0" />
      <div className="relative z-10 p-8 flex flex-col justify-end h-full group-hover:text-marine transition-colors duration-500">
        <h3 className="font-display text-4xl font-bold uppercase">{title}</h3>
        <p className="text-sm font-sans mt-2 opacity-80 group-hover:opacity-100">{subtitle}</p>
        {children}
      </div>
    </animated.div>
  );
}