"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";

export default function NetworkBackground() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  
  const yLayer1 = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const yLayer2 = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);

  // Simulated live data stream text for glitch texture
  const [packetStream, setPacketStream] = useState("0x7F4C // SYN_ACK");
  useEffect(() => {
    const packets = ["0x88A // ROUTE_OSPF", "0x912 // KALI_SEC_AUDIT", "0x43F // TRACE_ROUTE", "0x11B // HANDSHAKE_OK", "ERROR // DROP_PACKET"];
    const interval = setInterval(() => {
      setPacketStream(packets[Math.floor(Math.random() * packets.length)]);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-marine">
      {/* Grid Base with CRT Scanline Interlace */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,250,138,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,250,138,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[size:100%_4px] opacity-20" />

      {/* Live Glitch Packet Stream Indicator */}
      <div className="absolute top-8 left-8 font-mono text-[10px] text-accentRed tracking-widest uppercase opacity-40 animate-pulse">
        [SYS_LOG: {packetStream}]
      </div>

      {/* Layer 1: Foreground Glitch Nodes */}
      <motion.div style={{ y: yLayer1 }} className="absolute inset-0 opacity-50">
        <svg className="w-full h-[200%]" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <path d="M 100 100 L 400 250 L 850 150 L 700 800 L 200 600 Z" fill="none" stroke="#FFFA8A" strokeWidth="2" strokeDasharray="10 10">
            <animate attributeName="stroke-dashoffset" values="0;100" dur="20s" repeatCount="indefinite" />
          </path>
          <path d="M 400 250 L 200 600 M 850 150 L 500 500 L 700 800" fill="none" stroke="#E51A1A" strokeWidth="1.5" strokeDasharray="4 8" opacity="0.7">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
          </path>
          
          <circle cx="100" cy="100" r="8" fill="#E51A1A" />
          <circle cx="400" cy="250" r="6" fill="#FFFA8A" />
          <circle cx="850" cy="150" r="10" fill="#E51A1A" />
          <circle cx="200" cy="600" r="8" fill="#FFFA8A" />
          <circle cx="700" cy="800" r="6" fill="#E51A1A" />
          <circle cx="500" cy="500" r="5" fill="#FFFA8A" />
        </svg>
      </motion.div>

      {/* Layer 2: Background Data Mesh */}
      <motion.div style={{ y: yLayer2 }} className="absolute inset-0 opacity-20">
        <svg className="w-full h-[200%]" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <path d="M 750 50 L 150 400 L 500 900 L 900 500 Z" fill="none" stroke="#E51A1A" strokeWidth="2" strokeDasharray="5 15" />
          <circle cx="750" cy="50" r="4" fill="#FFFA8A">
            <animate attributeName="opacity" values="0.1;0.9;0.1" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="150" cy="400" r="7" fill="#E51A1A" />
          <circle cx="900" cy="500" r="4" fill="#FFFA8A" />
          <circle cx="500" cy="900" r="7" fill="#E51A1A" />
        </svg>
      </motion.div>
      
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#021124_90%)] z-10 pointer-events-none" />
    </div>
  );
}