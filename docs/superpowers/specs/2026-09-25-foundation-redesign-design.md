# WH·OS Foundation Redesign — Design System, Shell & Home

Status: approved (conversational design), pending written-spec review
Date: 2026-09-25
Author: Claude (with Cozy)

## 1. Problem & Goals

WH·OS already covers a lot of ground — 11 content modules (Tasks, Projects,
Leads, Goals, Finances, Debts, Subscriptions, Notes, Links, Wishlist,
Calendar) plus settings — but the owner experiences it as "chaos": no single
place shows what actually matters today, and the current UI doesn't feel
like a serious, intentional product.

This is the first of several sub-projects in a larger redesign. It
establishes the **foundation** — design system, app shell/navigation, and a
new Home screen — that every subsequent per-module redesign will build on.

Goals for this sub-project:
- A visual identity with actual character ("Editorial Bold"): light-first,
  large expressive display typography, color-coded content, soft depth
  (rounded corners + shadows) — while staying inside the existing WH
  Solutions brand (near-black "ink" dark theme stays as the alternate
  theme, signal-blue stays the primary accent).
- Replace the flat 12-item nav list with a minimal shell where the **Home
  screen is the primary means of navigation**, organized into meaningful
  groups instead of a flat list.
- A Home screen that surfaces the cross-module picture that's missing today
  (what's on fire, what's due, what's owed) without requiring the owner to
  open every module to piece it together.
- Extend the existing "Project as hub" relational pattern (Task↔Project,
  Note↔Project already exist) to Finances/Subscriptions, since that's a
  small, consistent addition that directly serves "I don't see the
  connections."

## 2. Non-goals (explicitly deferred)

- **Universal cross-entity linking** (attach any record to any other
  record, freeform) is a materially larger schema/UI effort. It gets its
  own future spec once Foundation ships and we see what's actually still
  missing after the Home aggregation + Project-hub extension.
- **Per-module visual redesign** (Tasks board, Finances views, etc.) is out
  of scope here. Modules keep their current UI for now and pick up the new
  design tokens module-by-module in later sub-projects — this spec only
  redesigns the shell (nav, Home, tokens).
- Journal and Health modules: already fully removed from the codebase and
  database as part of this session (unrelated cleanup, done ahead of this
  spec — see commit history).

## 3. Design tokens

Editorial Bold, built on the existing OKLCH token system in
`src/app/globals.css` — not a replacement of it.

- **Theme**: light stays the default; dark ("ink") theme is preserved and
  gets the same treatment (color-coded group accents get dark-mode
  variants). No regression to the existing dual-theme toggle.
- **Typography**: page-level headings (Home greeting, section titles) move
  to the existing `--font-display` (Unbounded) at larger sizes than
  currently used elsewhere — that's the "expressive headline" identity,
  no new font family needed. Body text stays Inter.
- **Radius**: bump base `--radius` from `0.5rem` to `0.75rem` so cards/tiles
  read as noticeably rounded (per explicit request), inputs/buttons stay on
  the smaller end of the existing scale (`--radius-sm`).
- **Shadow**: no shadow tokens exist today (components rely on Tailwind's
  defaults ad hoc). Add `--shadow-sm` / `--shadow-md` / `--shadow-lg` tokens
  tuned for both themes (dark theme needs a stronger/darker shadow to read
  against the near-black background) and use them consistently on cards and
  tiles.
- **Group accent colors**: one accent per group, added as new tokens
  (`--group-work`, `--group-money`, `--group-personal`), each with a light
  and dark value in the same OKLCH family as existing tokens so they sit
  naturally next to `--primary`. Signal-blue (`--primary`) remains the
  brand's one true accent for chrome/CTAs; group colors are used only for
  Home tiles/chips, not buttons or nav.

## 4. Navigation shell

Replaces `src/config/nav.ts`'s flat `mainNav` (12 items) and the current
`Sidebar` component.

- **Icon rail** (always visible, far left, ~52px): Home, Calendar, Search
  (⌘K), Settings. Four icons, no labels needed at this count — tooltips on
  hover for clarity.
- **No grouped sidebar, no flyout panel.** Section navigation happens by
  going to Home and picking a group tile, then a section within it (see
  §5). This was chosen after comparing several hybrid nav mechanics —
  keeping the shell almost invisible is the "dérzkiy"/editorial direction,
  and with the owner as the only user, discoverability trade-offs are
  acceptable.
- **Command palette (⌘K)**: a lightweight, new component (no existing
  `cmdk`-style dependency in the repo — build directly on the existing
  Radix primitives already installed, e.g. `@radix-ui/react-dialog` pattern
  already used elsewhere for modals) that lists all sections (flat, with
  group as a subtitle) and jumps on select. v1 is a static route list, not
  full-text search across records — that's future scope.
- `Topbar` in its current form (mostly a user menu) is folded into or
  simplified alongside the icon rail; `JarvisBar` (floating AI assistant)
  is unaffected and stays as-is.

## 5. Home screen

Replaces the current `/dashboard` route content and becomes the actual
landing/navigation surface (`mainNav`'s `Главная` target). The existing
route can keep its path or become `/` — implementation plan decides based
on auth flow; either way there is exactly one landing screen and it is this
one.

**Layout, top to bottom:**

1. **Today summary** (existing greeting hero, rebuilt): what's on fire
   today across modules in one line/row — overdue+due-today tasks,
   payments due soon, debts overdue. This reuses the existing
   `getDashboardSummary` / `getTodayFocus` / `getFinancePulse` query
   functions in `src/features/dashboard/` — they already aggregate this
   data; this sub-project re-skins the presentation, not the queries
   (aside from dropping the now-deleted `todayMood` field, already done).
2. **Three group tiles** — Работа / Деньги / Личное — each a large,
   color-accented card (using the group tokens from §3) that is itself a
   live mini-summary, not just a label:
   - **Работа**: open task count, count due/overdue, top 1-2 "hot"
     projects with progress (reuses `getHotProjects`, `buildTodayFocus`).
   - **Деньги**: balances by currency, upcoming subscription payments,
     open debt total/overdue count (reuses `getAccountsWithBalance`,
     `getFinancePulse`, debt summary helpers).
   - **Личное**: pinned notes count, recent/highlighted wishlist or link
     items.
   Clicking a tile goes to that group's landing (a simple section picker
   for its modules, e.g. Работа → Задачи/Проекты/Заявки/Цели), clicking a
   number/row inside a tile deep-links straight to the relevant filtered
   view (e.g. clicking "3 overdue tasks" opens Tasks pre-filtered).
3. **Calendar** stays visible as its own quick-access affordance (icon rail
   item, §4) rather than a Home tile, since it's inherently cross-cutting.

This is where "не вижу единой картины" gets solved: one screen, real data,
grouped by meaning instead of a flat module list.

## 6. Data model changes

Small, additive, consistent with the existing "Project as hub" pattern
(`Task.projectId`, `Note.projectId` already exist):

- Add optional `projectId` (nullable, `onDelete: SetNull`, indexed) to
  `Transaction` and `Subscription`, mirroring the existing pattern exactly.
- No other schema changes in this sub-project. Broader/generic linking is
  explicitly deferred (§2).
- New Prisma migration required; run via `pnpm db:migrate` against the
  local Docker Postgres (already confirmed running on port 5434).

## 7. Files touched (expected)

- `src/app/globals.css` — new tokens (§3)
- `src/config/nav.ts` — replaced with grouped structure (Home/group/section
  metadata) instead of flat `mainNav`
- `src/components/layout/sidebar.tsx` → replaced by a new icon-rail
  component
- `src/components/layout/topbar.tsx` — simplified/merged
- New: command palette component (§4)
- `src/app/(app)/dashboard/page.tsx` (or new Home route) — rebuilt per §5,
  reusing existing `src/features/dashboard/queries.ts` and
  `src/features/dashboard/lib/*` (today-focus, finance-pulse) largely
  as-is
- `prisma/schema.prisma` + new migration — §6
- No changes expected to individual module pages (Tasks, Projects, Finances
  UI, etc.) — explicitly out of scope (§2)

## 8. Testing

- Existing pure-function tests in `src/features/dashboard/lib/__tests__/`
  (today-focus, finance-pulse) stay valid since query logic isn't changing;
  extend them only if group-tile summary logic needs new pure helpers
  (e.g. a `buildGroupSummary` function) — follow existing TDD conventions
  (`pnpm test`, vitest).
- New command palette gets a basic interaction test if its filtering logic
  is non-trivial enough to warrant one; pure UI wiring doesn't need unit
  tests per existing repo conventions (no tests currently exist for
  `Sidebar`/`Topbar`).
- Manual verification: run `pnpm dev`, walk through Home, each group tile's
  drill-down, ⌘K palette, and dark/light theme toggle before calling this
  done.

## 9. Rollout

Single PR/branch, no feature flag needed (single-user app, no external
users to stage for). Foundation ships as one coherent change since the nav
model and Home are tightly coupled — can't ship the icon rail without
Home's group tiles replacing the old nav's job.
