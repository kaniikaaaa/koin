# MoneyMirror V1

MoneyMirror is a local-first finance tracker MVP. It lets a user bring one or more CSV statements, analyze transactions in the browser, and immediately review spending metrics, monthly charts, report tables, and practical suggestions.

## Current V1 Flow

1. Open the app at `/`.
2. Drop or choose one or more CSV files (or load the sample) on the home page.
3. You land on `/dashboard`. Use **Add more CSV** to append more statements in
   place, or **Create new** to clear the workspace and start over.
4. Review `/dashboard` and `/reports/current`.

V1 stores the active multi-statement workspace only in browser `localStorage`. New CSV uploads append to the existing workspace. There is no login, database, bank connection, or server-side statement storage. The only server code is two stateless API routes (`/api/chat`, `/api/suggestions`) that proxy the optional AI features to OpenAI; they receive an anonymized, merchant-free spending summary (totals by category and month), never your raw statement.

## Features

- CSV upload and paste-in parsing
- Multiple CSV uploads in one local workspace
- Single-month and multi-month sample workspaces
- Normalized transaction shape
- Local rule-based categorization
- Editable categories
- Dashboard cards for income, expenses, net cashflow, biggest category, and money leak
- Monthly comparison chart using shadcn chart/Recharts
- Monthly report table
- Suggestion popup with shadcn dialog and carousel
- Recent and biggest transaction tables
- Local money summary with practical suggestions
- Browser storage persistence
- Create-new action that clears the local workspace
- AI assistant panel and AI monthly tips, powered by OpenAI (optional — set `OPENAI_API_KEY`)

## Local Architecture

The app keeps a small client-side service stack under `lib/`:

- `money-csv.ts` parses CSV rows into normalized transaction drafts.
- `money-categorizer.ts` applies local category rules.
- `money-workspace.ts` owns the normalized workspace model, edits, deletes, and migration.
- `money-metrics.ts` aggregates totals and calendar-month metrics.
- `money-insights.ts` builds report text, savings ideas, investment prompts, warnings, and appreciation notes.
- `moneymirror-storage.ts` persists the workspace and legacy compatibility data in `localStorage`.

The UI imports through `lib/moneymirror.ts`, which is only a barrel export. No page calls an API route for upload, analysis, dashboard, or report generation.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm test
```

`npm test` runs lint and a production build.

## Deploy

The app needs a Node runtime (the `/api/chat` and `/api/suggestions` routes call
OpenAI server-side), so it can't be a pure static export. Vercel needs no config:

```bash
npx vercel --prod
```

Set `OPENAI_API_KEY` (and optionally `OPENAI_CHAT_MODEL`) in the Vercel project env. Without `OPENAI_API_KEY` the core local flow still
works and the AI chat degrades to a friendly "assistant not configured" message
instead of erroring. See `.env.example`.

## Analytics

Product analytics is **Novus** (Pendo's product agent — Novus instruments the app
with the Pendo agent). The agent is loaded in `components/pendo-install.tsx`, and
`lib/analytics.ts` fires a privacy-safe event allowlist (`sample_loaded`,
`csv_imported`, `dashboard_viewed`, `report_viewed`, `workspace_created`) via
`pendo.track()` — event names only, never amounts, merchants, or categories.
Visitors are anonymous (Pendo `_PENDO_T_…` IDs). The dashboard lives at
`novus.pendo.io`.

## Privacy Model

- No login.
- No database.
- No bank connection.
- No server-side statement storage — your CSV and its transactions stay in `localStorage`.
- The optional AI chat and tips send an anonymized, merchant-free summary (totals by category and month) to OpenAI; raw transactions and merchant names never leave your browser.
- `Create new` clears browser storage.

## Later

PDF parsing, screenshot/OCR upload, optional AI summary, auth, database, and cross-device history are intentionally outside V1.
