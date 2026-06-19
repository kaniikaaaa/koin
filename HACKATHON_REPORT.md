# MoneyMirror Hackathon Report

## Decision

Ship MoneyMirror as a public, no-signup, local-first CSV money explainer for World Product Day: Everyone Ships Now.

The product should let a stranger open the deployed URL, load sample data or upload a CSV, and immediately get categorized transactions, cashflow, money leaks, and a plain-English money summary.

## Positioning

MoneyMirror turns a messy transaction CSV into a private, instant spending mirror. Upload a file, get categories, cashflow, money leaks, and a plain-English summary without creating an account or sending your statement to a server.

## Target User

People who want a fast read on where their money went but do not want to connect a bank account, create another finance account, or manually maintain a spreadsheet.

## Product Bet

The strongest hackathon story is not "AI finance dashboard." That is generic.

The stronger story is:

> Understand your money in 60 seconds, privately, from a CSV you already have.

## Win Readiness

This is enough to submit and be credible.

It is not enough to coast into a win. To compete for top 3, the public URL, sample flow, mobile layout, privacy story, Novus tracking, and demo video all need to feel finished.

The product should be judged as a focused private utility, not a half-built finance platform.

## MVP Scope

### Must Ship

- Public deployed URL.
- CSV upload and paste-in parsing.
- Sample CSV demo path.
- Transaction normalization.
- Rule-based categorization.
- Manual category editing.
- Dashboard cards:
  - Total income
  - Total expenses
  - Net cashflow
  - Biggest spending category
  - Top money leak
- Category spending chart.
- Income vs expenses view.
- Recent and biggest transaction tables.
- Plain-English money summary.
- Delete workspace button.
- Novus.ai installed.
- Privacy copy that clearly says CSV data stays in the browser.

### Cut From Hackathon MVP

- Clerk auth.
- Postgres persistence.
- External OpenAI or Claude calls on raw user statements. (An optional AI chat + monthly-tips feature shipped, but it sends only an anonymized, merchant-free summary — totals by category and month — never raw transaction rows.)
- PDF parsing.
- Bank integrations.
- UPI sync.
- Tax/GST features.
- Investment tracking.
- Mobile app.
- Team accounts.

## Categorization Without AI

MoneyMirror categorizes transactions with a local rule-based classifier.

The classifier reads the normalized transaction description and matches simple merchant keywords:

- Food: `zomato`, `swiggy`, `restaurant`, `cafe`
- Travel: `uber`, `ola`, `metro`, `flight`, `fuel`
- Subscriptions: `netflix`, `spotify`, `prime`, `subscription`
- Bills: `airtel`, `jio`, `electricity`, `insurance`, `bill`
- Investment: `sip`, `zerodha`, `groww`, `fund`
- Transfers: `upi`, `imps`, `neft`, `transfer`

Positive amounts are treated as income. Unknown matches become miscellaneous. Users can manually edit categories, and manual edits should be treated as final.

Do not claim AI categorization unless an actual AI model is added. The safe claim is:

> Local private categorization with editable results.

## Security And Privacy Rules

MoneyMirror handles financial data, so the MVP must stay honest.

- User CSV data stays in browser storage only.
- Do not send merchant names, descriptions, amounts, CSV text, reports, or transaction rows to analytics.
- Do not market the app as cloud-secure if it is local-only.
- Delete workspace must clear stored transactions and reports.
- Any future server persistence must require auth, per-user authorization, retention controls, and delete/export.

## Novus.ai Events

Track product behavior only, not financial content.

Allowed events:

- `sample_loaded`
- `csv_loaded`
- `csv_parsed`
- `categories_analyzed`
- `category_edited`
- `dashboard_viewed`
- `report_viewed`
- `workspace_deleted`

Do not include transaction descriptions, merchant names, category totals, income, expenses, net worth, report text, or CSV contents in event properties.

## Judging Strategy

### Product Thinking

Show a clear user and problem: people have messy statements and want quick clarity without trusting another finance product.

### Craft And Execution

Prioritize one polished flow:

Landing page -> sample/upload CSV -> analyze -> dashboard -> report -> delete workspace.

### Originality And Ambition

Lead with privacy-first, no-account financial insight. Make the product feel like a focused utility, not another generic dashboard.

### Shippedness

Judges must be able to click the URL and get value immediately. The sample CSV path is critical.

## Milestones

### June 16 - Scope Lock

- Confirm local-first direction.
- Remove or hide promises for Clerk, Postgres, and external AI.
- Tighten landing page copy around private CSV insight.
- Confirm all primary pages work with sample data.

### June 17 - Product Polish

- Polish upload, dashboard, and report empty states.
- Make delete workspace obvious.
- Improve CSV parse errors.
- Add privacy copy near upload and footer/header area.
- Check mobile layout.

### June 18 - Novus And Deploy

- Install Novus.ai.
- Add only privacy-safe events.
- Deploy public build.
- Verify public URL from a clean browser session.
- Capture Novus dashboard screenshot.

### June 19 - Demo And Submission Assets

- Record 2-3 minute demo video.
- Write Devpost description.
- Prepare screenshots.
- Test full judging flow on deployed URL.

### June 20 - Final QA And Submit

- Run final build/lint.
- Re-test deployed URL.
- Confirm Novus dashboard screenshot.
- Submit before June 20, 2026 at 9:30 PM IST.

## Demo Script

Most people do not know where their money goes because bank statements are messy and finance apps ask for too much trust.

MoneyMirror is a private CSV money explainer.

You upload or paste a transaction CSV, and the app normalizes the rows, categorizes spending, shows income, expenses, cashflow, top categories, and repeated money leaks.

Then it generates a plain-English summary with practical savings suggestions.

The key point: the statement stays in the browser. No account, no bank connection, no server-side financial data collection.

## Devpost Description

MoneyMirror is a private, no-signup money explainer for transaction CSVs.

It is built for people who want quick clarity from their financial data without connecting a bank account or trusting another finance app with sensitive statements. A user can load the sample CSV or upload their own statement, then see normalized transactions, spending categories, income, expenses, cashflow, money leaks, and a plain-English summary.

The MVP was built with Next.js, React, Tailwind CSS, shadcn/ui-style components, and local browser storage. Novus.ai is installed for privacy-safe product analytics.

The biggest product decision was to stay local-first for the hackathon. Instead of building a half-finished cloud finance app, MoneyMirror focuses on one complete, usable workflow that a stranger can try immediately.

## Acceptance Checklist

- [ ] Public URL works.
- [ ] Sample CSV works without setup.
- [ ] User CSV upload works.
- [ ] Dashboard renders useful numbers.
- [ ] Report page renders useful summary.
- [ ] Delete workspace clears local data.
- [ ] Novus.ai is installed.
- [ ] Novus events avoid financial data.
- [ ] Novus dashboard screenshot captured.
- [ ] Demo video recorded and public or unlisted.
- [ ] Devpost description added.
- [ ] Final submission completed before deadline.

## After Hackathon

Only add backend persistence if real users ask for saved history across devices.

Next real-product milestones:

- Auth with Clerk.
- Postgres with strict user-scoped queries.
- Server-side upload limits.
- Delete/export controls.
- Optional AI on redacted or aggregated data only.
- Privacy policy and data retention policy.
