# Koin — UI System

> Draft for discussion. Pairs with `brand.md`. Built on the existing shadcn-style
> token setup (CSS variables + Tailwind v4 `@theme inline`). Mobile-first.

## Foundations

- **Base unit:** 4px. Common spacing: `12 / 16 / 24 / 32`. Section rhythm `24–32`.
- **Radius:** `0.375rem` (cards, buttons, inputs); `full` (chips, pills).
- **Container:** `max-w-7xl` (80rem), padding `16px → 24px` at `sm`.
- **Elevation:** none. Depth comes from hairline borders + surface steps, not shadow.

### Type scale

| Role        | Font            | Size                      | Notes                       |
|-------------|-----------------|---------------------------|-----------------------------|
| Display H1  | Plex Sans 600   | `clamp(2.25rem, 6vw, 3.75rem)` | tight tracking         |
| Section H2  | Plex Sans 600   | `1.125–1.25rem`           |                             |
| Body        | Plex Sans 400   | `1rem / 1.5`              |                             |
| Eyebrow/label | Plex Mono 500 | `0.6875rem` uppercase, tracked `0.2em` | muted              |
| **Figure**  | Plex Mono 600   | contextual                | `tabular-nums`, right-aligned |

## Breakpoints & responsive rules (mobile-first)

`sm 640 · md 768 · lg 1024 · xl 1280`

- **Tables → cards:** below `md`, transaction/report tables render as stacked
  label/value cards. **No horizontal scroll** (the thing most clones get wrong).
- **Metric grid:** `1 → sm:2 → md:3 → lg:5`.
- **Hero / data panels:** stack on mobile, 2-col (`lg:grid-cols-[1.05fr_0.95fr]`) on desktop.
- **Chat:** full-width, ~`70vh` on mobile; fixed `32rem` panel on desktop.
- **Sidebar → drawer:** fixed `240px` left rail on `lg+` (official shadcn **Sidebar**
  block, ui.shadcn.com); below `lg` it becomes a slide-over drawer behind a menu button
  in a compact top bar. Landing keeps a slim sticky top bar.

## Components

- **App shell / sidebar** (dashboard + report) — fixed **left sidebar** on `lg+`
  (~`240px`): mono `koin` wordmark, primary nav (Dashboard · Report), a workspace
  block (transactions / months count), action buttons (Add CSV · Load sample ·
  Create new) in the footer, and the privacy chip. Below `lg` it collapses to a
  slide-over drawer opened from a compact top bar with a menu button. Content sits
  to the right of the rail. The marketing landing (`/`) keeps a slim top bar (no sidebar).
- **Buttons** — `primary` (green), `secondary` (surface), `outline`, `ghost`.
  Visible `focus-visible` ring (green). Min touch target 44px.
- **Card / panel** — `bg-card` + hairline border; optional mono section header bar
  on data panels (`bg-secondary/50`, uppercase mono label).
- **Metric cell** — mono uppercase label + large mono tabular value, tinted by
  semantic role (income green / expense oxblood / cashflow brass).
- **Tape strip** — row of stat cells separated by hairlines (`gap-px` over border).
- **Ledger row** — `date (mono, muted) · label (sans, truncate) · amount (mono
  tabular, credit-green / debit-oxblood, right-aligned)`.
- **Chat panel** — built on **official shadcn/ui primitives** (ui.shadcn.com): our
  existing `button` + `textarea`. UX *patterns* borrowed from community chat kits
  (`Blazity/shadcn-chatbot-kit`, `jakobhoeg/shadcn-chat` — third-party, not official):
  auto-scroll + manual override with a "jump to latest" button; empty-state prompt
  suggestions as chips; assistant replies as lightweight markdown (bold, lists) with
  ₹ figures in mono tabular; user bubble green, assistant bubble surface; typing dots;
  auto-grow composer; copy-on-hover action; fixed privacy disclosure under the composer
  (non-streaming → no stop button).
- **Charts (recharts)** — income green / expense oxblood / cashflow brass;
  category palette = a restrained 6–8 hue set tuned for the ink canvas; hairline
  gridlines; mono tick labels.
- **Suggestions panel** (`suggestions-panel.tsx`) — inline responsive grid of `Card`s
  with tone `Badge`s on the dashboard; AI tips with a skeleton + graceful fallback to
  built-in monthly tips (no carousel/dialog).

## States

- **Empty** — a statement masthead + one clear CTA ("Load sample" / "Upload CSV"),
  never a blank panel.
- **Loading** — skeleton: pulsing metric shells + chart placeholder (no blank flash).
- **Error** — destructive box with a heading ("We couldn't read that file") + one
  recovery hint, never a raw error string.

## Accessibility

- `focus-visible` rings on every interactive element. AA contrast on the ink canvas.
- Real labels, keyboard nav, `role`/`aria` where needed.
- Respect `prefers-reduced-motion`. Touch targets ≥ 44px.

## Motion

Minimal and purposeful: `150ms` hover/focus transitions, one subtle page-load
reveal, typing dots. No ambient/decorative animation (it reads as AI-generated).

## The numerals rule (repeat, because it matters)

Every currency value and metric: **IBM Plex Mono · `tabular-nums` · right-aligned
in tables**. Digit columns line up. This is non-negotiable for a money product.

## Built (status)

Implemented with **official shadcn/ui** components — `sidebar`, `sheet`, `tooltip`,
`skeleton`, `badge`, `separator`, `card`, `table` — plus a shared
`components/metric-card.tsx`. The app shell (`components/app-shell.tsx`) is the
official **Sidebar** (left rail on `lg+` → drawer on mobile, active item in green).
Data tables collapse to stacked cards under `md` (no horizontal scroll); all figures
are IBM Plex Mono `tabular-nums`. The landing has a single anime.js on-load reveal
(reduced-motion respected).
