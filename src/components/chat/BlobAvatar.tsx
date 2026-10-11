import { cn } from "@/lib/utils";

/**
 * NeilAI's face: a morphing ember blob with two eyes. Pupils follow
 * `--look-x` / `--look-y` (set by the parent from the cursor), and it blinks.
 */
export default function BlobAvatar({ className, mood = "idle" }: { className?: string; mood?: "idle" | "thinking" | "happy" }) {
  return (
    <span aria-hidden className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <span className="animate-morph absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,#ff5a4f,var(--color-ember)_45%,var(--color-wine))] shadow-[inset_0_-6px_12px_rgb(0_0_0/0.2)]" />
      <span className="relative flex gap-[18%] translate-y-[-6%]" style={{ width: "46%" }}>
        {[0, 1].map((i) => (
          <span key={i} className={cn("animate-eye-blink relative block aspect-[4/5] w-1/2 rounded-full bg-paper", mood === "happy" && "h-[0.35em] aspect-auto rounded-t-full")}>
            {mood !== "happy" && (
              <span
                className="absolute top-1/2 left-1/2 h-[52%] w-[52%] rounded-full bg-ink transition-transform duration-300 ease-out"
                style={{
                  transform:
                    mood === "thinking"
                      ? "translate(-50%,-50%) translate(40%,-45%)"
                      : "translate(-50%,-50%) translate(calc(var(--look-x,0) * 45%), calc(var(--look-y,0) * 45%))",
                }}
              />
            )}
          </span>
        ))}
      </span>
    </span>
  );
}
