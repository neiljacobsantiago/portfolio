"use client";

import { useEffect, useId, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import {
  LANGUAGES,
  MODELS,
  SAMPLE_RATE,
  chunkCount,
  clock,
  timecode,
  toSegments,
  toSrt,
  toTxt,
  toVtt,
  type Segment,
  type WhisperLanguage,
  type WhisperModel,
  type WhisperTask,
  type WorkerRequest,
  type WorkerResponse,
} from "@/lib/tools/whisper";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { Field, Note, Segmented, Stat } from "./ui";

const ACCEPT = "audio/*,video/*,.mp3,.m4a,.wav,.ogg,.oga,.opus,.webm,.mp4,.aac,.flac";
const KNOWN = /\.(mp3|m4a|wav|ogg|oga|opus|webm|mp4|aac|flac|mov)$/i;
const MAX_BYTES = 500 * 1024 * 1024;
/** Past this on a phone, gently say it'll be slow. */
const PHONE_LONG_S = 10 * 60;

type Source = { name: string; audio: Float32Array; duration: number };
type Phase =
  | { kind: "idle" }
  | { kind: "decoding" }
  | { kind: "loading"; device: "webgpu" | "wasm"; loaded: number; total: number; progress: number }
  | { kind: "running"; device: "webgpu" | "wasm"; done: number; total: number; partial: string; startedAt: number }
  | { kind: "done"; seconds: number }
  | { kind: "error"; title: string; body: string; detail?: string; retry: boolean };

/** File → 16 kHz mono samples, decoded (and resampled) by the browser itself. */
async function decode(blob: Blob): Promise<Float32Array> {
  const data = await blob.arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, SAMPLE_RATE);
  const buffer = await ctx.decodeAudioData(data);
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0).slice();
  const out = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < ch.length; i++) out[i] += ch[i] / buffer.numberOfChannels;
  }
  return out;
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes > 100 * 1024 * 1024 ? 0 : 1)} MB`;
const duration = (s: number) => (s < 60 ? `${Math.max(1, Math.round(s))} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`);
const isPhone = () => {
  try {
    return matchMedia("(pointer: coarse)").matches && innerWidth < 900;
  } catch {
    return false;
  }
};
const recorderType = () =>
  typeof MediaRecorder === "undefined" ? "" : (["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "");

/** Speech to text in the browser — Whisper (ONNX via Transformers.js) in a Web Worker. */
export default function WhisperTool({ compact }: { compact?: boolean }) {
  const [model, setModel] = useState<WhisperModel>("tiny");
  const [language, setLanguage] = useState<WhisperLanguage>("auto");
  const [task, setTask] = useState<WhisperTask>("transcribe");
  const [timestamps, setTimestamps] = useState(true);

  const [source, setSource] = useState<Source | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [segments, setSegments] = useState<Segment[]>([]);
  const [plain, setPlain] = useState<string | null>(null); // transcript without timestamps
  const [phone, setPhone] = useState(false);
  const [gpuHint, setGpuHint] = useState(false);
  const [now, setNow] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [rec, setRec] = useState<{ startedAt: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const worker = useRef<Worker | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  /** What the running job was asked for (the worker's listener outlives any one render). */
  const job = useRef<{ duration: number; timestamps: boolean } | null>(null);
  const preview = useRef<HTMLPreElement>(null);
  const timeId = useId();

  const busy = phase.kind === "decoding" || phase.kind === "loading" || phase.kind === "running";
  const hasResult = plain !== null || segments.length > 0;

  // A clock for the elapsed/remaining read-outs while recording or transcribing.
  useEffect(() => {
    if (!rec && phase.kind !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [rec, phase.kind]);

  // Keep the live preview scrolled to the newest words.
  useEffect(() => {
    if (phase.kind === "running" && preview.current) preview.current.scrollTop = preview.current.scrollHeight;
  }, [phase]);

  // Leaving the page stops the worker and lets go of the microphone.
  useEffect(
    () => () => {
      worker.current?.terminate();
      const r = recorder.current;
      if (r && r.state !== "inactive") r.stop();
      r?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const fail = (title: string, body: string, detail?: string, retry = false) => setPhase({ kind: "error", title, body, detail, retry });

  async function loadBlob(blob: Blob, name: string) {
    if (blob.size > MAX_BYTES) {
      fail("That file is too big", `${mb(blob.size)} is more than a browser tab can comfortably hold. Trim it or export just the audio (under 500 MB) and try again.`);
      return;
    }
    setPhase({ kind: "decoding" });
    setSegments([]);
    setPlain(null);
    setPhone(isPhone());
    setGpuHint(typeof navigator !== "undefined" && "gpu" in navigator);
    try {
      const audio = await decode(blob);
      if (audio.length < SAMPLE_RATE / 4) throw new Error("No audio found");
      setSource({ name, audio, duration: audio.length / SAMPLE_RATE });
      setPhase({ kind: "idle" });
    } catch (err) {
      setSource(null);
      fail(
        "Couldn't read that audio",
        "Your browser couldn't decode this file. MP3, M4A and WAV work almost everywhere; for a video, try exporting just the audio.",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file || busy || rec) return;
    if (!/^(audio|video)\//.test(file.type) && !KNOWN.test(file.name)) {
      fail("That doesn't look like audio", "Pick an audio or video file — MP3, M4A, WAV, OGG, WebM or MP4.");
      return;
    }
    haptic();
    void loadBlob(file, file.name);
  }

  async function startRecording() {
    if (busy) return;
    haptic();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      fail("Recording isn't available here", "This browser can't record from the microphone. You can still upload a file.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      const type = recorderType();
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const parts: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && parts.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRec(null);
        const blob = new Blob(parts, { type: r.mimeType || type || "audio/webm" });
        const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
        const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
        void loadBlob(blob, `recording-${stamp}.${ext}`);
      };
      recorder.current = r;
      r.start(1000);
      const t = Date.now();
      setRec({ startedAt: t });
      setNow(t);
      setPhase({ kind: "idle" });
    } catch (err) {
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      fail(
        denied ? "Microphone blocked" : "Couldn't start the microphone",
        denied ? "Allow microphone access for this site in your browser's settings, then try again — or upload a file instead." : "No microphone was found, or another app is using it.",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  function stopRecording() {
    haptic();
    recorder.current?.stop();
  }

  function getWorker() {
    if (worker.current) return worker.current;
    const w = new Worker(new URL("./whisper.worker.ts", import.meta.url), { type: "module" });
    w.addEventListener("message", (e: MessageEvent<WorkerResponse>) => {
      const m = e.data;
      switch (m.type) {
        case "loading":
          setPhase({ kind: "loading", device: m.device, loaded: m.loaded, total: m.total, progress: m.progress });
          break;
        case "ready": {
          const t = Date.now();
          setNow(t);
          setPhase({ kind: "running", device: m.device, done: 0, total: 0, partial: "", startedAt: t });
          break;
        }
        case "partial":
          setPhase((p) => (p.kind === "running" ? { ...p, done: m.done, total: m.total, partial: m.text } : p));
          break;
        case "done":
          finish(m);
          break;
        case "error":
          if (m.stage === "load")
            fail(
              "Couldn't download the speech model",
              "The first run fetches Whisper from Hugging Face (tens of MB), then your browser keeps it. Check your connection — or a blocker that stops huggingface.co — and try again.",
              m.message,
              true,
            );
          else fail("Transcription stopped partway", "Something went wrong while listening. Trying again usually works; Tiny needs less memory than Base.", m.message, true);
      }
    });
    w.addEventListener("error", (e) => {
      fail("The transcriber crashed", "Your browser stopped the background worker — often from running out of memory. Try Tiny, or a shorter file.", e.message, true);
      worker.current?.terminate();
      worker.current = null;
    });
    worker.current = w;
    return w;
  }

  function finish(m: Extract<WorkerResponse, { type: "done" }>) {
    setPhase((p) => ({ kind: "done", seconds: p.kind === "running" ? (Date.now() - p.startedAt) / 1000 : 0 }));
    const j = job.current;
    if (!j) return;
    if (j.timestamps && m.chunks.length) {
      setSegments(toSegments(m.chunks, j.duration));
      setPlain(null);
    } else {
      setSegments([]);
      setPlain(m.text.trim());
    }
  }

  function run() {
    if (!source || busy) return;
    haptic();
    setSegments([]);
    setPlain(null);
    setCopied(false);
    setPhase({ kind: "loading", device: gpuHint ? "webgpu" : "wasm", loaded: 0, total: 0, progress: 0 });
    job.current = { duration: source.duration, timestamps };
    const req: WorkerRequest = { type: "run", audio: source.audio, model, language, task, timestamps };
    getWorker().postMessage(req);
  }

  function stop() {
    haptic();
    worker.current?.terminate();
    worker.current = null;
    setPhase({ kind: "idle" });
  }

  const transcriptText = plain ?? toTxt(segments).trimEnd();
  const base = (source?.name ?? "transcript").replace(/\.[^.]+$/, "") || "transcript";

  async function copy() {
    haptic();
    try {
      await navigator.clipboard.writeText(transcriptText);
    } catch {
      const t = document.createElement("textarea");
      t.value = transcriptText;
      document.body.append(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  // Rough guess before the first window finishes; a measured one after.
  const speed = MODELS[model].speed[gpuHint ? 0 : 1];
  const guess = source ? Math.max(5, source.duration * speed * (phone ? 2 : 1)) : 0;
  const running = phase.kind === "running" ? phase : null;
  const elapsed = running ? Math.max(0, (now - running.startedAt) / 1000) : 0;
  const totalChunks = source ? chunkCount(source.audio.length) : 1;
  const left = running ? (running.done > 0 ? (elapsed / running.done) * (running.total - running.done) : Math.max(0, guess - elapsed)) : 0;

  return (
    <div className="space-y-5">
      {/* Input: drop a file or record */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy && !rec) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-[2px] border border-dashed p-4 transition-colors sm:p-5",
          dragging ? "border-ember bg-ember/[0.06]" : "border-ink/25 bg-paper/60",
        )}
      >
        <input ref={fileInput} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }} />
        {rec ? (
          <div className="flex flex-wrap items-center gap-4">
            <span aria-hidden className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember/60" />
              <span className="relative h-3 w-3 rounded-full bg-ember" />
            </span>
            <p className="font-mono text-2xl text-ink tabular-nums" role="timer" aria-live="off">
              {clock((now - rec.startedAt) / 1000)}
            </p>
            <p className="label text-3xs text-ink/70">Recording…</p>
            <button type="button" onClick={stopRecording} className="label press ml-auto inline-flex items-center gap-2 rounded-full bg-ember px-5 py-2.5 text-2xs text-paper hover:bg-wine">
              <Icon name="stop" className="h-3 w-3" /> Stop
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl leading-tight text-ink">{dragging ? "Drop it here" : "Drop an audio or video file"}</p>
              <p className="mt-1 font-mono text-2xs text-ink/70">MP3 · M4A · WAV · OGG · WebM · MP4</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
                className="label press rounded-full bg-ink px-4 py-2.5 text-2xs text-paper hover:bg-ember disabled:opacity-40"
              >
                Choose file
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={startRecording}
                className="label press inline-flex items-center gap-2 rounded-full border border-ink/25 px-4 py-2.5 text-2xs text-ink hover:border-ink hover:bg-ink hover:text-paper disabled:opacity-40"
              >
                <span aria-hidden className="h-2 w-2 rounded-full bg-ember" />
                Record
              </button>
            </div>
          </div>
        )}
        {source && !rec && (
          <p className="mt-3 flex min-w-0 items-center gap-2 border-t border-ink/10 pt-3 font-mono text-[0.7rem] text-ink/70">
            <Icon name="music" className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 truncate">{source.name}</span>
            <span className="shrink-0 text-ink/70">· {clock(source.duration)}</span>
          </p>
        )}
      </div>

      {/* Options */}
      <div className={cn("grid gap-4 [&>*]:min-w-0", !compact && "sm:grid-cols-2")}>
        <Field label="Model">
          <Segmented
            label="Model"
            value={model}
            onChange={setModel}
            options={(Object.keys(MODELS) as WhisperModel[]).map((m) => ({ value: m, label: `${MODELS[m].label} · ${MODELS[m].hint}` }))}
          />
        </Field>
        <Field label="Language spoken">
          <Segmented
            label="Language spoken"
            value={language}
            onChange={setLanguage}
            options={(Object.keys(LANGUAGES) as WhisperLanguage[]).map((l) => ({ value: l, label: l === "tl" ? "Filipino" : LANGUAGES[l].split("-")[0] }))}
          />
        </Field>
        <Field label="Output">
          <Segmented
            label="Output"
            value={task}
            onChange={setTask}
            options={[
              { value: "transcribe", label: "Same language" },
              { value: "translate", label: "Translate to English" },
            ]}
          />
        </Field>
        <div>
          <span id={timeId} className="label mb-1.5 block text-3xs text-ink/70">
            Timestamps
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={timestamps}
            aria-labelledby={timeId}
            onClick={() => {
              haptic();
              setTimestamps((t) => !t);
            }}
            className="press group inline-flex items-center gap-3 rounded-full bg-ink/[0.06] p-1 pr-4"
          >
            <span className={cn("relative h-6 w-11 rounded-full transition-colors", timestamps ? "bg-ember" : "bg-ink/25")}>
              <span className={cn("absolute top-1 left-1 h-4 w-4 rounded-full bg-paper shadow transition-transform duration-300 ease-[var(--ease-spring)]", timestamps && "translate-x-5")} />
            </span>
            <span className="label text-3xs text-ink/70">{timestamps ? "On · for subtitles" : "Off · plain text"}</span>
          </button>
        </div>
      </div>

      {/* Go */}
      <div className="flex flex-wrap items-center gap-3">
        {busy && phase.kind !== "decoding" ? (
          <button type="button" onClick={stop} className="btn border border-ink/25 text-ink hover:border-ink">
            Stop
          </button>
        ) : (
          <button type="button" disabled={!source || busy || !!rec} onClick={run} className="btn bg-ink text-paper hover:bg-ember disabled:pointer-events-none disabled:opacity-40">
            {hasResult ? "Transcribe again" : "Transcribe"} <Icon name="arrow-right" className="arrow" />
          </button>
        )}
        {source && !busy && (
          <p className="font-serif text-[0.95rem] text-ink/75">
            About {duration(guess)} for {clock(source.duration)} of audio{phone ? " on a phone" : ""}, after the model is downloaded.
          </p>
        )}
      </div>

      {source && phone && source.duration > PHONE_LONG_S && !hasResult && (
        <p className="rounded-[2px] border-l-2 border-sky bg-sky/10 px-3 py-2 font-serif text-sm text-ink/80">
          This is a long recording for a phone. It&apos;ll work, but slowly and with a warm battery — keep this tab open and the screen on, or use a laptop for anything over half an hour.
        </p>
      )}

      {/* Status */}
      <div aria-live="polite" className="space-y-3">
        {phase.kind === "decoding" && <Note>Reading the audio…</Note>}

        {phase.kind === "loading" && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="label text-3xs text-ink/75">{phase.total ? "Downloading the model" : "Loading the model"}</p>
              <p className="font-mono text-[0.7rem] text-ink/70 tabular-nums">{phase.total ? `${mb(phase.loaded)} / ${mb(phase.total)}` : "…"}</p>
            </div>
            <Bar value={phase.total ? phase.progress / 100 : null} label="Model download" />
            <Note>
              {phase.device === "webgpu" ? "Using your GPU (WebGPU)." : "Using WebAssembly."} The first run downloads Whisper {MODELS[model].label} once; after that your browser keeps it.
            </Note>
          </div>
        )}

        {running && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="label text-3xs text-ink/75">
                Listening · part {Math.min(running.done + 1, running.total || totalChunks)} of {running.total || totalChunks}
              </p>
              <p className="font-mono text-[0.7rem] text-ink/70 tabular-nums">
                {clock(elapsed)} · ~{clock(left)} left
              </p>
            </div>
            <Bar value={(running.total || totalChunks) > 1 ? running.done / (running.total || totalChunks) : null} label="Transcription progress" />
            {running.partial && (
              <pre ref={preview} className="max-h-40 overflow-y-auto rounded-[2px] bg-ink/[0.04] p-3 font-mono text-[0.75rem] leading-relaxed whitespace-pre-wrap text-ink/75">
                {running.partial}
              </pre>
            )}
            <Note>Live preview — overlapping parts get stitched together cleanly at the end.</Note>
          </div>
        )}

        {phase.kind === "error" && (
          <div role="alert" className="animate-pop-in space-y-2 rounded-[2px] border-l-2 border-ember bg-ember/[0.06] px-4 py-3">
            <p className="font-display text-lg leading-tight text-wine">{phase.title}</p>
            <p className="font-serif text-[0.95rem] leading-snug text-ink/80">{phase.body}</p>
            {phase.detail && (
              <details className="font-mono text-2xs text-ink/70">
                <summary className="cursor-pointer">Details</summary>
                <p className="mt-1 break-words">{phase.detail}</p>
              </details>
            )}
            {phase.retry && source && (
              <button type="button" onClick={run} className="label press mt-1 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-2xs text-paper hover:bg-ember">
                <Icon name="refresh" /> Try again
              </button>
            )}
          </div>
        )}
      </div>

      {/* Result */}
      {hasResult && (
        <div className="animate-pop-in space-y-4 border-t border-ink/15 pt-5">
          <dl className="grid [&>*]:min-w-0 grid-cols-3 gap-px overflow-hidden rounded-[2px] bg-ink/10 ring-1 ring-ink/10">
            <Stat compact={compact} label="Audio" value={clock(source?.duration ?? 0)} />
            <Stat compact={compact} label="Took" value={phase.kind === "done" ? clock(phase.seconds) : "—"} tone="ember" />
            <Stat compact={compact} label={plain !== null ? "Words" : "Segments"} value={plain !== null ? (plain.match(/\S+/g)?.length ?? 0) : segments.length} />
          </dl>

          <p className="label text-3xs text-ink/70">Transcript · tap any line to fix it</p>
          {plain !== null ? (
            <textarea
              value={plain}
              onChange={(e) => setPlain(e.target.value)}
              aria-label="Transcript"
              rows={8}
              className="w-full rounded-[2px] border border-ink/15 bg-paper/80 p-3 font-serif text-[1.05rem] leading-relaxed text-ink outline-none focus:border-ember focus:ring-1 focus:ring-ember"
            />
          ) : (
            <ol className="max-h-[32rem] divide-y divide-ink/10 overflow-y-auto rounded-[2px] ring-1 ring-ink/10">
              {segments.map((s, i) => (
                <li key={i} className="flex flex-col gap-1 bg-paper/70 px-3 py-2 sm:flex-row sm:gap-3">
                  <span className="shrink-0 pt-1 font-mono text-2xs text-ember tabular-nums sm:w-28">
                    {timecode(s.start, ".").replace(/^00:/, "").slice(0, -4)} – {timecode(s.end, ".").replace(/^00:/, "").slice(0, -4)}
                  </span>
                  <textarea
                    value={s.text}
                    rows={1}
                    onChange={(e) => {
                      const text = e.target.value;
                      setSegments((all) => all.map((x, j) => (j === i ? { ...x, text } : x)));
                    }}
                    aria-label={`Line ${i + 1}, from ${clock(s.start)}`}
                    className="min-h-[1.75rem] w-full min-w-0 flex-1 resize-none rounded-[2px] bg-transparent px-1 font-serif text-[1.02rem] leading-snug text-ink outline-none [field-sizing:content] focus:bg-paper focus:ring-1 focus:ring-ember"
                  />
                </li>
              ))}
            </ol>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="label press inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-2xs text-paper hover:bg-ember">
              {copied ? (
                <>
                  <Icon name="check" /> Copied
                </>
              ) : (
                "Copy text"
              )}
            </button>
            <ExportButton onClick={() => download(`${base}.txt`, transcriptText + "\n", "text/plain")}>.txt</ExportButton>
            <ExportButton disabled={!segments.length} onClick={() => download(`${base}.srt`, toSrt(segments), "application/x-subrip")}>
              .srt
            </ExportButton>
            <ExportButton disabled={!segments.length} onClick={() => download(`${base}.vtt`, toVtt(segments), "text/vtt")}>
              .vtt
            </ExportButton>
          </div>
          {!segments.length && <Note>Turn timestamps on and transcribe again to export subtitles (.srt, .vtt).</Note>}
        </div>
      )}

      <p className="border-t border-ink/10 pt-4 font-serif text-sm leading-snug text-ink/75">
        <span className="font-semibold text-ink/80">Your audio never leaves this device.</span> Whisper runs right here in your browser; only the model itself is downloaded, once.{" "}
        <a href="https://github.com/openai/whisper" target="_blank" rel="noreferrer" className="ulink text-ember hover:text-ink">
          Based on OpenAI Whisper (MIT licence) <Icon name="arrow-up-right" />
        </a>
      </p>
    </div>
  );
}

function Bar({ value, label }: { value: number | null; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === null ? undefined : Math.round(value * 100)}
      className="relative h-1.5 overflow-hidden rounded-full bg-ink/10"
    >
      {value === null ? (
        <span className="absolute inset-0 animate-pulse rounded-full bg-sky/70 motion-reduce:animate-none" />
      ) : (
        <span className="absolute inset-y-0 left-0 rounded-full bg-ember transition-[width] duration-500 ease-[var(--ease-apple)]" style={{ width: `${Math.max(2, value * 100)}%` }} />
      )}
    </div>
  );
}

function ExportButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        haptic();
        onClick();
      }}
      className="label press inline-flex items-center gap-1.5 rounded-full border border-ink/25 px-4 py-2.5 text-2xs text-ink hover:border-ink hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-35"
    >
      <Icon name="download" /> {children}
    </button>
  );
}
