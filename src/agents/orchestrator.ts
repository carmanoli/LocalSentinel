import { runCloudStatusAgent, runCveAgent, runSynthesizerAgent } from "@/agents/agents";
import type {
  AgentModelRoutes,
  AgentStatuses,
  DemoScanResult,
} from "@/agents/types";

const INITIAL_STATUSES: AgentStatuses = {
  cloudStatus: "idle",
  cve: "idle",
  synthesizer: "idle",
};

export async function runDemoOrchestration(
  query: readonly string[],
  models: AgentModelRoutes,
  onStatusChange: (statuses: AgentStatuses) => void,
): Promise<DemoScanResult> {
  let statuses = { ...INITIAL_STATUSES };
  const publishStatuses = () => onStatusChange({ ...statuses });

  statuses = {
    cloudStatus: "running",
    cve: "running",
    synthesizer: "idle",
  };
  publishStatuses();

  try {
    const [cloudResults, cveResults] = await Promise.all([
      runCloudStatusAgent(query),
      runCveAgent(query),
    ]);

    statuses = {
      cloudStatus: "complete",
      cve: "complete",
      synthesizer: "running",
    };
    publishStatuses();

    const alerts = await runSynthesizerAgent([cloudResults, cveResults]);
    statuses = {
      cloudStatus: "complete",
      cve: "complete",
      synthesizer: "complete",
    };
    publishStatuses();

    return { alerts, statuses, models };
  } catch (error) {
    statuses = {
      cloudStatus: statuses.cloudStatus === "running" ? "failed" : statuses.cloudStatus,
      cve: statuses.cve === "running" ? "failed" : statuses.cve,
      synthesizer:
        statuses.synthesizer === "running" ? "failed" : statuses.synthesizer,
    };
    publishStatuses();
    throw error;
  }
}

export function initialAgentStatuses(): AgentStatuses {
  return { ...INITIAL_STATUSES };
}
