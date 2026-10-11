import type { Metadata } from "next";
import { Activity, Database } from "lucide-react";
import PageHeader, { PageShell } from "@/components/layout/PageHeader";
import { reveal } from "@/lib/reveal";

export const metadata: Metadata = {
  title: "Logs",
  description: "NEIL.OS system telemetry log.",
};

const sysLogs = [
  { time: "09:55:23", status: "OK", process: "SYS_BOOT", detail: "NEIL.OS Kernel Initialized" },
  { time: "09:55:24", status: "OK", process: "NET_CONFIG", detail: "IPv4 & IPv6 Dual-Stack Enabled" },
  { time: "09:55:24", status: "OK", process: "ENV_MOUNT", detail: "Local Variables Loaded" },
  { time: "09:55:25", status: "WARN", process: "API_POLL", detail: "GitHub Telemetry Rate Limit Near" },
  { time: "09:55:25", status: "OK", process: "AI_NODE", detail: "Gemini 3.5-flash-lite Socket Bound" },
  { time: "09:55:28", status: "OK", process: "SEC_AUDIT", detail: "Zero Vulnerabilities Detected" },
  { time: "09:56:01", status: "OK", process: "USR_SESS", detail: "Anonymous Connection Established" },
  { time: "09:56:12", status: "INFO", process: "ROUTING", detail: "Navigated to /Directory/Logs" },
] as const;

const statusClass = {
  OK: "bg-green-500/20 text-green-500",
  WARN: "bg-yellow-500/20 text-yellow-500",
  INFO: "bg-butter/20 text-butter",
};

export default function LogsPage() {
  return (
    <PageShell>
      <PageHeader section="Logs" icon={<Database />} title={<>System <br /> Telemetry Logs</>} />

      <div className="relative overflow-hidden border border-butter/20 bg-black/80 p-4 font-mono text-xs sm:p-6 sm:text-sm">
        <Activity className="absolute top-4 right-4 h-6 w-6 animate-pulse text-accentRed opacity-30" aria-hidden />

        <ol className="custom-scrollbar flex max-h-[60dvh] flex-col gap-3 overflow-y-auto">
          {sysLogs.map((log, i) => (
            <li key={i} {...reveal("left", i * 80)} className="grid grid-cols-[auto_auto_1fr] items-start gap-x-3 gap-y-1 text-butter/80 sm:grid-cols-[auto_auto_7rem_1fr] sm:items-center sm:gap-4">
              <span className="shrink-0 text-butter/40">[{log.time}]</span>
              <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase ${statusClass[log.status]}`}>{log.status}</span>
              <span className="text-accentRed">{log.process}</span>
              <span className="col-span-3 break-words sm:col-span-1">{log.detail}</span>
            </li>
          ))}
          <li className="mt-4 flex items-center gap-2">
            <span className="text-accentRed">root@neilos:~#</span>
            <span className="animate-blink h-4 w-2 bg-butter/80" />
          </li>
        </ol>
      </div>
    </PageShell>
  );
}
