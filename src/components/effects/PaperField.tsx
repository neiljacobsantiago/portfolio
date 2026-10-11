/** Fixed background: slow drifting colour fields over film grain. CSS only. */
export default function PaperField() {
  return (
    <div className="paper-field" aria-hidden>
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orb orb-c" />
      <div className="grain" />
    </div>
  );
}
