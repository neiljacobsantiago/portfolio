/** HUD overlay shared by the WebGL sentinel and its static fallback. */
export default function SentinelChrome({ label }: { label: string }) {
  return (
    <>
      <div className="pointer-events-none absolute top-6 z-20 bg-marine/50 px-2 font-mono text-[10px] tracking-widest text-accentRed uppercase">
        Target Lock
      </div>
      <div className="pointer-events-none absolute bottom-6 z-20 font-mono text-[10px] tracking-widest text-butter/50 uppercase">
        {label}
      </div>
      <div className="pointer-events-none absolute top-1/2 right-0 left-0 h-px bg-butter/5" />
      <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 w-px bg-butter/5" />
    </>
  );
}
