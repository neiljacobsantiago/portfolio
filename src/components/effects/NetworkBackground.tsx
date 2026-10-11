"use client";

import { useEffect, useRef, useState } from "react";
import { useDeviceProfile } from "@/lib/device";
import { cn } from "@/lib/utils";

const PACKETS = ["0x7F4C // SYN_ACK", "0x88A // ROUTE_OSPF", "0x912 // KALI_SEC_AUDIT", "0x43F // TRACE_ROUTE", "0x11B // HANDSHAKE_OK", "ERROR // DROP_PACKET"];

/**
 * Fixed decorative network mesh. On low-power devices (budget phones, Data Saver,
 * reduced motion) it renders as a static SVG: no parallax, no SMIL, no timers.
 */
export default function NetworkBackground({ className }: { className?: string }) {
  const { lowPower } = useDeviceProfile();
  const animate = !lowPower;
  const layer1 = useRef<HTMLDivElement>(null);
  const layer2 = useRef<HTMLDivElement>(null);
  const [packet, setPacket] = useState(PACKETS[0]);

  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - innerHeight || 1;
      const p = Math.min(1, scrollY / max);
      layer1.current?.style.setProperty("transform", `translate3d(0, ${-30 * p}%, 0)`);
      layer2.current?.style.setProperty("transform", `translate3d(0, ${40 * p}%, 0)`);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", onScroll, { passive: true });

    let i = 0;
    const timer = setInterval(() => {
      if (document.hidden) return;
      i = (i + 1) % PACKETS.length;
      setPacket(PACKETS[i]);
    }, 2400);

    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", onScroll);
      clearInterval(timer);
    };
  }, [animate]);

  return (
    <div aria-hidden className={cn("pointer-events-none fixed inset-0 z-0 overflow-hidden", className)}>
      {/* CRT scanline interlace */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[size:100%_4px] opacity-20" />

      <div className="absolute bottom-6 left-4 font-mono text-[10px] tracking-widest text-accentRed uppercase opacity-40 md:top-24 md:bottom-auto md:left-8">
        [SYS_LOG: {packet}]
      </div>

      <div ref={layer1} className="absolute inset-0 opacity-50 will-change-transform">
        <svg className="h-[200%] w-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
          <path d="M 100 100 L 400 250 L 850 150 L 700 800 L 200 600 Z" fill="none" stroke="#FFFA8A" strokeWidth="2" strokeDasharray="10 10">
            {animate && <animate attributeName="stroke-dashoffset" values="0;100" dur="20s" repeatCount="indefinite" />}
          </path>
          <path d="M 400 250 L 200 600 M 850 150 L 500 500 L 700 800" fill="none" stroke="#E51A1A" strokeWidth="1.5" strokeDasharray="4 8" opacity="0.7">
            {animate && <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />}
          </path>
          <circle cx="100" cy="100" r="8" fill="#E51A1A" />
          <circle cx="400" cy="250" r="6" fill="#FFFA8A" />
          <circle cx="850" cy="150" r="10" fill="#E51A1A" />
          <circle cx="200" cy="600" r="8" fill="#FFFA8A" />
          <circle cx="700" cy="800" r="6" fill="#E51A1A" />
          <circle cx="500" cy="500" r="5" fill="#FFFA8A" />
        </svg>
      </div>

      <div ref={layer2} className="absolute inset-0 opacity-20 will-change-transform">
        <svg className="h-[200%] w-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
          <path d="M 750 50 L 150 400 L 500 900 L 900 500 Z" fill="none" stroke="#E51A1A" strokeWidth="2" strokeDasharray="5 15" />
          <circle cx="750" cy="50" r="4" fill="#FFFA8A">
            {animate && <animate attributeName="opacity" values="0.1;0.9;0.1" dur="1s" repeatCount="indefinite" />}
          </circle>
          <circle cx="150" cy="400" r="7" fill="#E51A1A" />
          <circle cx="900" cy="500" r="4" fill="#FFFA8A" />
          <circle cx="500" cy="900" r="7" fill="#E51A1A" />
        </svg>
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#021124_90%)]" />
    </div>
  );
}
