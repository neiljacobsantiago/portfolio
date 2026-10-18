import { Fragment } from "react";
import { parseRich, type Span } from "@/lib/neilai/format";

// A reply, formatted: paragraphs, bullet and numbered lists, and bold. Parsed
// into data first and rendered as text nodes, so a reply can never inject HTML.

function Spans({ spans }: { spans: Span[] }) {
  return spans.map((s, i) =>
    s.bold ? (
      <strong key={i} className="font-semibold">
        {s.text}
      </strong>
    ) : (
      <Fragment key={i}>{s.text}</Fragment>
    ),
  );
}

export default function RichText({ text, cursor }: { text: string; cursor?: React.ReactNode }) {
  const blocks = parseRich(text);
  const last = blocks.length - 1;
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        const tail = i === last ? cursor : null;
        if (b.type === "p") {
          return (
            <p key={i}>
              {b.lines.map((line, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  <Spans spans={line} />
                </Fragment>
              ))}
              {tail}
            </p>
          );
        }
        const List = b.type === "ul" ? "ul" : "ol";
        return (
          <List key={i} className={b.type === "ul" ? "space-y-1 pl-1" : "list-decimal space-y-1 pl-5 marker:text-ink/50"}>
            {b.items.map((item, j) => (
              <li key={j} className={b.type === "ul" ? "relative pl-4" : "pl-0.5"}>
                {b.type === "ul" && <span aria-hidden className="absolute top-[0.6em] left-0.5 h-1.5 w-1.5 rounded-full bg-ember/70" />}
                <Spans spans={item} />
                {j === b.items.length - 1 && tail}
              </li>
            ))}
          </List>
        );
      })}
      {blocks.length === 0 && cursor}
    </div>
  );
}
