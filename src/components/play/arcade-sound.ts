"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Tiny synthesized sounds for the arcade games (no audio files). The audio
// context is only created on the first sound, which always follows a tap or
// key press, so browsers allow it. One mute setting covers both games.

const MUTE_KEY = "arcade-muted";

type Sound = "shutter" | "keeper" | "right" | "wrong" | "tick";

export function useArcadeSound() {
  const ctx = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    try {
      const m = localStorage.getItem(MUTE_KEY) === "1";
      queueMicrotask(() => setMuted(m));
    } catch {}
    return () => void ctx.current?.close();
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      try {
        localStorage.setItem(MUTE_KEY, m ? "0" : "1");
      } catch {}
      return !m;
    });
  }, []);

  const play = useCallback(
    (sound: Sound) => {
      if (muted) return;
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const c = (ctx.current ??= new AC());
      void c.resume();
      const t = c.currentTime;
      const out = c.createGain();
      out.connect(c.destination);
      const tone = (freq: number, start: number, dur: number, type: OscillatorType, vol: number) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(vol, start + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0008, start + dur);
        o.connect(g);
        g.connect(out);
        o.start(start);
        o.stop(start + dur + 0.02);
        return o;
      };
      const noise = (start: number, dur: number, vol: number, hp: number) => {
        const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const src = c.createBufferSource();
        src.buffer = buf;
        const f = c.createBiquadFilter();
        f.type = "highpass";
        f.frequency.value = hp;
        const g = c.createGain();
        g.gain.value = vol;
        src.connect(f);
        f.connect(g);
        g.connect(out);
        src.start(start);
      };
      switch (sound) {
        case "shutter": // mirror slap, then the shutter curtain
          noise(t, 0.035, 0.35, 1800);
          tone(140, t, 0.06, "square", 0.05);
          noise(t + 0.06, 0.03, 0.25, 2600);
          break;
        case "keeper":
          [880, 1109, 1319].forEach((f, i) => tone(f, t + 0.1 + i * 0.07, 0.18, "sine", 0.06));
          break;
        case "right":
          tone(660, t, 0.09, "triangle", 0.08);
          tone(990, t + 0.06, 0.12, "triangle", 0.07);
          break;
        case "wrong":
          tone(180, t, 0.22, "sawtooth", 0.05).frequency.exponentialRampToValueAtTime(90, t + 0.22);
          break;
        case "tick":
          tone(1400, t, 0.03, "square", 0.025);
          break;
      }
    },
    [muted],
  );

  return { play, muted, toggleMute };
}
