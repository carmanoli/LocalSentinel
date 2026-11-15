import { isRecord } from "@/privacy/profile";

export const MODEL_GATEWAY_NAME = "Mozilla Otari";

const MODEL_CATALOG = {
  "gemini-2.5-flash": { label: "Gemini Flash", provider: "Google" },
  "claude-sonnet": { label: "Claude Sonnet", provider: "Anthropic" },
  grok: { label: "Grok", provider: "xAI" },
  "gpt-4o": { label: "GPT-4o", provider: "OpenAI" },
} as const;

const DEFAULT_MODEL_IDS = {
  feed_triage: "gemini-2.5-flash",
  cve_analysis: "claude-sonnet",
  realtime_search: "grok",
  final_summary: "gpt-4o",
} as const;

export type LogicalModelProfile = keyof typeof DEFAULT_MODEL_IDS;
export type ModelId = keyof typeof MODEL_CATALOG;
export type ModelRouteProfile = LogicalModelProfile | "default";

export interface ModelRoute {
  profile: ModelRouteProfile;
  modelId: ModelId;
  label: string;
  provider: string;
}

export interface ModelRouting {
  profiles: Record<LogicalModelProfile, ModelRoute>;
  fallback: ModelRoute;
}

export function resolveModelRouting(profile: unknown): ModelRouting {
  const modelProfiles =
    isRecord(profile) && isRecord(profile.modelProfiles)
      ? profile.modelProfiles
      : {};

  const profiles = Object.fromEntries(
    Object.entries(DEFAULT_MODEL_IDS).map(([logicalProfile, defaultModelId]) => {
      const selectedModelId = readModelId(modelProfiles[logicalProfile]);
      return [
        logicalProfile,
        createRoute(
          logicalProfile as LogicalModelProfile,
          selectedModelId ?? defaultModelId,
        ),
      ];
    }),
  ) as Record<LogicalModelProfile, ModelRoute>;

  return {
    profiles,
    fallback: createRoute("default", readModelId(modelProfiles.default) ?? "gpt-4o"),
  };
}

export class RetryableModelError extends Error {
  readonly reason: "provider-unavailable" | "rate-limit";

  constructor(reason: "provider-unavailable" | "rate-limit") {
    super(
      reason === "rate-limit"
        ? "The model provider rate limit was reached."
        : "The model provider is unavailable.",
    );
    this.name = "RetryableModelError";
    this.reason = reason;
  }
}

export interface ModelExecution<T> {
  value: T;
  route: ModelRoute;
  usedFallback: boolean;
}

export async function executeWithFallback<T>(
  query: readonly string[],
  primary: ModelRoute,
  fallback: ModelRoute,
  invoke: (route: ModelRoute, query: readonly string[]) => Promise<T>,
): Promise<ModelExecution<T>> {
  try {
    return {
      value: await invoke(primary, query),
      route: primary,
      usedFallback: false,
    };
  } catch (error) {
    if (!(error instanceof RetryableModelError)) {
      throw error;
    }

    if (primary.modelId === fallback.modelId) {
      throw error;
    }

    return {
      value: await invoke(fallback, query),
      route: fallback,
      usedFallback: true,
    };
  }
}

function readModelId(value: unknown): ModelId | undefined {
  if (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(MODEL_CATALOG, value)
  ) {
    return value as ModelId;
  }
  return undefined;
}

function createRoute(
  profile: ModelRouteProfile,
  modelId: ModelId,
): ModelRoute {
  return {
    profile,
    modelId,
    ...MODEL_CATALOG[modelId],
  };
}
