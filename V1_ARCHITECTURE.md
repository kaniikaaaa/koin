# MoneyMirror V1 Architecture

## Goal

Build the first useful version: no login, no database, no bank connection.

The user brings transaction data, and MoneyMirror turns it into a clear spending report immediately.

## V1 Scope

- CSV first.
- Sample CSV for instant demo.
- Parse transactions locally.
- Categorize spending locally.
- Show clear dashboard.
- Show practical recommendations.
- Store only in browser storage.
- Let user delete workspace.

PDF and screenshot upload can come later. They are harder because they need extraction/OCR and may require sending private data to an AI service.

## Architecture

```text
                    +----------------------+
                    |       User           |
                    | CSV / sample data    |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |   Browser App        |
                    | Next.js + React UI   |
                    +----------+-----------+
                               |
             +-----------------+-----------------+
             |                                   |
             v                                   v
   +---------------------+             +----------------------+
   | CSV Parser          |             | Browser Storage      |
   | normalize rows      |<----------->| localStorage         |
   +----------+----------+             +----------------------+
              |
              v
   +---------------------+
   | Local Categorizer   |
   | keyword rules       |
   | manual edits        |
   +----------+----------+
              |
              v
   +---------------------+
   | Metrics Engine      |
   | income, expenses,   |
   | cashflow, leaks     |
   +----------+----------+
              |
              v
   +---------------------+
   | Dashboard + Report  |
   | charts, tables,     |
   | recommendations     |
   +---------------------+
```

## Data Flow

```text
CSV text
  -> parse rows
  -> normalize date, description, amount
  -> categorize transaction
  -> calculate totals and patterns
  -> render dashboard
  -> generate summary
```

## Categorization

V1 does not need AI for categorization.

It uses local rules:

- Positive amount -> Income
- Food keywords -> Food
- Travel keywords -> Travel
- Subscription keywords -> Subscriptions
- Bills keywords -> Bills
- Investment keywords -> Investment
- Transfer keywords -> Transfers
- Unknown -> Miscellaneous

Users can manually correct any category.

## Dashboard

Keep the dashboard focused:

- Total income
- Total expenses
- Net cashflow
- Biggest spending category
- Top money leak
- Spending by category
- Income vs expenses
- Recent transactions
- Biggest transactions
- What to cut first

## Privacy Model

V1 is local-first.

- No login.
- No database.
- No bank connection.
- No server-side statement storage.
- No raw transaction data sent to analytics.
- Delete workspace clears browser storage.

## Later

Only add these after the V1 is polished:

- PDF parsing.
- Screenshot/OCR upload.
- Optional AI summary.
- Auth.
- Database.
- Cross-device history.
