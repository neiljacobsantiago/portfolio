"use client";

import dynamic from "next/dynamic";
import type { ChatCard, ToolId } from "@/lib/tools";

// Each tool is its own chunk: a project page loads only the tool it embeds,
// the Lab streams them in as they render, and Whisper's weight never rides
// along with the rest. They still render on the server, so nothing jumps.
function Loading() {
  return <div aria-hidden className="h-64 animate-pulse rounded-[2px] bg-ink/[0.04]" />;
}
const BankoTool = dynamic(() => import("./BankoTool"), { loading: Loading });
const BuildItTool = dynamic(() => import("./BuildItTool"), { loading: Loading });
const LinkCheckTool = dynamic(() => import("./LinkCheckTool"), { loading: Loading });
const MemoryTool = dynamic(() => import("./MemoryTool"), { loading: Loading });
const ParkMateTool = dynamic(() => import("./ParkMateTool"), { loading: Loading });
const PathoScanTool = dynamic(() => import("./PathoScanTool"), { loading: Loading });
const QuoteTool = dynamic(() => import("./QuoteTool"), { loading: Loading });
const RegistrarTool = dynamic(() => import("./RegistrarTool"), { loading: Loading });
const SubnetTool = dynamic(() => import("./SubnetTool"), { loading: Loading });
const WhisperTool = dynamic(() => import("./WhisperTool"), { loading: Loading });
const WorkTayoTool = dynamic(() => import("./WorkTayoTool"), { loading: Loading });

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
        return <QuoteTool service={card.service} package={card.package} people={card.people} addOns={card.addOns} compact={compact} />;
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
    case "whisper":
      return <WhisperTool compact={compact} />;
    case "registrar":
      return <RegistrarTool compact={compact} />;
    case "banko":
      return <BankoTool compact={compact} />;
    case "buildit":
      return <BuildItTool compact={compact} />;
    case "parkmate":
      return <ParkMateTool compact={compact} />;
    case "worktayo":
      return <WorkTayoTool compact={compact} />;
    default:
      return null;
  }
}

/** Which Lab tool a chat card belongs to (for its header and "Open in Lab" link). */
export const toolOfCard = (card: ChatCard): ToolId | null =>
  card.kind === "vlsm" ? "subnet" : (["subnet", "memory", "link", "pathoscan", "quote"] as const).find((t) => t === card.kind) ?? null;
