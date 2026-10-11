import type { Metadata } from "next";
import { Terminal as TermIcon } from "lucide-react";
import PageHeader, { PageShell } from "@/components/layout/PageHeader";
import Terminal from "@/components/terminal/Terminal";

export const metadata: Metadata = {
  title: "Terminal",
  description: "An interactive shell for exploring the portfolio. Try 'help', 'ls' or 'cd systems'.",
};

export default function TerminalPage() {
  return (
    <PageShell>
      <PageHeader
        section="Terminal"
        icon={<TermIcon />}
        title="Root Terminal"
        lead="Type 'help' for directives, 'ls' to list directories, or 'cd systems' to jump around the site."
      />
      <Terminal />
    </PageShell>
  );
}
