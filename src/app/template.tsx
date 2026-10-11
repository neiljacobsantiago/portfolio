// Re-mounts on every navigation: a cheap opacity-only fade.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
