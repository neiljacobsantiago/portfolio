// Re-mounts on every navigation: a cheap opacity-only fade (no blur/transform,
// which are expensive on budget GPUs and would trap fixed-position children).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
