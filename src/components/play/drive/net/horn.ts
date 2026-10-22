// A two-note car horn, synthesised (no files). Quieter the further away the
// car that honked is.

let ctx: AudioContext | null = null;

function context() {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

/** Volume from distance in metres: full up close, a faint toot across the circuit. */
export const hornVolume = (dist: number | null) => (dist == null ? 0.35 : Math.max(0.12, Math.min(1, 1 - (dist - 15) / 300)));

export function playHorn(volume = 1) {
  const c = context();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const t = c.currentTime + 0.01;
  const dur = 0.38;
  const out = c.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(0.12 * volume, t + 0.02);
  out.gain.setValueAtTime(0.12 * volume, t + dur - 0.06);
  out.gain.linearRampToValueAtTime(0, t + dur);
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  filter.connect(out);
  out.connect(c.destination);
  for (const f of [415, 523]) {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    o.connect(filter);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

export function disposeHorn() {
  void ctx?.close();
  ctx = null;
}
