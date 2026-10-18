// NeilAI's tiny formatting language: paragraphs, "- " bullet lists, numbered
// lists and **bold**. Nothing else. The server tidies the model's reply down
// to this subset, and the chat parses it into plain data that React renders
// as text nodes, so no HTML from a reply ever reaches the page.

export interface Span {
  text: string;
  bold?: boolean;
}

export type Block = { type: "p"; lines: Span[][] } | { type: "ul" | "ol"; items: Span[][] };

/** Emoji and pictographs (flags, symbols, dingbats). The chat shows icons as SVG, never as emoji. */
const EMOJI = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}][\u{FE0F}\u{200D}]*/gu;

/** Trims a model reply to the subset: no headings, links, URLs, code, tables or emoji; one bullet style. */
export function tidyReply(raw: string): string {
  return (
    raw
      .replace(/\r\n?/g, "\n")
      .replace(EMOJI, "")
      // Code fences and inline code: keep the words.
      .replace(/```[a-z]*\n?/gi, "")
      .replace(/`([^`\n]*)`/g, "$1")
      // [label](url) → label, then drop any bare URL.
      .replace(/\[([^\]\n]+)\]\((?:[^)\s]+)\)/g, "$1")
      .replace(/<?\(?https?:\/\/[^\s)>]+\)?>?/g, "")
      // Headings become bold lines; table rules and pipes go.
      .replace(/^\s{0,3}#{1,6}\s+(.+?)\s*#*$/gm, "**$1**")
      .replace(/^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-*:?\s*$/gm, "")
      .replace(/^\s*\|(.+)\|\s*$/gm, (_, row: string) => `- ${row.split("|").map((c) => c.trim()).filter(Boolean).join(" · ")}`)
      // One bullet style; __bold__ → **bold**; single-star or underscore italics → plain.
      .replace(/^(\s*)[*•+]\s+/gm, "$1- ")
      .replace(/__([^_\n]+)__/g, "**$1**")
      .replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?!\*)/g, "$1$2")
      .replace(/(^|\W)_(?!\s)([^_\n]+?)_(?=\W|$)/g, "$1$2")
      // Nested bullets flatten; stray spaces and blank runs collapse.
      .replace(/^\s+- /gm, "- ")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** "**a** b" → [{a, bold}, {b}]. An unclosed ** (mid-typewriter, or a sloppy reply) is dropped. */
export function parseInline(line: string): Span[] {
  const parts = line.split("**");
  // An even number of parts means one ** has no partner: fold the last two back together.
  if (parts.length % 2 === 0) parts.splice(parts.length - 2, 2, parts[parts.length - 2] + parts[parts.length - 1]);
  return parts.map((text, i) => ({ text, bold: i % 2 === 1 })).filter((s) => s.text.length > 0);
}

const BULLET = /^\s*[-•]\s+/;
const NUMBER = /^\s*\d{1,2}[.)]\s+/;

/** Splits a reply into paragraphs and lists. */
export function parseRich(text: string): Block[] {
  const blocks: Block[] = [];
  // A blank line ends the block in progress.
  let open = false;
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      open = false;
      continue;
    }
    const kind = BULLET.test(line) ? "ul" : NUMBER.test(line) ? "ol" : "p";
    const last = open ? blocks[blocks.length - 1] : undefined;
    if (kind === "p") {
      const spans = parseInline(line.trim());
      if (last?.type === "p") last.lines.push(spans);
      else blocks.push({ type: "p", lines: [spans] });
    } else {
      const spans = parseInline(line.replace(kind === "ul" ? BULLET : NUMBER, ""));
      if (last && last.type !== "p" && last.type === kind) last.items.push(spans);
      else blocks.push({ type: kind, items: [spans] });
    }
    open = true;
  }
  return blocks;
}

/** The reply as plain words (for history, previews and tests). */
export const plainText = (text: string) =>
  parseRich(text)
    .map((b) => (b.type === "p" ? b.lines : b.items).map((l) => l.map((s) => s.text).join("")).join("\n"))
    .join("\n\n");
