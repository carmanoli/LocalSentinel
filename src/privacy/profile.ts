export type InfrastructureProfile = Readonly<Record<string, unknown>>;

export class ProfileFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileFormatError";
  }
}

export function parseInfrastructureProfile(
  contents: string,
): InfrastructureProfile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents) as unknown;
  } catch {
    throw new ProfileFormatError("The selected file is not valid JSON.");
  }

  if (!isRecord(parsed)) {
    throw new ProfileFormatError("The profile must be a JSON object.");
  }

  return parsed;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
