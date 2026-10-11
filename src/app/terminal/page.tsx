import type { Metadata } from "next";
import PageHeader, { Container } from "@/components/layout/PageHeader";
import Terminal from "@/components/terminal/Terminal";

export const metadata: Metadata = {
  title: "Terminal",
  description: "A small interactive shell for the curious. Try 'help', 'ls' or 'cd photography'.",
};

export default function TerminalPage() {
  return (
    <>
      <PageHeader
        eyebrow="For the curious"
        title={<>The <em className="font-serif text-ember">back</em> room.</>}
        lead="Where this site started: a command line. Type 'help' for commands, 'ls' to list pages, or 'cd photography' to jump around."
      />
      <Container className="pb-24 md:pb-32">
        <Terminal />
      </Container>
    </>
  );
}
