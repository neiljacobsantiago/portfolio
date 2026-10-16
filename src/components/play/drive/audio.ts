// Island Drive's sound, synthesised with Web Audio (no files to download):
// an engine note that follows the speed, a two-tone jeepney horn, tyre
// screech when drifting, thuds for collisions, a chime for packets, and a
// voice for each prop you can knock over (wooden pins clack, cones bonk,
// crates thunk, drums clang, balls boing) plus a fanfare for a strike.

export type KnockKind = "pin" | "cone" | "crate" | "drum" | "ball";

export interface DriveAudio {
  update: (s: { speed: number; throttle: number; slip: number; boost: boolean }) => void;
  horn: () => void;
  impact: (strength: number) => void;
  /** A prop being hit: by the jeepney, or by something else (another prop, the ground). */
  knock: (kind: KnockKind, strength: number) => void;
  strike: () => void;
  chime: (big?: boolean) => void;
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
  master.gain.value = 0.55;
  master.connect(ctx.destination);

  // Engine: two detuned oscillators through a low-pass filter
  const engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 600;
  filter.Q.value = 2;
  const o1 = ctx.createOscillator();
  o1.type = "sawtooth";
  const o2 = ctx.createOscillator();
  o2.type = "square";
  o1.connect(filter);
  o2.connect(filter);
  filter.connect(engineGain);
  engineGain.connect(master);
  o1.start();
  o2.start();

  // Noise, for screech and impacts
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const screechSrc = ctx.createBufferSource();
  screechSrc.buffer = noise;
  screechSrc.loop = true;
  const screechFilter = ctx.createBiquadFilter();
  screechFilter.type = "bandpass";
  screechFilter.frequency.value = 1400;
  screechFilter.Q.value = 6;
  const screechGain = ctx.createGain();
  screechGain.gain.value = 0;
  screechSrc.connect(screechFilter);
  screechFilter.connect(screechGain);
  screechGain.connect(master);
  screechSrc.start();

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

  // A short pitched blip with an exponential tail (no sustain), optionally sliding in pitch
  const blip = (freq: number, to: number, start: number, dur: number, type: OscillatorType, vol: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (to !== freq) o.frequency.exponentialRampToValueAtTime(to, start + dur);
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0008, start + dur);
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
  let lastKnock = 0;
  const lastKind: Record<KnockKind, number> = { pin: 0, cone: 0, crate: 0, drum: 0, ball: 0 };
  return {
    update({ speed, throttle, slip, boost }) {
      const s = Math.abs(speed);
      const t = now();
      const base = 42 + s * 3.1 + Math.max(0, throttle) * 14 + (boost ? 18 : 0);
      o1.frequency.setTargetAtTime(base, t, 0.08);
      o2.frequency.setTargetAtTime(base * 0.502, t, 0.08);
      filter.frequency.setTargetAtTime(380 + s * 38 + Math.max(0, throttle) * 400, t, 0.1);
      engineGain.gain.setTargetAtTime(0.05 + Math.min(0.07, s * 0.003) + Math.max(0, throttle) * 0.03, t, 0.1);
      screechGain.gain.setTargetAtTime(Math.min(0.12, Math.max(0, slip - 3.5) * 0.02), t, 0.06);
    },
    horn() {
      // The classic jeepney "beep-beep"
      const t = now();
      for (const start of [t, t + 0.24]) {
        tone(415, start, 0.17, "square", 0.08);
        tone(523, start, 0.17, "square", 0.06);
      }
    },
    impact(strength) {
      const t = now();
      if (t - lastImpact < 0.08 || strength < 1.2) return;
      lastImpact = t;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 280 + Math.min(900, strength * 60);
      const g = ctx.createGain();
      const vol = Math.min(0.5, 0.06 + strength * 0.025);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      src.connect(f);
      f.connect(g);
      g.connect(master);
      src.start(t, Math.random() * 0.5, 0.3);
    },
    knock(kind, strength) {
      const t = now();
      // At most ~25 voices a second, and one per kind per 45 ms: a strike clatters, it doesn't roar
      if (strength < 1 || t - lastKnock < 0.04 || t - lastKind[kind] < 0.045) return;
      lastKnock = lastKind[kind] = t;
      const v = Math.min(1, 0.25 + strength / 14);
      const j = 1 + (Math.random() - 0.5) * 0.12; // a little variety
      if (kind === "pin") {
        // Hard maple: a bright clack with a hollow ring
        blip(1250 * j, 900 * j, t, 0.09, "triangle", 0.16 * v);
        blip(2350 * j, 2100 * j, t, 0.05, "sine", 0.07 * v);
        burst(t, 0.04, "highpass", 2500, 0.12 * v);
      } else if (kind === "cone") {
        blip(340 * j, 170 * j, t, 0.12, "square", 0.05 * v);
        burst(t, 0.05, "bandpass", 900, 0.08 * v);
      } else if (kind === "crate") {
        blip(150 * j, 90 * j, t, 0.16, "sine", 0.22 * v);
        burst(t, 0.12, "lowpass", 700, 0.22 * v);
      } else if (kind === "drum") {
        blip(210 * j, 190 * j, t, 0.45, "square", 0.045 * v);
        blip(317 * j, 300 * j, t, 0.38, "triangle", 0.06 * v);
        burst(t, 0.08, "bandpass", 1800, 0.1 * v);
      } else {
        blip(160 * j, 420 * j, t, 0.16, "sine", 0.16 * v);
      }
    },
    strike() {
      // Pins crashing, then a little arcade fanfare
      const t = now();
      burst(t, 0.5, "highpass", 1800, 0.18);
      [523, 659, 784, 1047, 1319].forEach((n, i) => tone(n, t + 0.18 + i * 0.075, 0.14, "triangle", 0.07));
      tone(1568, t + 0.6, 0.35, "sine", 0.06);
    },
    chime(big) {
      const t = now();
      const notes = big ? [784, 988, 1175, 1568] : [988, 1319];
      notes.forEach((n, i) => tone(n, t + i * 0.07, 0.16, "sine", 0.07));
    },
    setMuted(muted) {
      master.gain.setTargetAtTime(muted ? 0 : 0.55, now(), 0.05);
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
