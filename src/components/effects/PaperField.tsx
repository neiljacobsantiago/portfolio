/** Fixed background: slow drifting colour fields over film grain. CSS only;
 *  SiteEffects nudges the orb layer toward the cursor on desktop. */
export default function PaperField() {
  return (
    <div className="paper-field" aria-hidden>
      <div className="orbs">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
      </div>
      <div className="grain" />
    </div>
  );
}
