"use client";

import type { ChatCard, ToolId } from "@/lib/tools";
import LinkCheckTool from "./LinkCheckTool";
import MemoryTool from "./MemoryTool";
import PathoScanTool from "./PathoScanTool";
import QuoteTool from "./QuoteTool";
import SubnetTool from "./SubnetTool";

/** Renders a Lab tool by id, or pre-filled from a NeilAI card. */
export default function ToolView({ id, card, compact }: { id?: ToolId; card?: ChatCard; compact?: boolean }) {
  if (card) {
    switch (card.kind) {
      case "subnet":
        return <SubnetTool initial={card.input} compact={compact} />;
      case "vlsm":
        return <SubnetTool mode="vlsm" initial={card.base} initialNeeds={card.needs} compact={compact} />;
      case "memory":
        return <MemoryTool blocks={card.blocks} processes={card.processes} algorithm={card.algorithm} compact={compact} />;
      case "link":
        return <LinkCheckTool initial={card.url} compact={compact} />;
      case "pathoscan":
        return <PathoScanTool species={card.species} confidence={card.confidence} compact={compact} />;
      case "quote":
        return <QuoteTool service={card.service} package={card.package} people={card.people} compact={compact} />;
      default:
        return null;
    }
  }
  switch (id) {
    case "subnet":
      return <SubnetTool compact={compact} />;
    case "memory":
      return <MemoryTool compact={compact} />;
    case "link":
      return <LinkCheckTool compact={compact} />;
    case "pathoscan":
      return <PathoScanTool compact={compact} />;
    case "quote":
      return <QuoteTool compact={compact} />;
    default:
      return null;
  }
}

/** Which Lab tool a chat card belongs to (for its header and "Open in Lab" link). */
export const toolOfCard = (card: ChatCard): ToolId | null =>
  card.kind === "vlsm" ? "subnet" : (["subnet", "memory", "link", "pathoscan", "quote"] as const).find((t) => t === card.kind) ?? null;
