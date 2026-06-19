# Koin — Brand Guide

> Draft for discussion. Theme direction: **"The Terminal"** (dark, data-grade).
> Nothing here ships until we agree on it.

## What Koin is

Koin turns a bank-statement CSV into a clear, private reading of where your money
went. **Local-first**: parsed and kept in the browser. No account, no bank login,
no crypto. The feeling we want: *serious money software that respects your privacy.*

## Name

- **Wordmark:** `koin` — lowercase, IBM Plex Mono Medium, tight tracking.
- **Mark:** rounded-square tile in primary green with a monospace `K`.
- **Honest note (decided):** "Koin" collides with the popular Koin Kotlin DI
  framework and reads phonetically as "coin" (crypto). We mitigate by **never**
  using coin/crypto imagery and always pairing the name with the private-statement
  context. Never style it to look like a token or currency.

## Positioning line

**"See where your money went — privately."**
Alt: *"Your statement, read clean."*

## Voice & tone

Precise, plain, calm, non-salesy — a good analyst, not a hype app.

- Sentence case. Active voice. Name what the user controls, not the system.
- **Do:** "See where your money went." · "Your CSV stays on this device." ·
  "We couldn't read that file."
- **Don't:** "Unlock powerful AI insights!" · "Bank-grade security." ·
  "Connect your accounts." · any exclamation-mark hype.

## Color — "Terminal" palette

| Token        | Hex       | Role                                            |
|--------------|-----------|-------------------------------------------------|
| Canvas       | `#0A0C0F` | App background (neutral ink, faintly cool)      |
| Surface      | `#0F1318` | Cards / panels                                  |
| Hairline     | `#1C2530` | Borders, dividers, grid                         |
| Text         | `#E7EBE9` | Foreground                                      |
| Muted text   | `#8B958F` | Labels, secondary copy                          |
| **Credit / income** | `#45C98A` | Money **in** + primary actions (green)   |
| **Debit / expense** | `#D07B6F` | Money **out** (oxblood/clay)             |
| **Cashflow / attention** | `#C2A35A` | Net + highlights (brass, sparing)   |
| Destructive  | `#E06A63` | Errors only                                     |

**Rules**

- Green = money in **and** primary buttons. Oxblood = money out. Brass = net /
  attention, used sparingly. One accent active at a time (Chanel's "remove one").
- Color always *means* something financial — never decorative.

## Typography

- **UI / body:** IBM Plex Sans — weights 400 / 500 / 600 / 700.
- **Figures + labels / eyebrows:** IBM Plex Mono — 400 / 500 / 600, `tabular-nums`.
- **Why IBM Plex:** an enterprise/institutional type system (sans + mono from one
  family) — a deliberate "this is real software" choice, not generic Inter, and
  the mono gives true tabular figures.
- **Hard rule:** every money figure is **mono + tabular + right-aligned**. Digit
  columns must line up. This single rule is what makes finance UIs feel credible.

## Signature element

The **statement / ledger**: monospaced tabular figures in ruled rows, with
credit-green / debit-oxblood amounts, a hairline "tape" stat strip, and a faint
terminal grid behind data panels. The hero is a *typeset mini-statement*, not a
marketing block — the product literally shows you the thing it makes.

## Logo & don'ts

- Clearspace around the wordmark ≥ the height of the `K` tile.
- **Don't:** gradient the wordmark · use coin/crypto imagery · add drop shadows ·
  recolor the green to neon · set figures in a proportional (non-tabular) font.

## Chart & sidebar tokens (implemented)

- **Category chart palette** (`--chart-1..8`): `#45C98A · #C2A35A · #6FA8C7 ·
  #D07B6F · #9B8FC7 · #7FB39B · #C78F6F · #8593A0` — desaturated, distinguishable
  on the ink canvas; replaces the old hardcoded hex array on the dashboard.
- **Sidebar tokens** (`--sidebar-*`): surface `#0F1318`; active nav item =
  `bg-primary/10` + primary text (solid, no glow); hairline `#1C2530`.
- All tokens live in `src/app/globals.css`. No raw hex in app components — the only
  hex outside globals is inside the official `ui/chart.tsx` recharts override selectors.
