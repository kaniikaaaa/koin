# MoneyMirror V1

MoneyMirror is a local-first finance tracker MVP. It lets a user bring one or more CSV statements, analyze transactions in the browser, and immediately review spending metrics, monthly charts, report tables, and practical suggestions.

## Current V1 Flow

1. Open the app at `/`.
2. Drop or choose one or more CSV files (or load the sample) on the home page.
3. You land on `/dashboard`. Use **Add more CSV** to append more statements in
   place, or **Create new** to clear the workspace and start over.
4. Review `/dashboard` and `/reports/current`.

V1 stores the active multi-statement workspace only in browser `localStorage`. New CSV uploads append to the existing workspace. There is no login, database, bank connection, server-side statement storage, or AI service requirement.

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
- Chatbot-style assistant panel (LLM integration pending)

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

## Privacy Model

- No login.
- No database.
- No bank connection.
- No server-side statement storage.
- No raw transaction data sent to analytics.
- `Delete workspace` clears browser storage.

## Later

PDF parsing, screenshot/OCR upload, optional AI summary, auth, database, and cross-device history are intentionally outside V1.
