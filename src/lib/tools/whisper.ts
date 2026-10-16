// Whisper transcription: the shared types, options and export formatters.
// The heavy lifting (Transformers.js + ONNX Whisper) lives in the Web Worker at
// src/components/tools/whisper.worker.ts; everything here is plain and testable.

export type WhisperModel = "tiny" | "base";
export type WhisperLanguage = "auto" | "en" | "tl";
export type WhisperTask = "transcribe" | "translate";

export const MODELS: Record<WhisperModel, { id: string; label: string; hint: string; /** Rough share of real time it takes, [WebGPU, WASM]. */ speed: [number, number] }> = {
  tiny: { id: "onnx-community/whisper-tiny", label: "Tiny", hint: "Fastest", speed: [0.08, 0.35] },
  base: { id: "onnx-community/whisper-base", label: "Base", hint: "More accurate", speed: [0.15, 0.8] },
};

export const LANGUAGES: Record<WhisperLanguage, string> = {
  auto: "Auto-detect",
  en: "English",
  tl: "Filipino / Tagalog",
};

/** Long files are cut into 30 s windows with 5 s of overlap each side, then stitched back. */
export const CHUNK_S = 30;
export const STRIDE_S = 5;
export const SAMPLE_RATE = 16000;

/** How many windows the pipeline will run for this many samples (mirrors Transformers.js' own chunking). */
export function chunkCount(samples: number, rate = SAMPLE_RATE): number {
  const window = rate * CHUNK_S;
  const jump = window - 2 * rate * STRIDE_S;
  if (samples <= window) return 1;
  return Math.ceil((samples - window) / jump) + 1;
}

export interface Segment {
  start: number;
  end: number;
  text: string;
}

/** Transformers.js chunks → clean segments. The last chunk's end can be null; it ends with the audio. */
export function toSegments(chunks: { timestamp: [number, number | null]; text: string }[], duration: number): Segment[] {
  const out: Segment[] = [];
  for (const c of chunks) {
    const text = c.text.trim();
    if (!text) continue;
    const start = Math.max(0, c.timestamp[0] ?? 0);
    const end = Math.max(start, c.timestamp[1] ?? duration);
    out.push({ start, end, text });
  }
  return out;
}

/** 3725.5 → "01:02:05,500" (SRT) or "01:02:05.500" (VTT). */
export function timecode(seconds: number, sep: "," | "." = ","): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms % 1000, 3)}`;
}

/** Short clock for the UI: 65 → "1:05", 3725 → "1:02:05". */
export function clock(seconds: number): string {
  const t = Math.max(0, Math.floor(seconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

const lines = (text: string) => text.replace(/\r\n?/g, "\n").trim();

export function toTxt(segments: Segment[]): string {
  return segments.map((s) => lines(s.text)).filter(Boolean).join("\n") + "\n";
}

export function toSrt(segments: Segment[]): string {
  return segments
    .filter((s) => lines(s.text))
    .map((s, i) => `${i + 1}\n${timecode(s.start, ",")} --> ${timecode(s.end, ",")}\n${lines(s.text)}\n`)
    .join("\n");
}

export function toVtt(segments: Segment[]): string {
  const cues = segments
    .filter((s) => lines(s.text))
    // "-->" may not appear inside a VTT cue's text.
    .map((s) => `${timecode(s.start, ".")} --> ${timecode(s.end, ".")}\n${lines(s.text).replace(/-->/g, "->")}\n`);
  return ["WEBVTT\n", ...cues].join("\n");
}

/** Worker protocol. */
export type WorkerRequest = {
  type: "run";
  audio: Float32Array;
  model: WhisperModel;
  language: WhisperLanguage;
  task: WhisperTask;
  timestamps: boolean;
};

export type WorkerResponse =
  | { type: "loading"; device: "webgpu" | "wasm"; loaded: number; total: number; progress: number }
  | { type: "ready"; device: "webgpu" | "wasm" }
  | { type: "partial"; text: string; done: number; total: number }
  | { type: "done"; text: string; chunks: { timestamp: [number, number | null]; text: string }[] }
  | { type: "error"; stage: "load" | "run"; message: string };
