import type { AlertSeverity, RadarAlert } from "@/agents/types";

export const DEMO_ALERTS: readonly RadarAlert[] = [
  {
    id: "CVE-2026-96889",
    kind: "cve",
    severity: "critical",
    title: "RCE in Next.js image optimization with SVG files",
    summary:
      "The official advisory lists Next.js through 15.5.27 as affected and 15.5.28 as patched. Verify the exact deployed version and whether image optimization applies.",
    technology: "Next.js",
    status: "Patch verification required",
    publishedAt: "2026-10-14",
    sourceLabel: "Vercel Next.js security advisory",
    sourceUrl:
      "https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw",
  },
  {
    id: "AZURE-NETWORKING-2026-09",
    kind: "outage",
    severity: "high",
    title: "Azure networking gateway control-plane incident",
    summary:
      "A resolved incident caused intermittent management failures and temporary connectivity loss for several Azure networking services. Customer impact ended on 1 October 2026.",
    technology: "Azure",
    status: "Resolved · historical demo alert",
    publishedAt: "2026-09-30",
    sourceLabel: "Azure status history",
    sourceUrl: "https://azure.status.microsoft/en-us/status/history/",
  },
  {
    id: "CVE-2026-119348",
    kind: "cve",
    severity: "moderate",
    title: "Cross-client response disclosure in self-hosted Next.js",
    summary:
      "The advisory affects versions through 15.5.28 in a specific self-hosted response-forwarding scenario; version 15.5.29 is patched. Confirm the full version and deployment conditions.",
    technology: "Next.js",
    status: "Patch verification required",
    publishedAt: "2026-11-03",
    sourceLabel: "Vercel Next.js security advisory",
    sourceUrl:
      "https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385",
  },
];

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
  info: 0,
};

const TRUSTED_SOURCE_HOSTS = new Set([
  "github.com",
  "azure.status.microsoft",
]);

export function sortAlertsBySeverity(alerts: readonly RadarAlert[]): RadarAlert[] {
  return [...alerts].sort(
    (left, right) =>
      SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity] ||
      right.publishedAt.localeCompare(left.publishedAt),
  );
}

export function hasTraceableSource(alert: RadarAlert): boolean {
  try {
    const source = new URL(alert.sourceUrl);
    return (
      source.protocol === "https:" &&
      TRUSTED_SOURCE_HOSTS.has(source.hostname) &&
      alert.sourceLabel.trim().length > 0
    );
  } catch {
    return false;
  }
}
