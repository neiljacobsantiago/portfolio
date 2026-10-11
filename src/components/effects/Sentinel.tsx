"use client";

import dynamic from "next/dynamic";
import { useDeviceProfile } from "@/lib/device";
import SentinelChrome from "./SentinelChrome";

// three.js + react-three-fiber (~250 KB) are only downloaded when we decide to use them.
const SentinelEye = dynamic(() => import("./SentinelEye"), { ssr: false, loading: () => <StaticSentinel /> });

/**
 * Hero visual. Capable, wide screens get the live WebGL eye; phones, budget
 * hardware, Data Saver and reduced-motion users get a zero-cost SVG version.
 */
export default function Sentinel() {
  const { lowPower, wide } = useDeviceProfile();
  return !lowPower && wide ? <SentinelEye /> : <StaticSentinel />;
}

function StaticSentinel() {
  return (
    <div className="relative flex aspect-square w-full max-w-[16rem] items-center justify-center sm:max-w-sm" aria-hidden>
      <svg viewBox="0 0 200 200" className="h-3/4 w-3/4">
        <circle cx="100" cy="100" r="92" fill="none" stroke="#FFFA8A" strokeOpacity="0.3" strokeDasharray="2 6" />
        <circle cx="100" cy="100" r="40" fill="#0A192F" stroke="#FFFA8A" strokeOpacity="0.15" />
        <circle cx="100" cy="100" r="16" fill="none" stroke="#E51A1A" strokeWidth="4" />
        <circle cx="100" cy="100" r="10" fill="#FFFA8A" />
      </svg>
      <SentinelChrome label="Sentinel Core // Low-Power Mode" />
    </div>
  );
}
