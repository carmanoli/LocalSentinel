import type { LogicalModelProfile } from "@/gateway/model-routing";

export interface NetworkAgentDefinition {
  id: "cloud-status" | "cve" | "synthesizer";
  name: string;
  modelProfiles: LogicalModelProfile[];
}

export const COGNIZANT_NEURO_NETWORK = {
  platform: "Cognizant Neuro SAN",
  name: "LocalSentinel risk radar",
  agents: [
    {
      id: "cloud-status",
      name: "Cloud Status Agent",
      modelProfiles: ["feed_triage", "realtime_search"],
    },
    {
      id: "cve",
      name: "CVE Agent",
      modelProfiles: ["cve_analysis"],
    },
    {
      id: "synthesizer",
      name: "Synthesizer Agent",
      modelProfiles: ["final_summary"],
    },
  ] satisfies NetworkAgentDefinition[],
  edges: [
    { from: "orchestrator", to: "cloud-status", mode: "parallel" },
    { from: "orchestrator", to: "cve", mode: "parallel" },
    { from: "cloud-status", to: "synthesizer", mode: "join" },
    { from: "cve", to: "synthesizer", mode: "join" },
  ],
} as const;
