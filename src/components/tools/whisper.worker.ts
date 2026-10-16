// Runs Whisper (ONNX, via Transformers.js) off the main thread so the page never freezes.
// The library is imported lazily, on the first job, so it never weighs down other pages.
// Audio arrives as 16 kHz mono samples and never leaves the device; only the model
// files are downloaded (once, then the browser's Cache Storage keeps them).

import { CHUNK_S, MODELS, STRIDE_S, chunkCount, type WhisperModel, type WorkerRequest, type WorkerResponse } from "@/lib/tools/whisper";

type Device = "webgpu" | "wasm";
type Lib = typeof import("@huggingface/transformers");
type Transcriber = Awaited<ReturnType<typeof loadPipeline>>;

const post = (msg: WorkerResponse) => self.postMessage(msg);

let lib: Promise<Lib> | null = null;
let loaded: { key: string; device: Device; transcriber: Transcriber } | null = null;
let gpuBroken = false;

function getLib() {
  lib ??= import("@huggingface/transformers").then((m) => {
    m.env.allowLocalModels = false; // no /models folder on this site; always fetch from the Hub
    m.env.useBrowserCache = true; // download once, then reuse
    return m;
  });
  return lib;
}

async function hasWebGPU() {
  if (gpuBroken) return false;
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    return !!(gpu && (await gpu.requestAdapter()));
  } catch {
    return false;
  }
}

async function loadPipeline(model: WhisperModel, device: Device) {
  const { pipeline } = await getLib();
  return pipeline("automatic-speech-recognition", MODELS[model].id, {
    device,
    // WebGPU: full-precision encoder (q4 hurts accuracy there) + 4-bit decoder. WASM: 8-bit everything.
    dtype: device === "webgpu" ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8",
    progress_callback: (p) => {
      if (p.status === "progress_total") post({ type: "loading", device, loaded: p.loaded, total: p.total, progress: p.progress });
    },
  });
}

async function ensure(model: WhisperModel) {
  const prefer: Device = (await hasWebGPU()) ? "webgpu" : "wasm";
  const key = `${model}:${prefer}`;
  if (loaded?.key === key) {
    post({ type: "ready", device: loaded.device });
    return loaded;
  }
  await loaded?.transcriber.dispose().catch(() => {});
  loaded = null;
  post({ type: "loading", device: prefer, loaded: 0, total: 0, progress: 0 });
  let device = prefer;
  let transcriber: Transcriber;
  try {
    transcriber = await loadPipeline(model, device);
  } catch (err) {
    if (device === "wasm") throw err;
    // Some GPUs/browsers advertise WebGPU but can't run the model: fall back to WASM.
    gpuBroken = true;
    device = "wasm";
    post({ type: "loading", device, loaded: 0, total: 0, progress: 0 });
    transcriber = await loadPipeline(model, device);
  }
  loaded = { key: `${model}:${device}`, device, transcriber };
  post({ type: "ready", device });
  return loaded;
}

async function transcribe(req: WorkerRequest) {
  let current: NonNullable<typeof loaded>;
  try {
    current = await ensure(req.model);
  } catch (err) {
    post({ type: "error", stage: "load", message: err instanceof Error ? err.message : String(err) });
    return;
  }

  const { WhisperTextStreamer } = await getLib();
  const total = chunkCount(req.audio.length);
  let done = 0;
  let text = "";
  const { transcriber } = current;
  const streamer = new WhisperTextStreamer(transcriber.tokenizer as ConstructorParameters<typeof WhisperTextStreamer>[0], {
    skip_prompt: true,
    callback_function: (piece: string) => {
      text += piece;
      post({ type: "partial", text, done, total });
    },
    on_finalize: () => {
      done = Math.min(total, done + 1);
      text += "\n";
      post({ type: "partial", text, done, total });
    },
  });

  try {
    const out = await transcriber(req.audio, {
      chunk_length_s: CHUNK_S,
      stride_length_s: STRIDE_S,
      return_timestamps: req.timestamps,
      task: req.task,
      ...(req.language !== "auto" && { language: req.language }),
      streamer,
    });
    type Out = { text: string; chunks?: { timestamp: [number, number | null]; text: string }[] };
    const result = (Array.isArray(out) ? out[0] : out) as Out;
    post({
      type: "done",
      text: result.text,
      chunks: (result.chunks ?? []).map((c) => ({ timestamp: [c.timestamp[0], c.timestamp[1] ?? null], text: c.text })),
    });
  } catch (err) {
    if (current.device === "webgpu" && !gpuBroken) {
      // A GPU that loads the model but fails mid-run: next attempt goes to WASM.
      gpuBroken = true;
      await current.transcriber.dispose().catch(() => {});
      loaded = null;
    }
    post({ type: "error", stage: "run", message: err instanceof Error ? err.message : String(err) });
  }
}

self.addEventListener("message", (e: MessageEvent<WorkerRequest>) => {
  if (e.data?.type === "run") void transcribe(e.data);
});
