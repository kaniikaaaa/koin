@AGENTS.md

# MoneyMirror

Local-first personal finance tracker (MVP). A user brings one or more CSV bank
statements; everything is parsed, categorized, and analyzed **in the browser**.
There is no backend, database, auth, or bank connection. The active workspace
lives only in `localStorage`. An in-app chat assistant is scaffolded but **not
yet connected to an LLM**.

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
- `chat.ts` — chat types + `getAssistantReply` **(LLM stub — see below)**
- `utils.ts` — `cn()` class merger

## `components/`

- `ui/*` — shadcn-style primitives (`button`, `input`, `textarea`, `card`,
  `dialog`, `carousel`, `table`, `chart`)
- `upload-dropzone.tsx` — drag/drop + file-picker upload on the home page
- `import-csv-button.tsx` — "Add more CSV" button (file picker, appends in place)
- `chat-panel.tsx` — dashboard chat UI
- `monthly-suggestions-dialog.tsx` — dialog + carousel of monthly insights

## Conventions

- Path alias: `@/*` → repo root (`tsconfig.json`). So `lib/` and `components/`
  sit at the project root while routes live under `src/app/`.
- Styling: Tailwind v4; dark-only theme via CSS variables in
  `src/app/globals.css`; compose classes with `cn()`.
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
