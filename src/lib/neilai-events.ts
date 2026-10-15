import type { ChatCard } from "@/lib/tools";

// Any part of the site can open NeilAI with a question or a tool card:
// the command palette, "Ask NeilAI" buttons in the Lab, project pages…

export const ASK_EVENT = "neilai:ask";

export interface AskDetail {
  prompt?: string;
  card?: ChatCard;
  /** What NeilAI says above the card when one is opened directly. */
  intro?: string;
}

export function askNeilAI(detail: AskDetail = {}) {
  dispatchEvent(new CustomEvent<AskDetail>(ASK_EVENT, { detail }));
}

// A request made before the chat panel has loaded waits here until it mounts.
let pending: AskDetail | null = null;
export const stashAsk = (detail: AskDetail) => {
  pending = detail;
};
export const takeAsk = () => {
  const p = pending;
  pending = null;
  return p;
};
