import { describe, expect, it } from "vitest";
import { parseInfrastructureProfile } from "@/privacy/profile";
import { createDemoProfile } from "@/privacy/demo-profile";
import {
  getBlockedFieldCategories,
  ProfileValidationError,
  sanitizeProfileForQuery,
} from "@/privacy/sanitize-profile";

describe("parseInfrastructureProfile", () => {
  it("parses a JSON object without removing local-only fields", () => {
    const profile = parseInfrastructureProfile(
      '{"technologies":[],"hosts":["prod-web-01.internal"]}',
    );

    expect(profile.hosts).toEqual(["prod-web-01.internal"]);
  });

  it("rejects malformed JSON without echoing its contents", () => {
    expect(() => parseInfrastructureProfile('{"secret":"not-json"'))
      .toThrow("The selected file is not valid JSON.");
  });

  it("rejects JSON values that are not objects", () => {
    expect(() => parseInfrastructureProfile("[]"))
      .toThrow("The profile must be a JSON object.");
  });
});

describe("sanitizeProfileForQuery", () => {
  it("only emits validated technology, version, and region values", () => {
    const profile = {
      technologies: [
        { name: "AWS", region: "eu-west-1" },
        { name: "Ubuntu", version: "24.04" },
        { name: "Next.js", version: "15" },
      ],
      hostnames: ["prod-web-01.internal"],
      ipAddresses: ["10.0.14.22"],
      notes: "synthetic confidential note",
      apiKey: "synthetic-secret",
    };

    const query = sanitizeProfileForQuery(profile);

    expect(query).toEqual(["AWS eu-west-1", "Ubuntu 24.04", "Next.js 15"]);
    expect(JSON.stringify(query)).not.toContain("prod-web-01.internal");
    expect(JSON.stringify(query)).not.toContain("10.0.14.22");
    expect(JSON.stringify(query)).not.toContain("synthetic-secret");
  });

  it("deduplicates equivalent query entries", () => {
    expect(
      sanitizeProfileForQuery({
        technologies: [
          { name: "Next.js", version: "15" },
          { name: "Next.js", version: "15" },
        ],
      }),
    ).toEqual(["Next.js 15"]);
  });

  it("rejects hostname-like technology names and invalid region data", () => {
    expect(() =>
      sanitizeProfileForQuery({
        technologies: [{ name: "prod-web-01.internal" }],
      }),
    ).toThrow(ProfileValidationError);

    expect(() =>
      sanitizeProfileForQuery({
        technologies: [{ name: "prod-web-01" }],
      }),
    ).toThrow(ProfileValidationError);

    expect(() =>
      sanitizeProfileForQuery({
        technologies: [{ name: "AWS", region: "10.0.14.22" }],
      }),
    ).toThrow(ProfileValidationError);
  });

  it("omits invalid versions without leaking their contents", () => {
    expect(
      sanitizeProfileForQuery({
        technologies: [{ name: "Ubuntu", version: "24.04-10.0.14.22" }],
      }),
    ).toEqual(["Ubuntu"]);
  });

  it("returns an empty query when no technologies are configured", () => {
    expect(sanitizeProfileForQuery({ technologies: [] })).toEqual([]);
    expect(sanitizeProfileForQuery({})).toEqual([]);
  });

  it("keeps the in-memory demo profile sensitive fields out of its query", () => {
    const profile = createDemoProfile();
    const query = sanitizeProfileForQuery(profile);

    expect(query).toEqual([
      "AWS eu-west-1",
      "Azure westeurope",
      "Ubuntu 24.04",
      "Next.js 15.5.27",
    ]);
    expect(getBlockedFieldCategories(profile)).toEqual([
      "internal_hostname",
      "private_ip",
      "ssh_keys",
    ]);
    expect(JSON.stringify(query)).not.toContain("prod-web-01.internal");
    expect(JSON.stringify(query)).not.toContain("10.0.14.22");
    expect(JSON.stringify(query)).not.toContain(
      "SYNTHETIC-DEMO-KEY-NOT-A-REAL-SECRET",
    );
  });

  it("classifies nested API credentials without exposing their values", () => {
    const profile = {
      modelProfiles: {
        apiKey: "SYNTHETIC-DEMO-KEY-NOT-A-REAL-SECRET",
      },
    };

    expect(getBlockedFieldCategories(profile)).toEqual(["credentials"]);
  });
});
