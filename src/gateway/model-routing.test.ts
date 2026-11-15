import { describe, expect, it, vi } from "vitest";
import { createDemoProfile } from "@/privacy/demo-profile";
import { sanitizeProfileForQuery } from "@/privacy/sanitize-profile";
import {
  executeWithFallback,
  resolveModelRouting,
  RetryableModelError,
} from "@/gateway/model-routing";

describe("resolveModelRouting", () => {
  it("uses the configured default model profiles", () => {
    const routing = resolveModelRouting({});

    expect(routing.profiles.feed_triage.label).toBe("Gemini Flash");
    expect(routing.profiles.cve_analysis.label).toBe("Claude Sonnet");
    expect(routing.profiles.realtime_search.label).toBe("Grok");
    expect(routing.profiles.final_summary.label).toBe("GPT-4o");
    expect(routing.fallback.label).toBe("GPT-4o");
  });

  it("accepts only known local model IDs and ignores secrets", () => {
    const routing = resolveModelRouting({
      modelProfiles: {
        feed_triage: "gpt-4o",
        cve_analysis: "private-token-must-not-be-a-model",
        apiKey: "SYNTHETIC-DEMO-KEY-NOT-A-REAL-SECRET",
      },
    });

    expect(routing.profiles.feed_triage.label).toBe("GPT-4o");
    expect(routing.profiles.cve_analysis.label).toBe("Claude Sonnet");
    expect(JSON.stringify(routing)).not.toContain("SYNTHETIC-DEMO-KEY");
  });
});

describe("executeWithFallback", () => {
  it("retries with the default route using the same sanitized query", async () => {
    const routing = resolveModelRouting({});
    const query = sanitizeProfileForQuery(createDemoProfile());
    const attempts: Array<{ modelId: string; query: readonly string[] }> = [];
    const invoke = vi.fn(async (route, attemptQuery) => {
      attempts.push({ modelId: route.modelId, query: attemptQuery });
      if (attempts.length === 1) {
        throw new RetryableModelError("rate-limit");
      }
      return "fallback result";
    });

    const result = await executeWithFallback(
      query,
      routing.profiles.cve_analysis,
      routing.fallback,
      invoke,
    );

    expect(result.value).toBe("fallback result");
    expect(result.route.label).toBe("GPT-4o");
    expect(result.usedFallback).toBe(true);
    expect(attempts.map(({ modelId }) => modelId)).toEqual([
      "claude-sonnet",
      "gpt-4o",
    ]);
    expect(attempts[0].query).toEqual(query);
    expect(attempts[1].query).toEqual(query);
    expect(JSON.stringify(attempts)).not.toContain("prod-web-01.internal");
    expect(JSON.stringify(attempts)).not.toContain("10.0.14.22");
  });

  it("does not hide non-retryable failures", async () => {
    const routing = resolveModelRouting({});
    const invoke = vi.fn().mockRejectedValue(new Error("invalid request"));

    await expect(
      executeWithFallback(
        ["Next.js 15"],
        routing.profiles.cve_analysis,
        routing.fallback,
        invoke,
      ),
    ).rejects.toThrow("invalid request");
    expect(invoke).toHaveBeenCalledOnce();
  });
});
