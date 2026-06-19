@AGENTS.md

# MoneyMirror

Local-first personal finance tracker (MVP). A user brings one or more CSV bank
statements; everything is parsed, categorized, and analyzed **in the browser**.
There is no database, auth, or bank connection. The active workspace lives only
in `localStorage`. The only server code is two stateless API routes that proxy
the **optional** AI chat/tips to OpenAI (see "Chat assistant" below); they
receive an anonymized, merchant-free spending summary, never the raw statement.

## Commands

```bash
npm run dev        # Next.js dev server (Turbopack) on http://localhost:3000
npm run build      # production build
npm run lint       # eslint
npm run test:csv   # node scripts/smoke-complex-csv.cjs (CSV parser smoke test)
npm run test       # lint + build
```

## Routes (`src/app/`)

- `/` — home: intro + `UploadDropzone`. This is the single CSV-upload entry
  point. After a successful upload it routes to `/dashboard`.
- `/dashboard` — main view: metric cards, monthly comparison chart, category
  breakdown, transaction tables, the chat panel, and the import/create controls.
- `/reports/[id]` — text report (used as `/reports/current`).

Note: there is **no `/upload` route** — it was removed and home took over the
upload role. Don't reintroduce links to `/upload`.

## Data flow

```
CSV file(s)
  → parseMoneyCsv         (lib/money-csv.ts)        flexible header detection
  → categorizeTransactions(lib/money-categorizer.ts)rule-based categories
  → MoneyStatement/Workspace (lib/money-workspace.ts)
  → appendAnalysisToStoredWorkspace (lib/moneymirror-storage.ts) → localStorage
```

Reads go through `loadWorkspace()`; the dashboard/report derive everything
(metrics, monthly breakdown, insights) from the workspace via `useMemo`.

The shared client import flow lives in **`lib/csv-import.ts`** (`importCsvFiles`)
and is used by both the home `UploadDropzone` and the dashboard
`ImportCsvButton` — keep CSV-picking logic there, not duplicated in components.

## `lib/` map

The UI imports through the barrel **`lib/moneymirror.ts`**. No page calls an API
route. Modules:

- `money-csv.ts` — parse CSV text → normalized transaction drafts
- `money-categorizer.ts` — local category rules
- `money-analysis.ts` — `analyzeMoneyCsvFiles` / `analyzeSampleCsvs` pipeline
- `money-workspace.ts` — workspace model, append/edit/delete, migration
- `money-metrics.ts` — totals + per-month metrics
- `money-insights.ts` — report text, suggestions, monthly notes
- `money-format.ts` — currency formatting
- `money-id.ts` — `createId(prefix)` id helper
- `money-samples.ts` — built-in sample CSVs
- `money-types.ts` — shared types (`MoneyTransaction`, `MoneyWorkspace`, …)
- `moneymirror-storage.ts` — `loadWorkspace`, `saveWorkspace`,
  `appendAnalysisToStoredWorkspace`, `clearMoneyMirrorData`
- `csv-import.ts` — shared client CSV import (`importCsvFiles`, `filterCsvFiles`)
- `chat.ts` — chat types + `getAssistantReply` (POSTs to `/api/chat`; see below)
- `utils.ts` — `cn()` class merger

## `components/`

- `ui/*` — official shadcn/ui primitives (`button`, `input`, `textarea`, `card`,
  `dialog`, `table`, `chart`, `sidebar`, `sheet`, `tooltip`, `skeleton`, `badge`,
  `separator`) + `hooks/use-mobile.ts`
- `app-shell.tsx` — dashboard/report shell: official shadcn **Sidebar** (left rail
  on `lg+`, drawer on mobile) with nav + an `actions` slot, wrapping page content
  in `SidebarInset`. Used by `/dashboard` and `/reports/[id]`.
- `metric-card.tsx` — shared semantic metric card (mono tabular value + tone + icon),
  used by the dashboard and report metric strips
- `novus-analytics.tsx` — injects the Novus loader from `NEXT_PUBLIC_NOVUS_SRC`
- `upload-dropzone.tsx` — drag/drop + file-picker upload on the home page
- `import-csv-button.tsx` — "Add more CSV" button (file picker, appends in place)
- `chat-panel.tsx` — dashboard chat UI
- `suggestions-panel.tsx` — inline monthly tips on the dashboard (AI + built-in
  fallback, responsive `Card` grid; replaced the old carousel dialog)

## Conventions

- Path alias: `@/*` → repo root (`tsconfig.json`). So `lib/` and `components/`
  sit at the project root while routes live under `src/app/`.
- Brand: **Koin** (the repo, `lib/money-*` modules, and `moneymirror:*`
  `localStorage` keys keep their internal `moneymirror` naming on purpose).
- Styling: Tailwind v4; dark **"Terminal"** theme (neutral ink + credit-green /
  debit-oxblood / brass accents) via CSS variables in `src/app/globals.css`;
  compose classes with `cn()`. Semantic + `chart-1..8` + `sidebar-*` tokens live
  there, plus the base `@layer base { * { @apply border-border } }` (without it,
  Tailwind v4 defaults borders to `currentColor`).
- Typography: IBM Plex Sans (UI) + IBM Plex Mono for every figure
  (`font-mono tabular-nums`, right-aligned).
- Responsive: data tables collapse to stacked cards under `md` (no horizontal scroll).
- Code style: double quotes, no semicolons (match surrounding files).
- Client components that touch `localStorage` load it inside a `useEffect`
  (avoids SSR/hydration mismatch).

## Chat assistant (OpenAI)

The dashboard chat panel is wired to OpenAI **GPT-4o-mini**:

- `components/chat-panel.tsx` — UI; receives a `context` prop (a plain-text
  finance summary built on the dashboard from metrics + monthly data).
- `lib/chat.ts::getAssistantReply(messages, context)` — POSTs to `/api/chat`.
- `src/app/api/chat/route.ts` — server-side handler. Reads `OPENAI_API_KEY`
  (and optional `OPENAI_CHAT_MODEL`, default `gpt-4o-mini`) from the env, injects
  the finance summary into the system prompt, calls OpenAI's chat completions
  API, and returns `{ reply }`. The key never reaches the browser.

Set `OPENAI_API_KEY` in `.env` and restart the dev server. Without it, the route
returns a clear error that the chat panel shows as a message bubble.
