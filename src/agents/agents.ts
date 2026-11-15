import { DEMO_ALERTS, hasTraceableSource, sortAlertsBySeverity } from "@/agents/demo-alerts";
import { matchCveVersions } from "@/agents/version-matching";
import type { RadarAlert } from "@/agents/types";

export async function runCloudStatusAgent(
  query: readonly string[],
): Promise<RadarAlert[]> {
  await waitForDemoStage();
  return filterAlerts(query, "outage");
}

export async function runCveAgent(
  query: readonly string[],
): Promise<RadarAlert[]> {
  await waitForDemoStage();
  return DEMO_ALERTS.filter((alert) => alert.kind === "cve")
    .map((alert) => matchCveVersions(alert, query))
    .filter((alert): alert is RadarAlert => alert !== null);
}

export async function runSynthesizerAgent(
  agentResults: readonly (readonly RadarAlert[])[],
): Promise<RadarAlert[]> {
  const deduplicated = new Map<string, RadarAlert>();
  for (const result of agentResults) {
    for (const alert of result) {
      if (hasTraceableSource(alert)) {
        deduplicated.set(alert.id, alert);
      }
    }
  }

  return sortAlertsBySeverity([...deduplicated.values()]);
}

function filterAlerts(
  query: readonly string[],
  kind: RadarAlert["kind"],
): RadarAlert[] {
  return DEMO_ALERTS.filter(
    (alert) =>
      alert.kind === kind &&
      query.some((entry) =>
        entry.toLowerCase().startsWith(alert.technology.toLowerCase()),
      ),
  );
}

function waitForDemoStage(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 220));
}
