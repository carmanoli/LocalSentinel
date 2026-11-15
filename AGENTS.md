# LocalSentinel

These rules are mandatory for every coding agent and LLM working in this repository. LocalSentinel is built for the Open Agentic Web Challenge.

## 1. Project goal

- Build a browser-focused, proactive vulnerability (CVE) and service instability (outage) radar for sysadmins and DevOps engineers.
- Monitor public sources, including AWS and Azure status pages, Linux CVE databases, and official framework security advisories such as Next.js.

## 2. Privacy and security — Zero-Upload

- Keep the user's infrastructure inventory, `infra-profile.json`, exclusively on the user's local machine. Read it locally in the browser using the File System Access API and `window.showOpenFilePicker()`.
- Never send the raw profile, confidential data, internal hostnames, or IP addresses to external servers or LLM APIs. Apply this rule to requests, prompts, tool calls, logs, analytics, and error reports.
- The only profile-derived data that may leave the browser is an anonymized query containing generic technology names, versions, and regions, such as `["AWS eu-west-1", "Ubuntu 24.04", "Next.js 15"]`. Construct outbound queries from explicitly allowed fields and validate them locally before transmission.

## 3. Architecture and challenge tooling

- **Frontend.** Use React with Next.js configured for static export (output: 'export'), TypeScript, and Tailwind CSS. Run everything in the browser without external cloud databases.
- **Orchestration.** Use Cognizant Neuro® SAN to coordinate the Cloud Status Agent and CVE Agent in parallel. The Synthesizer Agent combines their results. Publish the network definition, browser runtime, and public interface for the challenge.
- **Model gateway.** Use Mozilla Otari to switch models through configuration.

## 4. Multi-LLM routing and fallback

Resolve logical model profiles from the local user profile. Keep agent logic portable across vendors. The models below are examples.

| Profile | Purpose | Example |
| --- | --- | --- |
| `feed_triage` | Parse RSS and JSON feeds quickly and cost-effectively | Gemini Flash or GPT-4o-mini |
| `cve_analysis` | Assess vulnerability impact with technical reasoning | Claude Sonnet |
| `realtime_search` | Investigate live events and reports using live sources | Grok |
| `final_summary` | Produce structured executive summaries | GPT-4o |

- Automatically fall back to the configured default model when a provider fails or hits a rate limit. Apply the privacy rules on every attempt.
- Provide a working default configuration so judges can test the application with a single free or default API key. Keep project-owned credentials out of source control and public browser assets.

## 5. Traceability and provenance

- Every agent-generated alert must include a direct URL to its original public source, such as an official CVE record, a maintainer's security advisory, or the provider's cloud status notice. Preserve source URLs through synthesis and omit alerts that lack traceable evidence.

## 6. Coding agent behavior

- Before proposing or writing changes, check compliance with Section 2 and Section 4.
- Before completing a change, verify affected outbound data paths and exercise affected model selection and fallback paths.
- After completing any task and passing verification, always output a ready-to-copy Git commit command at the end of your response using Conventional Commits format (e.g., `git add . && git commit -m "feat: ..."`).


## 7. Project structure & conventions

- `/src/agents/` — Cognizant Neuro® SAN network definitions and agent prompts.
- `/src/gateway/` — Mozilla Otari routing configuration and fallback logic.
- `/src/privacy/` — Local File System Access API reader and outbound query sanitizer.
- `/public/` — Static assets and sample anonymized `infra-profile.example.json`.

## 8. Commands & verification

- Install dependencies: `npm install`
- Run local dev server: `npm run dev`
- Run privacy & unit tests: `npm test`
- Build static export: `npm run build`

## 9. Testing rules for agents

- Never test privacy sanitization using real hostnames or IPs in test fixtures; use synthetic dummy data (e.g., `prod-web-01.internal`, `10.0.14.22`).
- Every new sanitizer function must include unit tests proving that sensitive fields are stripped before leaving the browser.
