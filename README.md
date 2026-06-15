# MoneyMirror MVP

MoneyMirror is a hackathon-ready finance tracker MVP. It lets a user upload a CSV statement, normalizes transactions, categorizes spending, and renders a dashboard plus a short money summary.

## Current MVP Flow

1. Open the app at `/`.
2. Go to `/upload`.
3. Upload a CSV or use the sample CSV.
4. Parse and analyze transactions.
5. Review `/dashboard` and `/reports/current`.

The local demo persists the active workspace in browser storage so it can run without a live database or external AI key. API routes and the Prisma schema are included for the Postgres-backed path.

## Features

- CSV upload and paste-in parsing
- Normalized transaction shape
- Rule-based structured categorization fallback
- Editable categories
- Dashboard cards for income, expenses, net cashflow, biggest category, and money leak
- Category and cashflow charts using native UI
- Recent and biggest transaction tables
- Generated money summary with suggestions
- API routes for upload, analysis, and reports
- Prisma schema for users, uploads, transactions, and reports

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm test
```

`npm test` runs lint and a production build.

## Database

The schema lives in `prisma/schema.prisma`.

```bash
npx prisma validate
```

Add a real `DATABASE_URL` in `.env` before running migrations against Postgres.

## Notes

Clerk/OpenAI can be connected later with real keys. The current version is intentionally demo-safe: it proves the core MoneyMirror experience without requiring external services during local testing.
