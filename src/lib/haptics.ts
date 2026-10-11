/** A tiny tap of vibration on Android phones. Silently does nothing elsewhere. */
export function haptic(ms = 8) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator && matchMedia("(pointer: coarse)").matches) navigator.vibrate(ms);
  } catch {}
}
