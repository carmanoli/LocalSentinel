"use client";

import { useState } from "react";
import {
  getBlockedFieldCategories,
  sanitizeProfileForQuery,
  ProfileValidationError,
} from "@/privacy/sanitize-profile";
import { createDemoProfile } from "@/privacy/demo-profile";
import {
  ProfileAccessError,
  readInfrastructureProfile,
} from "@/privacy/read-profile";
import { ProfileFormatError } from "@/privacy/profile";
import {
  initialAgentStatuses,
  runDemoOrchestration,
} from "@/agents/orchestrator";
import type {
  AgentModelRoutes,
  AgentStatuses,
  RadarAlert,
} from "@/agents/types";
import {
  MODEL_GATEWAY_NAME,
  resolveModelRouting,
} from "@/gateway/model-routing";

type ModelRouting = ReturnType<typeof resolveModelRouting>;

const INITIAL_ROUTING = resolveModelRouting({});

export function RiskCockpit() {
  const [view, setView] = useState("Radar Overview");
  const [query, setQuery] = useState<string[]>([]);
  const [blockedFields, setBlockedFields] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<AgentStatuses>(
    initialAgentStatuses(),
  );
  const [alerts, setAlerts] = useState<RadarAlert[]>([]);
  const [unverifiedAlerts, setUnverifiedAlerts] = useState<RadarAlert[]>([]);
  const [routing, setRouting] = useState<ModelRouting>(INITIAL_ROUTING);
  const [profileLabel, setProfileLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loadDemoProfile() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await processProfile(createDemoProfile(), "Synthetic demo profile");
    } catch (error) {
      reportError(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function chooseProfile() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const profile = await readInfrastructureProfile();
      await processProfile(profile, "Local infra-profile.json");
    } catch (error) {
      reportError(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function rerunDemoScan() {
    if (!profileLabel) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await runDemoOrchestration(
        query,
        getAgentModelRoutes(routing),
        setStatuses,
      );
      setAlerts(result.alerts);
      setUnverifiedAlerts(result.unverifiedAlerts);
    } catch {
      setErrorMessage("The local demo scan could not be completed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function processProfile(
    profile: unknown,
    label: string,
  ): Promise<void> {
    const safeQuery = sanitizeProfileForQuery(profile);
    const safeBlockedFields = getBlockedFieldCategories(profile);
    const safeRouting = resolveModelRouting(profile);
    setQuery(safeQuery);
    setBlockedFields(safeBlockedFields);
    setRouting(safeRouting);
    setProfileLabel(label);
    setStatuses(initialAgentStatuses());
    setAlerts([]);
    setUnverifiedAlerts([]);

    const result = await runDemoOrchestration(
      safeQuery,
      getAgentModelRoutes(safeRouting),
      setStatuses,
    );
    setAlerts(result.alerts);
    setUnverifiedAlerts(result.unverifiedAlerts);
  }

  function reportError(error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }

    setErrorMessage(
      error instanceof
        Error &&
        (error instanceof ProfileAccessError ||
          error instanceof ProfileFormatError ||
          error instanceof ProfileValidationError)
        ? error.message
        : "The local profile could not be processed.",
    );
    setAlerts([]);
    setUnverifiedAlerts([]);
  }

  const models = getAgentModelRoutes(routing);
  const hasProfile = profileLabel !== null;

  const views = ["Radar Overview", "Privacy & Profile Inspector", "Agents & Otari Routing", "How It Works"];
  const completed = Object.values(statuses).filter((status) => status === "complete").length;
  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <button type="button" onClick={() => setView("Radar Overview")} className="brand text-left">Local<span>Sentinel</span></button>
        <p className="mt-2 text-xs text-slate-500">Infrastructure risk radar</p>
        <nav aria-label="Main navigation" className="mt-10 flex flex-col gap-2">{views.map((item) => <button key={item} type="button" className={view === item ? "nav-button nav-active" : "nav-button"} aria-current={view === item ? "page" : undefined} onClick={() => setView(item)}>{item}</button>)}</nav>
        <div className="mt-auto pt-10 text-xs leading-6 text-slate-500"><p className="text-emerald-400">Zero-Upload architecture</p><p>Static browser runtime</p><p>Open Agentic Web Challenge</p></div>
      </aside>
      <main className="dashboard-main">
        <header className="mb-6 flex flex-wrap justify-between gap-3"><div><p className="mb-2 text-xs uppercase tracking-widest text-cyan-400">LocalSentinel workspace</p><h1 className="text-3xl font-semibold tracking-tight">{view}</h1></div><span className="h-fit rounded-full border border-cyan-900 bg-cyan-950/40 px-3 py-2 text-xs text-cyan-200">Local demo mode</span></header>
        <p className="mb-5 text-xs text-slate-400">Agents use local demo snapshots. All profile processing stays in this browser.</p>
        {errorMessage && <p className="mb-4 rounded-lg border border-red-900 p-3 text-sm text-red-200" role="alert">{errorMessage}</p>}
        {view === "Radar Overview" && <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-slate-400">Discover the risks that match your stack.</p><div className="flex flex-wrap gap-3"><button className="primary-button" type="button" disabled={isLoading} onClick={() => void loadDemoProfile()}>{isLoading ? "Running local radar..." : "Run 1-Click Demo Radar"}</button><button className="secondary-button" type="button" disabled={isLoading} onClick={() => void chooseProfile()}>Load Local Profile</button></div></div>
          <div className="status-grid mb-5" aria-live="polite">
            <div><p>Privacy Status</p><strong>Zero-Upload Active - {blockedFields.length} sensitive field categories blocked</strong></div>
            <div><p>Agents Status</p><strong>{isLoading ? "Scanning..." : completed + "/3 Completed"}</strong></div>
            <div><p>Active Alerts Count</p><strong>{alerts.length}</strong></div>
          </div>
        <Panel eyebrow="Provenance required" title="Prioritized alerts">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              {hasProfile
                ? `${alerts.length} stack-matched demo alert${alerts.length === 1 ? "" : "s"}`
                : "Waiting for a loaded stack"}
            </p>
            <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] uppercase tracking-wider text-slate-400">
              Severity sorted
            </span>
          </div>

          <div aria-live="polite" className="mt-4 grid gap-3 xl:grid-cols-3">
            {alerts.map((alert) => (
              <AlertCard alert={alert} key={alert.id} />
            ))}
            {hasProfile && !isLoading && alerts.length === 0 && (
              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">
                Nenhum dos avisos analisados corresponde às versões fornecidas.
              </div>
            )}
            {!hasProfile && (
              <div className="rounded-lg border border-dashed border-slate-800 p-4 text-sm leading-6 text-slate-500">
                Load the demo profile to see stack-filtered CVEs and a resolved
                cloud incident. Demo records link to their official sources.
              </div>
            )}
          </div>

          <p className="mt-4 text-[11px] leading-5 text-slate-500">
            Demo records are illustrative snapshots, not live status checks.
            Always verify the linked advisory or provider notice.
          </p>
        </Panel>

          {unverifiedAlerts.length > 0 && (
            <section className="mt-5" aria-labelledby="unverified-heading">
              <h2 id="unverified-heading" className="text-lg font-semibold">Por verificar</h2>
              <p className="mt-2 text-sm text-slate-400">A versão está ausente, incompleta ou inválida, ou o aviso não tem intervalos verificáveis. Forneça uma versão exata e consulte a fonte oficial.</p>
              <div className="mt-3 grid gap-3 xl:grid-cols-3">
                {unverifiedAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
              </div>
            </section>
          )}
        </section>}
        {view === "Privacy & Profile Inspector" && <div className="privacy-view">        <Panel
          eyebrow="Local only"
          title="Inventory & privacy shield"
        >
          <p className="text-sm leading-6 text-slate-400">
            Select a local file or load a synthetic profile. Both paths use the
            same in-browser sanitizer.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-cyan-700 bg-cyan-950/70 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-900 disabled:cursor-wait disabled:opacity-50"
              disabled={isLoading}
              onClick={() => void loadDemoProfile()}
              type="button"
            >
              Run 1-Click Demo Radar
            </button>
            <button
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-50"
              disabled={isLoading}
              onClick={() => void chooseProfile()}
              type="button"
            >
              Load Local Profile
            </button>
          </div>

          <a
            className="mt-3 inline-flex text-xs text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-slate-200"
            download="infra-profile.json"
            href="/infra-profile.example.json"
          >
            Download sample infra-profile.json
          </a>

          {errorMessage && (
            <p
              aria-live="polite"
              className="mt-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-200"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <div className="privacy-blocked mt-6 border-t border-slate-800 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-200">
                Sensitive fields blocked
              </h3>
              <span className="text-[11px] uppercase tracking-wider text-red-300">
                Never transmitted
              </span>
            </div>
            {blockedFields.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {blockedFields.map((field) => (
                  <li
                    className="flex flex-col gap-1 rounded-md border border-red-950 bg-red-950/40 px-3 py-2 font-mono text-xs text-red-200 sm:flex-row sm:items-center sm:justify-between"
                    key={field}
                  >
                    <span>{field}</span>
                    <span className="text-[11px] text-red-400">
                      BLOCKED · value hidden
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                {hasProfile
                  ? "No recognized sensitive fields found."
                  : "Load a profile to inspect locally blocked field categories."}
              </p>
            )}
          </div>

          <div className="privacy-allowed mt-5 rounded-lg border border-emerald-900/80 bg-emerald-950/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-emerald-200">
                Exact sanitized query
              </h3>
              <span className="text-[11px] uppercase tracking-wider text-emerald-400">
                Allowlisted
              </span>
            </div>
            {query.length > 0 ? (
              <code className="mt-3 block break-words font-mono text-xs leading-6 text-emerald-100">
                {JSON.stringify(query)}
              </code>
            ) : (
              <p className="mt-3 text-xs text-emerald-100/60">
                The preview will contain only technology, version, and region
                values.
              </p>
            )}
          </div>

          {profileLabel && (
            <p className="mt-3 truncate text-xs text-slate-500">
              Loaded: {profileLabel}
            </p>
          )}
        </Panel>

</div>}
        {view === "Agents & Otari Routing" && <div className="agents-view">        <Panel
          eyebrow="Parallel network"
          title="Cognizant Neuro? SAN"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-400">{MODEL_GATEWAY_NAME} routing</p>
            <span className="rounded-full bg-amber-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
              Demo · no API key
            </span>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-400">Cloud Status Agent + CVE Agent run in parallel, then feed the Synthesizer Agent.</p>
          <div className="mt-4 space-y-3">
            <AgentCard
              name="Cloud Status Agent"
              models={models.cloudStatus.map((route) => route.label)}
              status={statuses.cloudStatus}
            />
            <AgentCard
              name="CVE Agent"
              models={[models.cve.label]}
              status={statuses.cve}
            />
            <AgentCard
              name="Synthesizer Agent"
              models={[models.synthesizer.label]}
              status={statuses.synthesizer}
            />
          </div>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Logical model profiles
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <ModelPill label="feed_triage" model={routing.profiles.feed_triage.label} />
              <ModelPill label="cve_analysis" model={routing.profiles.cve_analysis.label} />
              <ModelPill
                label="realtime_search"
                model={routing.profiles.realtime_search.label}
              />
              <ModelPill
                label="final_summary"
                model={routing.profiles.final_summary.label}
              />
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              Fallback: {routing.fallback.label} · no external call in demo mode
            </p>
          </div>

          <button
            className="mt-4 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-700 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!hasProfile || isLoading}
            onClick={() => void rerunDemoScan()}
            type="button"
          >
            {isLoading ? "Running parallel demo agents..." : "Run demo scan"}
          </button>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            Cloud and CVE demo agents execute in parallel, then the synthesizer
            keeps only stack-matched alerts with official sources.
          </p>
        </Panel>

<p className="mt-4 text-sm leading-6 text-slate-400">The gateway utility retries provider-unavailable and rate-limit failures with the configured default model and the same sanitized query. Other errors surface to the caller. Live provider invocation and API key configuration are currently unavailable in this demo runtime.</p></div>}
        {view === "How It Works" && <div className="grid gap-5 lg:grid-cols-2"><Panel eyebrow="Zero-Upload architecture" title="Your inventory stays local"><p className="text-sm leading-7 text-slate-400">Load a synthetic demo or choose infra-profile.json using the browser?s File System Access API. The local sanitizer constructs a query from explicitly allowed technology names, versions, and regions, and validates each value. Inspect blocked field categories and the exact query in Privacy &amp; Profile Inspector.</p></Panel><Panel eyebrow="Open web provenance" title="Every alert keeps its evidence"><p className="text-sm leading-7 text-slate-400">Cloud Status Agent and CVE Agent execute in parallel. The Synthesizer Agent combines their results, keeps stack-matched alerts with public source URLs, and sorts them by severity. Demo records are historical snapshots with clickable official advisories and provider notices. Review model profiles and fallback configuration in Agents &amp; Otari Routing.</p></Panel></div>}
      </main>
    </div>
  );
}

function getAgentModelRoutes(routing: ModelRouting): AgentModelRoutes {
  return {
    cloudStatus: [
      routing.profiles.feed_triage,
      routing.profiles.realtime_search,
    ],
    cve: routing.profiles.cve_analysis,
    synthesizer: routing.profiles.final_summary,
  };
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-black/10 sm:p-5">
      <div className="mb-4 border-b border-slate-800 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-100">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function AgentCard({
  name,
  models,
  status,
}: {
  name: string;
  models: string[];
  status: AgentStatuses[keyof AgentStatuses];
}) {
  const statusStyles: Record<AgentStatuses[keyof AgentStatuses], string> = {
    idle: "bg-slate-800 text-slate-400",
    running: "bg-cyan-950 text-cyan-200",
    complete: "bg-emerald-950 text-emerald-200",
    failed: "bg-red-950 text-red-200",
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-200">{name}</p>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusStyles[status]}`}
        >
          {status}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Active logical model:{" "}
        <span className="text-slate-300">{models.join(" · ")}</span>
      </p>
    </div>
  );
}

function ModelPill({ label, model }: { label: string; model: string }) {
  return (
    <div className="rounded border border-slate-800 px-2 py-1.5">
      <p className="font-mono text-[10px] text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-xs text-slate-200">{model}</p>
    </div>
  );
}

function AlertCard({ alert }: { alert: RadarAlert }) {
  const severityStyles = {
    critical: "border-red-700 bg-red-950/40 text-red-200",
    high: "border-orange-800 bg-orange-950/30 text-orange-200",
    moderate: "border-amber-800 bg-amber-950/30 text-amber-200",
    low: "border-cyan-900 bg-cyan-950/30 text-cyan-200",
    info: "border-slate-700 bg-slate-800/50 text-slate-300",
  } as const;

  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${severityStyles[alert.severity]}`}
        >
          {alert.severity}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          {alert.kind === "cve"
            ? alert.id
            : `Cloud outage · ${alert.publishedAt}`}
        </span>
      </div>
      <h3 className="mt-2 text-sm font-semibold leading-5 text-slate-100">
        {alert.title}
      </h3>
      <p className="mt-2 text-xs leading-5 text-slate-400">{alert.summary}</p>
      {alert.verification === "unverified" && <p className="mt-2 text-xs text-amber-300">Por verificar</p>}
      {!!alert.matchedVersions?.length && <p className="mt-2 text-xs text-red-200">Versões afetadas no perfil · {alert.matchedVersions.join(", ")}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2">
        <span className="text-[11px] text-slate-500">
          {alert.technology} · {alert.status}
        </span>
        <a
          className="text-xs font-medium text-cyan-300 underline decoration-cyan-900 underline-offset-4 hover:text-cyan-100"
          href={alert.sourceUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {alert.sourceLabel}
        </a>
      </div>
    </article>
  );
}