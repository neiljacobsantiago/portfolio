// The car's sound, synthesised with Web Audio (no files to download): a
// high-revving engine note that follows the gearbox, with a rasp on load,
// a torque-cut dip on every upshift and a throttle blip on each downshift,
// crackle on the overrun, a turbo whine on throttle, tyre scrub at the limit,
// kerb rumble, wall impacts, the start-light beeps and lights out, the DRS
// flap, and chimes for sectors, laps and trophies.

export interface DriveAudio {
  update: (s: { rpm: number; throttle: number; slip: number; kerb: boolean; speed: number; brake?: number }) => void;
  impact: (strength: number) => void;
  /** One more start light (1–5), or lights out (0). */
  light: (n: number) => void;
  drs: (open: boolean) => void;
  /** A gear change: up (torque cut) or down (blip). */
  shift: (up?: boolean) => void;
  chime: (kind: "sector" | "best" | "lap" | "trophy" | "warn") => void;
  setMuted: (muted: boolean) => void;
  suspend: () => void;
  resume: () => void;
  dispose: () => void;
}

export function createAudio(): DriveAudio | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);

  // Engine: two slightly detuned saws for the bark, a square an octave down
  // for body, through a resonant low-pass that opens with the throttle and a
  // soft clipper that adds rasp under load; a shift stage dips for upshifts
  const engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  const shiftGain = ctx.createGain();
  shiftGain.gain.value = 1;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 3;
  const drive = ctx.createGain();
  drive.gain.value = 1;
  const shaper = ctx.createWaveShaper();
  {
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2);
    }
    shaper.curve = curve;
    shaper.oversample = "2x";
  }
  const o1 = ctx.createOscillator();
  o1.type = "sawtooth";
  const o1b = ctx.createOscillator();
  o1b.type = "sawtooth";
  const o1bg = ctx.createGain();
  o1bg.gain.value = 0.6;
  const o2 = ctx.createOscillator();
  o2.type = "square";
  const o2g = ctx.createGain();
  o2g.gain.value = 0.5;
  const o3 = ctx.createOscillator();
  o3.type = "triangle";
  o1.connect(filter);
  o1b.connect(o1bg);
  o1bg.connect(filter);
  o2.connect(o2g);
  o2g.connect(filter);
  o3.connect(filter);
  filter.connect(drive);
  drive.connect(shaper);
  shaper.connect(shiftGain);
  shiftGain.connect(engineGain);
  engineGain.connect(master);
  // Turbo: a thin sine high above
  const turbo = ctx.createOscillator();
  turbo.type = "sine";
  const turboGain = ctx.createGain();
  turboGain.gain.value = 0;
  turbo.connect(turboGain);
  turboGain.connect(master);
  for (const o of [o1, o1b, o2, o3, turbo]) o.start();

  // Noise for scrub, rumble, impacts and the DRS whoosh
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const loop = (type: BiquadFilterType, freq: number, q: number) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start();
    return g;
  };
  const scrub = loop("bandpass", 1600, 5);
  const rumble = loop("lowpass", 160, 1);
  const wind = loop("bandpass", 600, 0.6);

  const now = () => ctx.currentTime;
  const tone = (freq: number, start: number, dur: number, type: OscillatorType, vol: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.01);
    g.gain.setValueAtTime(vol, start + dur - 0.03);
    g.gain.linearRampToValueAtTime(0, start + dur);
    o.connect(g);
    g.connect(master);
    o.start(start);
    o.stop(start + dur + 0.02);
  };
  const burst = (start: number, dur: number, type: BiquadFilterType, freq: number, vol: number) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0008, start + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(start, Math.random() * 0.6, dur + 0.05);
  };

  let lastImpact = 0;
  let kerbPhase = 0;
  let blipUntil = 0;
  let lastCrackle = 0;
  return {
    update({ rpm, throttle, slip, kerb, speed }) {
      const t = now();
      // Six cylinders: three firing pulses per revolution (heard an octave down)
      const f = (rpm / 60) * 1.5;
      o1.frequency.setTargetAtTime(f, t, 0.025);
      o1b.frequency.setTargetAtTime(f * 1.006, t, 0.025);
      o2.frequency.setTargetAtTime(f * 0.5, t, 0.025);
      o3.frequency.setTargetAtTime(f * 2.01, t, 0.025);
      const blip = t < blipUntil ? 1 : 0;
      const th = Math.max(0, throttle, blip * 0.8);
      filter.frequency.setTargetAtTime(450 + rpm * 0.12 + th * 1900, t, 0.04);
      drive.gain.setTargetAtTime(0.8 + th * 1.6, t, 0.05);
      engineGain.gain.setTargetAtTime(0.03 + th * 0.045 + Math.min(0.03, rpm / 400000), t, 0.06);
      // Overrun: off the throttle at high revs the exhaust crackles
      if (throttle < 0.05 && rpm > 7500 && speed > 15 && t - lastCrackle > 0.05 && Math.random() < 0.22) {
        lastCrackle = t;
        burst(t, 0.025 + Math.random() * 0.03, "bandpass", 900 + Math.random() * 2200, 0.025 + Math.random() * 0.03);
      }
      turbo.frequency.setTargetAtTime(2600 + rpm * 0.25, t, 0.1);
      turboGain.gain.setTargetAtTime(th * 0.008 * Math.min(1, rpm / 9000), t, 0.15);
      scrub.gain.setTargetAtTime(Math.min(0.09, Math.max(0, slip - 0.15) * 0.25), t, 0.05);
      kerbPhase += 1;
      rumble.gain.setTargetAtTime(kerb ? 0.22 + (kerbPhase % 2) * 0.08 : 0, t, 0.03);
      wind.gain.setTargetAtTime(Math.min(0.05, (speed / 90) ** 2 * 0.05), t, 0.2);
    },
    impact(strength) {
      const t = now();
      if (t - lastImpact < 0.1 || strength < 1.5) return;
      lastImpact = t;
      burst(t, 0.3, "lowpass", 260 + Math.min(900, strength * 50), Math.min(0.55, 0.08 + strength * 0.02));
      tone(70, t, 0.12, "sine", Math.min(0.3, strength * 0.015));
    },
    light(n) {
      const t = now();
      if (n > 0) tone(880, t, 0.12, "square", 0.05);
      else tone(1320, t, 0.35, "square", 0.06);
    },
    drs(open) {
      const t = now();
      burst(t, 0.25, "highpass", open ? 2200 : 1200, 0.06);
    },
    shift(up = true) {
      const t = now();
      if (up) {
        // The torque cut: a short dip in the note, a click from the gearbox
        shiftGain.gain.cancelScheduledValues(t);
        shiftGain.gain.setValueAtTime(1, t);
        shiftGain.gain.linearRampToValueAtTime(0.35, t + 0.015);
        shiftGain.gain.linearRampToValueAtTime(1, t + 0.085);
        burst(t, 0.05, "bandpass", 1100, 0.045);
      } else {
        // Downshift: a throttle blip and a pop
        blipUntil = t + 0.11;
        burst(t + 0.02, 0.04, "bandpass", 700 + Math.random() * 800, 0.05);
      }
    },
    chime(kind) {
      const t = now();
      const notes = kind === "best" ? [784, 988, 1175, 1568] : kind === "lap" ? [880, 1175] : kind === "trophy" ? [988, 1319, 1760] : kind === "warn" ? [440, 330] : [1175];
      notes.forEach((n, i) => tone(n, t + i * 0.08, kind === "warn" ? 0.2 : 0.14, kind === "warn" ? "square" : "sine", kind === "warn" ? 0.04 : 0.06));
    },
    setMuted(muted) {
      master.gain.setTargetAtTime(muted ? 0 : 0.5, now(), 0.05);
    },
    suspend() {
      void ctx.suspend();
    },
    resume() {
      void ctx.resume();
    },
    dispose() {
      void ctx.close();
    },
  };
}
