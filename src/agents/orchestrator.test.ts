import { describe, expect, it } from "vitest";
import { createDemoProfile } from "@/privacy/demo-profile";
import { sanitizeProfileForQuery } from "@/privacy/sanitize-profile";
import { runDemoOrchestration } from "@/agents/orchestrator";
import { resolveModelRouting } from "@/gateway/model-routing";
import type { AgentStatuses } from "@/agents/types";

describe("runDemoOrchestration", () => {
  it("runs source agents in parallel and synthesizes traceable, stack-filtered alerts", async () => {
    const query = sanitizeProfileForQuery(createDemoProfile());
    const routing = resolveModelRouting({});
    const models = {
      cloudStatus: [
        routing.profiles.feed_triage,
        routing.profiles.realtime_search,
      ] as const,
      cve: routing.profiles.cve_analysis,
      synthesizer: routing.profiles.final_summary,
    };
    const statusUpdates: AgentStatuses[] = [];

    const result = await runDemoOrchestration(query, models, (status) => {
      statusUpdates.push(status);
    });

    expect(statusUpdates[0]).toEqual({
      cloudStatus: "running",
      cve: "running",
      synthesizer: "idle",
    });
    expect(result.statuses).toEqual({
      cloudStatus: "complete",
      cve: "complete",
      synthesizer: "complete",
    });
    expect(result.alerts.map(({ id }) => id)).toEqual([
      "CVE-2026-96889",
      "AZURE-NETWORKING-2026-09",
      "CVE-2026-119348",
    ]);
    expect(result.alerts.every((alert) => /^https:\/\//.test(alert.sourceUrl)))
      .toBe(true);
    expect(result.alerts.some(({ technology }) => technology === "AWS")).toBe(
      false,
    );
  });
});
