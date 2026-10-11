"use client";

import { useSyncExternalStore } from "react";

export interface DeviceProfile {
  /** Mouse/trackpad user: enables the custom cursor and hover-only effects. */
  finePointer: boolean;
  reducedMotion: boolean;
  /** Budget hardware, Data Saver, or reduced motion: skip ambient animation. */
  lowPower: boolean;
  /** Laptop/desktop width: enables pinned, scroll-driven scenes. */
  desktop: boolean;
}

// Server render and first client render assume the simplest experience,
// so nothing heavy flashes in before the real profile is known.
const SERVER_PROFILE: DeviceProfile = { finePointer: false, reducedMotion: false, lowPower: true, desktop: false };

const QUERIES = {
  finePointer: "(hover: hover) and (pointer: fine)",
  reducedMotion: "(prefers-reduced-motion: reduce)",
  desktop: "(min-width: 1024px)",
};

let cached: DeviceProfile | null = null;

function readProfile(): DeviceProfile {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const reducedMotion = matchMedia(QUERIES.reducedMotion).matches;
  const weakHardware = (nav.deviceMemory ?? 8) <= 2 || (nav.hardwareConcurrency ?? 8) <= 2;
  const constrainedNetwork = !!nav.connection?.saveData || /(^|-)2g$/.test(nav.connection?.effectiveType ?? "");
  return {
    finePointer: matchMedia(QUERIES.finePointer).matches,
    reducedMotion,
    lowPower: reducedMotion || weakHardware || constrainedNetwork,
    desktop: matchMedia(QUERIES.desktop).matches,
  };
}

function getSnapshot() {
  return (cached ??= readProfile());
}

function subscribe(onChange: () => void) {
  const lists = Object.values(QUERIES).map((q) => matchMedia(q));
  const handler = () => {
    cached = readProfile();
    onChange();
  };
  lists.forEach((l) => l.addEventListener("change", handler));
  return () => lists.forEach((l) => l.removeEventListener("change", handler));
}

export function useDeviceProfile(): DeviceProfile {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_PROFILE);
}
