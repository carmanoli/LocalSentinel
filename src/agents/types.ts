import type { ModelRoute } from "@/gateway/model-routing";

export type AlertSeverity = "critical" | "high" | "moderate" | "low" | "info";
export type AlertKind = "cve" | "outage";
export type AgentStatus = "idle" | "running" | "complete" | "failed";

export interface AffectedVersionRange {
  lower?: { version: string; inclusive: boolean };
  upper?: { version: string; inclusive: boolean };
}

export interface RadarAlert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  summary: string;
  technology: string;
  status: string;
  publishedAt: string;
  sourceLabel: string;
  sourceUrl: string;
  affectedRanges?: readonly AffectedVersionRange[];
  matchedVersions?: string[];
  verification?: "affected" | "unverified";
}

export interface AgentStatuses {
  cloudStatus: AgentStatus;
  cve: AgentStatus;
  synthesizer: AgentStatus;
}

export interface AgentModelRoutes {
  cloudStatus: readonly [ModelRoute, ModelRoute];
  cve: ModelRoute;
  synthesizer: ModelRoute;
}

export interface DemoScanResult {
  alerts: RadarAlert[];
  unverifiedAlerts: RadarAlert[];
  statuses: AgentStatuses;
  models: AgentModelRoutes;
}
