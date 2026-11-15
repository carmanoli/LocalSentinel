import { isRecord } from "@/privacy/profile";

const TECHNOLOGY_NAME_PATTERN =
  /^(?:\.NET|[A-Za-z][A-Za-z+# ]{0,47}(?:\.(?:NET|JS))?)$/i;
const VERSION_PATTERN =
  /^v?\d+(?:\.\d+){0,3}(?:-(?:alpha|beta|canary|dev|preview|rc)(?:[.-]\d+)?)?$/i;
const REGION_PATTERN =
  /^(?:[a-z]{2}-[a-z]+-\d+|(?:east|west|north|south|central)[a-z0-9]*|(?:europe|asia|australia|northamerica|southamerica|middleeast|africa)-[a-z0-9-]+\d+)$/i;
const BLOCKED_FIELD_RULES = [
  {
    label: "internal_hostname",
    pattern: /(^|_)(?:internal_)?hostnames?(?:_|$)/,
  },
  {
    label: "private_ip",
    pattern: /(^|_)(?:private_)?ip(?:_address|s)?(?:_|$)/,
  },
  { label: "ssh_keys", pattern: /(^|_)ssh_keys?(?:_|$)/ },
  {
    label: "credentials",
    pattern:
      /(^|_)(?:access_keys?|api_keys?|client_secrets?|credentials?|password|private_keys?|secrets?|tokens?)(?:_|$)/,
  },
];

export class ProfileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileValidationError";
  }
}

export function sanitizeProfileForQuery(profile: unknown): string[] {
  if (!isRecord(profile)) {
    throw new ProfileValidationError("The profile must be a JSON object.");
  }

  const technologies = profile.technologies;
  if (technologies === undefined) {
    return [];
  }
  if (!Array.isArray(technologies)) {
    throw new ProfileValidationError(
      "The technologies field must be an array.",
    );
  }

  const query = technologies.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new ProfileValidationError(
        `Technology entry ${index + 1} must be an object.`,
      );
    }

    const name = validateField(
      entry.name,
      TECHNOLOGY_NAME_PATTERN,
      `Technology entry ${index + 1} has an invalid name.`,
    );
    const version = validateOptionalField(
      entry.version,
      VERSION_PATTERN,
      `Technology entry ${index + 1} has an invalid version.`,
    );
    const region = validateOptionalField(
      entry.region,
      REGION_PATTERN,
      `Technology entry ${index + 1} has an invalid region.`,
    );

    return [name, version, region].filter(Boolean).join(" ");
  });

  return [...new Set(query)];
}

export function getBlockedFieldCategories(profile: unknown): string[] {
  const found = new Set<string>();

  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (!isRecord(value)) {
      return;
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      const normalizedKey = key
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      const rule = BLOCKED_FIELD_RULES.find(({ pattern }) =>
        pattern.test(normalizedKey),
      );

      if (rule) {
        found.add(rule.label);
      } else {
        visit(nestedValue);
      }
    }
  }

  visit(profile);
  return BLOCKED_FIELD_RULES.map(({ label }) => label).filter((label) =>
    found.has(label),
  );
}

function validateOptionalField(
  value: unknown,
  pattern: RegExp,
  errorMessage: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return validateField(value, pattern, errorMessage);
}

function validateField(
  value: unknown,
  pattern: RegExp,
  errorMessage: string,
): string {
  if (typeof value !== "string") {
    throw new ProfileValidationError(errorMessage);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > 64 || !pattern.test(normalized)) {
    throw new ProfileValidationError(errorMessage);
  }

  return normalized;
}
