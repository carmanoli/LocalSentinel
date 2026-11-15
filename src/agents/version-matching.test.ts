import { describe, expect, it } from "vitest";
import { DEMO_ALERTS } from "@/agents/demo-alerts";
import { matchCveVersions } from "@/agents/version-matching";
import { runCveAgent } from "@/agents/agents";
import { runDemoOrchestration } from "@/agents/orchestrator";
import { resolveModelRouting } from "@/gateway/model-routing";
import { sanitizeProfileForQuery } from "@/privacy/sanitize-profile";

const svg = DEMO_ALERTS[0];
const responses = DEMO_ALERTS[2];

describe("published advisory ranges", () => {
  it.each([
    [svg, "9.9.9", false],
    [svg, "10.0.0", true],
    [svg, "15.5.27", true],
    [svg, "15.5.28", false],
    [svg, "16.0.0", false],
    [svg, "16.0.1", true],
    [svg, "16.4.0", true],
    [svg, "16.4.1", false],
    [responses, "0.0.0", true],
    [responses, "15.5.28", true],
    [responses, "15.5.29", false],
    [responses, "16.0.0", true],
    [responses, "16.4.4", true],
    [responses, "16.4.5", false],
    [svg, "16.4.6", false],
    [responses, "16.4.6", false],
  ])("%s at %s has affected=%s", (alert, version, affected) => {
    expect(matchCveVersions(alert, [`Next.js ${version}`])?.verification === "affected").toBe(affected);
    if (!affected) expect(matchCveVersions(alert, [`Next.js ${version}`])).toBeNull();
  });
});

describe("version matching", () => {
  it.each(["Next.js", "Next.js 15", "Next.js 15.5", "Next.js invalid", "Next.js 01.5.0", "Next.js 15.5.27.1"])("keeps %s unverified", (entry) => {
    expect(matchCveVersions(svg, [entry])?.verification).toBe("unverified");
  });

  it("identifies only affected versions once when corrected and duplicate entries coexist", async () => {
    const results = await runCveAgent(["Next.js 16.4.6", "Next.js 15.5.27", "Next.js 15.5.27", "Next.js 15"]);
    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(result.verification).toBe("affected");
      expect(result.matchedVersions).toEqual(["15.5.27"]);
      expect(result.sourceUrl).toMatch(/^https:/);
    }
  });

  it("requires a full technology name", () => {
    expect(matchCveVersions(svg, ["Next.jsOther 15.5.27"])).toBeNull();
    expect(matchCveVersions(svg, ["next.JS 15.5.27"])?.verification).toBe("affected");
  });

  it("supports exclusive upper bounds and semantic prerelease ordering", () => {
    const alert = { ...svg, affectedRanges: [{ lower: { version: "15.0.0-rc.2", inclusive: true }, upper: { version: "15.0.0", inclusive: false } }] };
    expect(matchCveVersions(alert, ["Next.js 15.0.0-rc.1"])).toBeNull();
    expect(matchCveVersions(alert, ["Next.js 15.0.0-rc.10"])?.verification).toBe("affected");
    expect(matchCveVersions(alert, ["Next.js 15.0.0"])).toBeNull();
    expect(matchCveVersions(svg, ["Next.js v15.5.27+build.1"])?.verification).toBe("affected");
  });

  it.each([undefined, [], [{ upper: { version: "15", inclusive: true } }]])("keeps unverifiable ranges pending", (affectedRanges) => {
    expect(matchCveVersions({ ...svg, affectedRanges }, ["Next.js 15.5.27"])?.verification).toBe("unverified");
  });

  it("separates pending CVEs through the profile sanitizer and orchestration while retaining incidents", async () => {
    const routing = resolveModelRouting({});
    const models = { cloudStatus: [routing.profiles.feed_triage, routing.profiles.realtime_search] as const, cve: routing.profiles.cve_analysis, synthesizer: routing.profiles.final_summary };
    for (const version of [undefined, "15", "15.5", "prod-web-01.internal", 15]) {
      const query = sanitizeProfileForQuery({ technologies: [{ name: "Next.js", version }, { name: "Azure", region: "westeurope" }] });
      expect(JSON.stringify(query)).not.toContain("prod-web-01.internal");
      const result = await runDemoOrchestration(query, models, () => {});
      expect(result.alerts.map((alert) => alert.kind)).toEqual(["outage"]);
      expect(result.unverifiedAlerts.map((alert) => alert.id)).toEqual([svg.id, responses.id]);
    }
    const result = await runDemoOrchestration(["Next.js 16.4.6"], models, () => {});
    expect(result.alerts).toEqual([]);
    expect(result.unverifiedAlerts).toEqual([]);
  });
});
