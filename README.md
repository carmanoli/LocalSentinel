# LocalSentinel

LocalSentinel is a browser-based infrastructure vulnerability and outage radar.
The application is a React and TypeScript Next.js static export styled with
Tailwind CSS.

## Run locally

```bash
npm install
npm run dev
```

## Local profile privacy

Use **Choose profile** to select an `infra-profile.json` file in a supported
browser. The file is read through the File System Access API and is not
uploaded. Only validated technology names, versions, and regions are exposed
by the sanitizer for future outbound queries; other profile fields remain
local and are omitted. See [`public/infra-profile.example.json`](./public/infra-profile.example.json)
for the supported technology entry shape.

Use **Load Demo Profile** to run the same sanitizer and local parallel-agent
demo against synthetic sensitive values. Only the names of blocked field
categories and the sanitized query are displayed; the values are never shown
or persisted. Demo alerts are curated examples with official source links,
not live provider status checks or LLM-generated assessments.

The static browser build intentionally makes no provider calls and contains no
API keys. Model profile selection and retryable-failure fallback are isolated
in `src/gateway/` for a future credential-safe provider integration.

## Verify and export

```bash
npm test
npm run build
```

The static site is written to `out/`.
