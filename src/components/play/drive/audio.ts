// Island Drive's sound, synthesised with Web Audio (no files to download):
// an engine note that follows the speed, a two-tone jeepney horn, tyre
// screech when drifting, thuds for collisions and a chime for packets.

export interface DriveAudio {
  update: (s: { speed: number; throttle: number; slip: number; boost: boolean }) => void;
  horn: () => void;
  impact: (strength: number) => void;
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

  let lastImpact = 0;
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
