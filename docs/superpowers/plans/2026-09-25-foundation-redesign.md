# WH·OS Foundation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace WH·OS's flat 12-item sidebar with a minimal icon-rail shell and a new Home screen that surfaces cross-module state as three color-coded, meaningful groups (Работа / Деньги / Личное) instead of a flat module list — the design-system, navigation, and Home foundation every later per-module redesign builds on.

**Architecture:** New design tokens (radius/shadow/group-accent) layer onto the existing OKLCH token system without replacing it. `src/config/nav.ts` gains a grouped data model (`navGroups`) alongside the existing flat items, consumed by three new UI pieces: an `IconRail` (replaces `Sidebar`), a click-triggered `CommandPalette` (replaces the old flat nav as the "type to jump" path), and a per-group landing route (`/groups/[id]`). The Home page (`(app)/dashboard/page.tsx`) is rebuilt as a lean greeting + three live `GroupTile`s, reusing (and trimming) the existing `getDashboardSummary` aggregation query plus a new `getPersonalSummary` query.

**Tech Stack:** Next.js 15 App Router (Server Components), React 19, Tailwind v4 (CSS tokens), Radix UI primitives (`Dialog`), Prisma 6 / PostgreSQL, vitest.

**Spec:** `docs/superpowers/specs/2026-09-25-foundation-redesign-design.md`

## Global Constraints

- Keep the existing dual-theme system (light default, dark "ink" theme) — every new token gets both a light and dark value; nothing hard-codes light-only colors.
- Signal-blue (`--primary`) stays the one brand accent for buttons/links/focus rings. New group-accent tokens are used only on Home tiles and the group landing pages, never on chrome/CTAs.
- No new font family — "expressive headline" typography uses the already-installed `--font-display` (Unbounded), just at larger sizes than used today.
- Do not use `⌘K` for the new command palette — `JarvisBar` (`src/features/jarvis/components/jarvis-bar.tsx:36`) already binds `⌘K`/`Ctrl+K` globally to open the AI assistant. The palette in this plan is click-triggered only (from the rail's search icon); no new global keybinding is added.
- No Prisma schema changes in this plan. The spec's §6 (`Transaction`/`Subscription` → `projectId`) is dropped from Foundation scope — adding the column with no UI to set it would ship a half-finished field. It moves to the future cross-linking sub-project the spec already defers to in §2, where it can ship together with the UI that uses it.
- Don't touch individual module pages (Tasks, Projects, Finances, etc.) beyond what's needed to remove now-dead dashboard-only widgets. Per-module visual redesign is explicitly out of scope (spec §2).
- Versions are pinned per `CLAUDE.md` (Next 15, Prisma 6) — do not upgrade either as part of this work.

## Review Focus

- All-empty-data Home render (a fresh DB with zero tasks/accounts/subscriptions/debts/pinned notes/wishlist items/bookmarks) must not crash and must show sensible placeholders, not blank/broken rows — no page-level test exists for this in the repo, so Task 9's manual QA step exercises it explicitly and Task 8's page code guards every list access with conditional fallbacks.
- `/groups/<invalid-id>` (an id that isn't `work`/`money`/`personal`) must 404, not throw — covered by an explicit test in Task 5.
- The command palette's filter must not throw and must still narrow results correctly on a whitespace-only query or a partial Cyrillic match with mixed case — covered by Task 3's tests.
- `IconRail`'s active-state highlighting (`RailLink` in Task 4) must not falsely highlight Home or Calendar while on an unrelated route (`/dashboard`, `/calendar`, `/settings`, or any group module page) — this is inline JSX logic with no dedicated unit test, so Task 9's manual QA (Step 6) exercises it explicitly across all three.
- The new group-accent "soft" background tokens must stay legible (foreground text readable) in dark mode — this is a visual/contrast property no automated test in this repo checks (no visual regression tooling here), so Task 9's manual QA explicitly checks all three tiles in dark mode before calling the plan done.

---

## Task 1: Design tokens — radius, shadow, group accents

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: Tailwind utility classes consumed by later tasks — `bg-group-work` / `bg-group-work-soft` / `text-group-work` (and the `-money` / `-personal` equivalents), plus `shadow-sm` / `shadow-md` / `shadow-lg` now resolving to the new theme-aware shadows instead of Tailwind's flat defaults. Bumped `--radius` (0.5rem → 0.75rem) flows through the existing `--radius-sm/md/lg/xl` derived tokens automatically — no other file needs to reference the new value directly.

- [ ] **Step 1: Bump the base radius**

In `src/app/globals.css`, inside `:root`, change:

```css
  --radius: 0.5rem;
```

to:

```css
  --radius: 0.75rem;
```

- [ ] **Step 2: Add light-mode group-accent and shadow tokens**

In `src/app/globals.css`, inside `:root`, immediately after the existing `--brand-node: oklch(0.55 0.24 264);` line (still inside the same `:root { ... }` block), add:

```css

  /* Group accents — Home tiles / group landing pages only, never chrome/CTAs */
  --group-work: oklch(0.55 0.24 264);
  --group-work-soft: oklch(0.95 0.02 264);
  --group-money: oklch(0.62 0.19 45);
  --group-money-soft: oklch(0.95 0.03 45);
  --group-personal: oklch(0.5 0.12 155);
  --group-personal-soft: oklch(0.95 0.02 155);

  /* Shadows — theme-aware; dark mode needs more opacity to read against ink */
  --wh-shadow-sm: 0 1px 2px 0 oklch(0.17 0.006 264 / 0.06);
  --wh-shadow-md: 0 4px 14px -4px oklch(0.17 0.006 264 / 0.12);
  --wh-shadow-lg: 0 12px 32px -8px oklch(0.17 0.006 264 / 0.16);
```

- [ ] **Step 3: Add dark-mode group-accent and shadow tokens**

In `src/app/globals.css`, inside `.dark { ... }`, immediately after the existing `--brand-node: oklch(0.78 0.16 264);` line, add:

```css

  --group-work: oklch(0.62 0.2 264);
  --group-work-soft: oklch(0.26 0.03 264);
  --group-money: oklch(0.72 0.17 45);
  --group-money-soft: oklch(0.28 0.04 45);
  --group-personal: oklch(0.74 0.13 155);
  --group-personal-soft: oklch(0.26 0.03 155);

  --wh-shadow-sm: 0 1px 2px 0 oklch(0 0 0 / 0.3);
  --wh-shadow-md: 0 4px 14px -4px oklch(0 0 0 / 0.4);
  --wh-shadow-lg: 0 12px 32px -8px oklch(0 0 0 / 0.5);
```

- [ ] **Step 4: Expose the new tokens to Tailwind**

In `src/app/globals.css`, inside `@theme inline { ... }`, immediately after the existing `--color-ring: var(--ring);` line, add:

```css

  --color-group-work: var(--group-work);
  --color-group-work-soft: var(--group-work-soft);
  --color-group-money: var(--group-money);
  --color-group-money-soft: var(--group-money-soft);
  --color-group-personal: var(--group-personal);
  --color-group-personal-soft: var(--group-personal-soft);

  --shadow-sm: var(--wh-shadow-sm);
  --shadow-md: var(--wh-shadow-md);
  --shadow-lg: var(--wh-shadow-lg);
```

- [ ] **Step 5: Verify the build picks up the new tokens**

Run: `pnpm build`
Expected: build succeeds with no CSS/type errors (this is a pure CSS addition, nothing consumes the new classes yet — this step just confirms Tailwind v4 parses the new `@theme inline` entries without error).

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): add radius bump, shadow tokens, and group-accent colors"
```

---

## Task 2: Grouped navigation config

**Files:**
- Modify: `src/config/nav.ts`
- Test: `src/config/__tests__/nav.test.ts`

**Interfaces:**
- Produces: `type GroupId = "work" | "money" | "personal"`; `type NavItem = { title: string; href: string; icon: LucideIcon }`; `type NavGroup = { id: GroupId; title: string; icon: LucideIcon; items: NavItem[] }`; `type SearchableNavItem = NavItem & { groupTitle: string }`; `navGroups: NavGroup[]`; `railNav: NavItem[]`; `footerNav: NavItem[]`; `allNavItems(): SearchableNavItem[]`.
- Consumed by: Task 3 (`allNavItems`), Task 4 (`railNav`, `footerNav`), Task 5 (`navGroups`), Task 7 (`GroupId`).

- [ ] **Step 1: Write the failing tests**

Create `src/config/__tests__/nav.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { allNavItems, navGroups } from "@/config/nav";

describe("allNavItems", () => {
  it("flattens every group's items with their group title attached", () => {
    const items = allNavItems();
    const expectedCount = navGroups.reduce((sum, g) => sum + g.items.length, 0);
    expect(items).toHaveLength(expectedCount);

    const tasks = items.find((i) => i.href === "/tasks");
    expect(tasks?.groupTitle).toBe("Работа");
    const finances = items.find((i) => i.href === "/finances");
    expect(finances?.groupTitle).toBe("Деньги");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- nav.test.ts`
Expected: FAIL — `nav.ts` doesn't export `navGroups`/`allNavItems` yet (current file only has `mainNav`/`footerNav`).

- [ ] **Step 3: Replace `src/config/nav.ts`**

```ts
import {
  LayoutDashboard,
  CalendarRange,
  Settings,
  Briefcase,
  Landmark,
  Heart,
  CheckSquare,
  FolderKanban,
  Inbox,
  Target,
  Wallet,
  HandCoins,
  CreditCard,
  StickyNote,
  Bookmark,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type GroupId = "work" | "money" | "personal";

export type NavGroup = {
  id: GroupId;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
};

export type SearchableNavItem = NavItem & { groupTitle: string };

export const navGroups: NavGroup[] = [
  {
    id: "work",
    title: "Работа",
    icon: Briefcase,
    items: [
      { title: "Задачи", href: "/tasks", icon: CheckSquare },
      { title: "Проекты", href: "/projects", icon: FolderKanban },
      { title: "Заявки", href: "/leads", icon: Inbox },
      { title: "Цели", href: "/goals", icon: Target },
    ],
  },
  {
    id: "money",
    title: "Деньги",
    icon: Landmark,
    items: [
      { title: "Финансы", href: "/finances", icon: Wallet },
      { title: "Долги", href: "/debts", icon: HandCoins },
      { title: "Подписки", href: "/subscriptions", icon: CreditCard },
    ],
  },
  {
    id: "personal",
    title: "Личное",
    icon: Heart,
    items: [
      { title: "Заметки", href: "/notes", icon: StickyNote },
      { title: "Ссылки", href: "/links", icon: Bookmark },
      { title: "Хочу", href: "/wishlist", icon: Sparkles },
    ],
  },
];

// Always-visible icon rail — Home and Calendar sit outside any group since
// they're inherently cross-cutting, not owned by one module.
export const railNav: NavItem[] = [
  { title: "Главная", href: "/dashboard", icon: LayoutDashboard },
  { title: "Календарь", href: "/calendar", icon: CalendarRange },
];

export const footerNav: NavItem[] = [
  { title: "Настройки", href: "/settings", icon: Settings },
];

export function allNavItems(): SearchableNavItem[] {
  return navGroups.flatMap((group) =>
    group.items.map((item) => ({ ...item, groupTitle: group.title })),
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- nav.test.ts`
Expected: PASS

- [ ] **Step 5: Find and note the old `mainNav` consumers (don't fix yet)**

Run: `grep -rln "mainNav" src`
Expected output: `src/components/layout/sidebar.tsx` only (the old `Sidebar`/`Topbar` are fully replaced in Task 4 — leave them broken/unused between Task 2 and Task 4, this repo has no CI gate on intermediate commits within a single plan run).

- [ ] **Step 6: Commit**

```bash
git add src/config/nav.ts src/config/__tests__/nav.test.ts
git commit -m "feat(nav): replace flat mainNav with grouped navGroups + railNav"
```

---

## Task 3: Command palette filter logic

**Files:**
- Create: `src/components/layout/command-palette-filter.ts`
- Test: `src/components/layout/__tests__/command-palette-filter.test.ts`

**Interfaces:**
- Consumes: `SearchableNavItem` from `@/config/nav` (Task 2).
- Produces: `filterNavItems(items: SearchableNavItem[], query: string): SearchableNavItem[]`, consumed by Task 4's `CommandPalette` component.

- [ ] **Step 1: Write the failing tests**

Create `src/components/layout/__tests__/command-palette-filter.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { CheckSquare, Wallet } from "lucide-react";
import { filterNavItems } from "../command-palette-filter";
import type { SearchableNavItem } from "@/config/nav";

const items: SearchableNavItem[] = [
  { title: "Задачи", href: "/tasks", icon: CheckSquare, groupTitle: "Работа" },
  { title: "Финансы", href: "/finances", icon: Wallet, groupTitle: "Деньги" },
];

describe("filterNavItems", () => {
  it("returns everything for an empty query", () => {
    expect(filterNavItems(items, "")).toEqual(items);
  });

  it("returns everything for a whitespace-only query", () => {
    expect(filterNavItems(items, "   ")).toEqual(items);
  });

  it("matches by item title, case-insensitively", () => {
    expect(filterNavItems(items, "ЗАдач")).toEqual([items[0]]);
  });

  it("matches by group title", () => {
    expect(filterNavItems(items, "деньги")).toEqual([items[1]]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterNavItems(items, "xyz")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- command-palette-filter.test.ts`
Expected: FAIL — `../command-palette-filter` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/components/layout/command-palette-filter.ts`:

```ts
import type { SearchableNavItem } from "@/config/nav";

export function filterNavItems(
  items: SearchableNavItem[],
  query: string,
): SearchableNavItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.groupTitle.toLowerCase().includes(q),
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- command-palette-filter.test.ts`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/command-palette-filter.ts src/components/layout/__tests__/command-palette-filter.test.ts
git commit -m "feat(nav): add pure filter function for the command palette"
```

---

## Task 4: Shell — CommandPalette, IconRail, TopStrip, wire into layout

**Files:**
- Create: `src/components/layout/command-palette.tsx`
- Create: `src/components/layout/icon-rail.tsx`
- Create: `src/components/layout/top-strip.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Delete: `src/components/layout/sidebar.tsx`
- Delete: `src/components/layout/topbar.tsx`

**Interfaces:**
- Consumes: `railNav`, `footerNav`, `allNavItems` from `@/config/nav` (Task 2); `filterNavItems` from `./command-palette-filter` (Task 3); existing `Dialog`/`DialogContent`/`DialogTitle` (`@/components/ui/dialog`), `Input` (`@/components/ui/input`), `AccountMenu`/`ThemeToggle` (unchanged), `BrandMark` (unchanged).
- Produces: `<IconRail />` (no props), `<TopStrip user={{ email, name }} />`, `<CommandPalette open onOpenChange />` — none of these are consumed outside `layout.tsx` in this plan.

- [ ] **Step 1: Create the command palette component**

Create `src/components/layout/command-palette.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { allNavItems } from "@/config/nav";
import { filterNavItems } from "./command-palette-filter";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const items = useMemo(() => allNavItems(), []);
  const results = useMemo(() => filterNavItems(items, query), [items, query]);

  function go(href: string) {
    router.push(href);
    onOpenChange(false);
    setQuery("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="top-[20%] max-w-md translate-y-0 gap-0 rounded-2xl p-0 shadow-lg"
        onInteractOutside={() => {
          // Unlike the app's form dialogs, a stray click outside a "jump to"
          // palette is exactly how you're meant to dismiss it.
        }}
      >
        <DialogTitle className="sr-only">Перейти в раздел</DialogTitle>
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Куда перейти?"
          className="h-12 rounded-b-none rounded-t-2xl border-x-0 border-t-0 focus-visible:ring-0"
        />
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Ничего не найдено
            </li>
          )}
          {results.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <button
                  type="button"
                  onClick={() => go(item.href)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="flex-1">{item.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.groupTitle}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create the icon rail**

Create `src/components/layout/icon-rail.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { railNav, footerNav, type NavItem } from "@/config/nav";
import BrandMark from "@/components/shared/brand-mark";
import { CommandPalette } from "./command-palette";

function RailLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={item.title}
      className={cn(
        "flex size-10 items-center justify-center rounded-xl transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="size-5" />
      <span className="sr-only">{item.title}</span>
    </Link>
  );
}

export function IconRail() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 flex w-14 flex-col items-center gap-2 border-r border-border bg-background py-4">
        <Link href="/dashboard" className="mb-4" title="WH·OS">
          <BrandMark />
        </Link>

        <nav className="flex flex-col gap-1">
          {railNav.map((item) => (
            <RailLink key={item.href} item={item} />
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          title="Поиск / перейти в раздел"
          className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Search className="size-5" />
          <span className="sr-only">Поиск / перейти в раздел</span>
        </button>

        <nav className="mt-auto flex flex-col gap-1">
          {footerNav.map((item) => (
            <RailLink key={item.href} item={item} />
          ))}
        </nav>
      </aside>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
```

- [ ] **Step 3: Create the top strip**

Create `src/components/layout/top-strip.tsx`:

```tsx
import { ThemeToggle } from "./theme-toggle";
import { AccountMenu } from "./account-menu";

export function TopStrip({
  user,
}: {
  user: { email?: string | null; name?: string | null };
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-2 border-b border-border bg-background/95 px-4 backdrop-blur md:px-8">
      <ThemeToggle />
      <AccountMenu user={user} />
    </header>
  );
}
```

- [ ] **Step 4: Wire the new shell into the app layout**

Replace the contents of `src/app/(app)/layout.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { IconRail } from "@/components/layout/icon-rail";
import { TopStrip } from "@/components/layout/top-strip";
import JarvisBar from "@/features/jarvis/components/jarvis-bar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = {
    email: session?.user?.email,
    name: session?.user?.name,
  };

  return (
    <div className="min-h-dvh">
      <IconRail />
      <div className="flex min-h-dvh flex-col pl-14">
        <TopStrip user={user} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
      <JarvisBar />
    </div>
  );
}
```

- [ ] **Step 5: Delete the old Sidebar and Topbar**

```bash
rm src/components/layout/sidebar.tsx src/components/layout/topbar.tsx
```

- [ ] **Step 6: Verify nothing else references the deleted files or `mainNav`**

Run: `grep -rln "layout/sidebar\|layout/topbar\|mainNav" src`
Expected: no output.

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: both pass with no errors.

- [ ] **Step 8: Manual check**

Run: `pnpm dev`, open `http://localhost:3000/dashboard` (log in first if needed). Confirm: the icon rail shows on the left (brand mark, Home, Calendar, Search, Settings at the bottom), clicking the search icon opens the palette, typing filters items, selecting one navigates and closes the palette, `⌘K` still opens the Jarvis assistant bar (not the palette) — confirming no shortcut collision.

- [ ] **Step 9: Commit**

```bash
git add src/components/layout/command-palette.tsx src/components/layout/icon-rail.tsx src/components/layout/top-strip.tsx "src/app/(app)/layout.tsx"
git rm src/components/layout/sidebar.tsx src/components/layout/topbar.tsx
git commit -m "feat(shell): replace flat Sidebar/Topbar with IconRail + CommandPalette + TopStrip"
```

---

## Task 5: Group landing route

**Files:**
- Create: `src/app/(app)/groups/[id]/page.tsx`
- Test: `src/app/(app)/groups/__tests__/group-lookup.test.ts`

**Interfaces:**
- Consumes: `navGroups` from `@/config/nav` (Task 2).
- Produces: route `/groups/[id]` — linked from Task 7's `GroupTile` component (`href={`/groups/${id}`}`).

- [ ] **Step 1: Write the failing test for the lookup logic**

The only non-trivial logic on this page is "does this id resolve to a known group." Pull it into a tiny testable function rather than testing the async Server Component directly (this repo has no React Server Component test setup).

Create `src/app/(app)/groups/__tests__/group-lookup.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { findGroupById } from "../group-lookup";

describe("findGroupById", () => {
  it("finds a known group", () => {
    expect(findGroupById("work")?.title).toBe("Работа");
    expect(findGroupById("money")?.title).toBe("Деньги");
    expect(findGroupById("personal")?.title).toBe("Личное");
  });

  it("returns undefined for an unknown id", () => {
    expect(findGroupById("nope")).toBeUndefined();
    expect(findGroupById("")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- group-lookup.test.ts`
Expected: FAIL — `../group-lookup` doesn't exist yet.

- [ ] **Step 3: Write the lookup helper**

Create `src/app/(app)/groups/group-lookup.ts`:

```ts
import { navGroups, type NavGroup } from "@/config/nav";

export function findGroupById(id: string): NavGroup | undefined {
  return navGroups.find((group) => group.id === id);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- group-lookup.test.ts`
Expected: PASS (both tests)

- [ ] **Step 5: Write the page**

Create `src/app/(app)/groups/[id]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findGroupById } from "../group-lookup";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const group = findGroupById(id);
  return { title: group ? group.title : "Раздел" };
}

export default async function GroupLandingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const group = findGroupById(id);
  if (!group) notFound();

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        {group.title}
      </h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {group.items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 shadow-md transition-transform hover:-translate-y-0.5"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <span className="font-medium">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Manual check**

Run: `pnpm dev`, visit `/groups/work`, `/groups/money`, `/groups/personal` — each shows the group's title and links to its modules. Visit `/groups/nope` — confirm it renders the app's 404 page, not a crash.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/groups"
git commit -m "feat(nav): add group landing route (/groups/[id])"
```

---

## Task 6: Dashboard queries — trim summary, add personal summary, delete orphaned widgets

**Files:**
- Modify: `src/features/dashboard/queries.ts`
- Delete: `src/features/dashboard/components/finance-pulse.tsx`
- Delete: `src/features/dashboard/lib/finance-pulse.ts`
- Delete: `src/features/dashboard/lib/__tests__/finance-pulse.test.ts`
- Delete: `src/features/dashboard/components/today-focus.tsx`
- Delete: `src/features/dashboard/lib/today-focus.ts`
- Delete: `src/features/dashboard/lib/__tests__/today-focus.test.ts`
- Delete: `src/features/dashboard/components/dashboard-tasks.tsx`
- Delete: `src/features/calendar/components/dashboard-calendar-widget.tsx`

**Interfaces:**
- Produces: `getDashboardSummary(): Promise<{ tasks: { due: {...}[]; openCount: number }; balances: Record<string, number>; subscriptions: {...}[]; debts: { totals: Record<string, {...}>; overdue: number } }>`; `type DashboardSummary`; `getPersonalSummary(): Promise<{ pinnedNotesCount: number; pinnedNotes: { id: string; title: string }[]; wishlistHighlights: { id: string; title: string }[]; bookmarkCount: number }>`; `type PersonalSummary`. Both consumed by Task 8's Home page. `getHotProjects` (unchanged, from `@/features/projects/queries`) is still used directly by Task 8, not through this file.
- Removes: `getFinancePulse`, `getTodayFocus` (and their exported types) — nothing else in the codebase calls them (verified in Step 1 below).

This task **deletes working code** (the current dashboard's sparkline/budget/net-worth panel, the "today focus" task list, the dedicated dashboard task list, and the mini calendar-month widget). They have no other callers today (verified below) and are not moved anywhere else — this plan's Home is intentionally leaner than the current one (spec §5). Flag to your human partner before starting this task if that trade-off wasn't already confirmed; the plan's own preamble discussion covers why.

- [ ] **Step 1: Confirm these are safe to delete**

Run: `grep -rln "FinancePulse\|TodayFocus\|DashboardTasks\|DashboardCalendarWidget\|getFinancePulse\|getTodayFocus" src --include="*.tsx" --include="*.ts" | grep -v __tests__`
Expected output: only `src/app/(app)/dashboard/page.tsx` and the files listed above (their own definitions). If anything else shows up, stop and re-scope this task — something outside the dashboard depends on one of these.

- [ ] **Step 2: Delete the orphaned files**

```bash
rm src/features/dashboard/components/finance-pulse.tsx
rm src/features/dashboard/lib/finance-pulse.ts
rm src/features/dashboard/lib/__tests__/finance-pulse.test.ts
rm src/features/dashboard/components/today-focus.tsx
rm src/features/dashboard/lib/today-focus.ts
rm src/features/dashboard/lib/__tests__/today-focus.test.ts
rm src/features/dashboard/components/dashboard-tasks.tsx
rm src/features/calendar/components/dashboard-calendar-widget.tsx
```

- [ ] **Step 3: Replace `src/features/dashboard/queries.ts`**

```ts
import "server-only";
import { addDays, endOfDay } from "date-fns";
import { DebtStatus, TaskStatus, WishStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getAccountsWithBalance } from "@/features/finances/queries";
import { computeDebtTotals, isOverdue } from "@/features/debts/summary";

export async function getDashboardSummary() {
  const now = new Date();
  const endToday = endOfDay(now);
  const in7 = endOfDay(addDays(now, 7));

  const [dueTasks, openTaskCount, accounts, upcomingSubs, openDebts] =
    await Promise.all([
      // Tasks due today or overdue, not finished.
      db.task.findMany({
        where: {
          status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
          dueDate: { not: null, lte: endToday },
        },
        orderBy: { dueDate: "asc" },
        take: 6,
        include: { project: { select: { name: true, color: true } } },
      }),
      db.task.count({
        where: { status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] } },
      }),
      getAccountsWithBalance(),
      db.subscription.findMany({
        where: { active: true, nextPaymentDate: { lte: in7 } },
        orderBy: { nextPaymentDate: "asc" },
        take: 6,
        include: { category: { select: { name: true } } },
      }),
      db.debt.findMany({
        where: { status: DebtStatus.OPEN },
        select: {
          direction: true,
          currency: true,
          status: true,
          dueDate: true,
          principal: true,
          payments: { select: { amount: true } },
        },
      }),
    ]);

  // Open debts → per-currency net balance + overdue count.
  const debtRows = openDebts.map((d) => {
    const paid = d.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
    return {
      direction: d.direction,
      currency: d.currency,
      status: d.status,
      dueDate: d.dueDate,
      remaining: Math.max(d.principal.toNumber() - paid, 0),
    };
  });
  const debtTotals = computeDebtTotals(debtRows);
  const overdueDebts = debtRows.filter((d) =>
    isOverdue({ dueDate: d.dueDate, status: d.status }, now),
  ).length;

  // Balance totals per currency (active accounts).
  const balances: Record<string, number> = {};
  for (const a of accounts) {
    if (a.archived) continue;
    balances[a.currency] = (balances[a.currency] ?? 0) + a.balance;
  }

  return {
    tasks: {
      due: dueTasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate as Date,
        priority: t.priority,
        project: t.project,
      })),
      openCount: openTaskCount,
    },
    balances,
    subscriptions: upcomingSubs.map((s) => ({
      id: s.id,
      name: s.name,
      amount: s.amount.toNumber(),
      currency: s.currency,
      nextPaymentDate: s.nextPaymentDate,
      icon: s.icon,
      category: s.category,
    })),
    debts: {
      totals: debtTotals,
      overdue: overdueDebts,
    },
  };
}

export type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>;

// Personal group summary for the Home screen's "Личное" tile.
export async function getPersonalSummary() {
  const [pinnedNotesCount, pinnedNotes, wishlistHighlights, bookmarkCount] =
    await Promise.all([
      db.note.count({ where: { pinned: true } }),
      db.note.findMany({
        where: { pinned: true },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: { id: true, title: true },
      }),
      db.wishItem.findMany({
        where: { status: WishStatus.WANT },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, title: true },
      }),
      db.bookmark.count({ where: { isArchived: false } }),
    ]);

  return { pinnedNotesCount, pinnedNotes, wishlistHighlights, bookmarkCount };
}

export type PersonalSummary = Awaited<ReturnType<typeof getPersonalSummary>>;
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors in `src/app/(app)/dashboard/page.tsx` only (it still imports the now-removed exports and components) — that page is rebuilt in Task 8. No errors anywhere else.

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`
Expected: PASS — the deleted test files are gone, and no remaining test imports them.

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard/queries.ts
git rm src/features/dashboard/components/finance-pulse.tsx src/features/dashboard/lib/finance-pulse.ts src/features/dashboard/lib/__tests__/finance-pulse.test.ts src/features/dashboard/components/today-focus.tsx src/features/dashboard/lib/today-focus.ts src/features/dashboard/lib/__tests__/today-focus.test.ts src/features/dashboard/components/dashboard-tasks.tsx src/features/calendar/components/dashboard-calendar-widget.tsx
git commit -m "refactor(dashboard): trim getDashboardSummary, add getPersonalSummary, drop orphaned widgets"
```

(`page.tsx` is left broken between this task and Task 8 — expected, matches this plan's task ordering; the whole plan is reviewed as one branch before shipping.)

---

## Task 7: GroupTile component

**Files:**
- Create: `src/features/dashboard/components/group-tile.tsx`
- Test: `src/features/dashboard/components/__tests__/group-tile.test.tsx`

**Interfaces:**
- Consumes: `GroupId` from `@/config/nav` (Task 2).
- Produces: `<GroupTile id={GroupId} title={string} icon={LucideIcon}>{children}</GroupTile>` and `<TileRow href={string} label={string} value={string} alert?={boolean} />`, both consumed by Task 8's Home page.

- [ ] **Step 1: Write the failing tests**

Create `src/features/dashboard/components/__tests__/group-tile.test.tsx`:

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Briefcase } from "lucide-react";
import { GroupTile, TileRow } from "../group-tile";

describe("GroupTile", () => {
  it("renders the group title and links its header to the group landing page", () => {
    const html = renderToStaticMarkup(
      <GroupTile id="work" title="Работа" icon={Briefcase}>
        <TileRow href="/tasks" label="Открытых задач" value="3" />
      </GroupTile>,
    );
    expect(html).toContain("Работа");
    expect(html).toContain('href="/groups/work"');
  });

  it("applies the group's accent background", () => {
    const html = renderToStaticMarkup(
      <GroupTile id="money" title="Деньги" icon={Briefcase}>
        <TileRow href="/finances" label="Баланс" value="—" />
      </GroupTile>,
    );
    expect(html).toContain("bg-group-money-soft");
  });
});

describe("TileRow", () => {
  it("renders label, value, and links to the given href", () => {
    const html = renderToStaticMarkup(
      <TileRow href="/tasks" label="Открытых задач" value="3" />,
    );
    expect(html).toContain('href="/tasks"');
    expect(html).toContain("Открытых задач");
    expect(html).toContain(">3<");
  });

  it("applies destructive styling when alert is true", () => {
    const html = renderToStaticMarkup(
      <TileRow href="/tasks" label="Горит сегодня" value="2" alert />,
    );
    expect(html).toContain("text-destructive");
  });

  it("omits destructive styling when alert is false or absent", () => {
    const html = renderToStaticMarkup(
      <TileRow href="/tasks" label="Открытых задач" value="3" />,
    );
    expect(html).not.toContain("text-destructive");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- group-tile.test.tsx`
Expected: FAIL — `../group-tile` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/features/dashboard/components/group-tile.tsx`:

```tsx
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GroupId } from "@/config/nav";

const GROUP_STYLES: Record<GroupId, { bg: string; text: string }> = {
  work: { bg: "bg-group-work-soft", text: "text-group-work" },
  money: { bg: "bg-group-money-soft", text: "text-group-money" },
  personal: { bg: "bg-group-personal-soft", text: "text-group-personal" },
};

export function GroupTile({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: GroupId;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  const styles = GROUP_STYLES[id];
  return (
    <div
      className={cn(
        "rounded-2xl border border-border p-5 shadow-md transition-shadow hover:shadow-lg",
        styles.bg,
      )}
    >
      <Link href={`/groups/${id}`} className="group mb-3 flex items-center gap-2">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-xl bg-background/60",
            styles.text,
          )}
        >
          <Icon className="size-4" />
        </span>
        <h2 className="font-display text-lg font-bold group-hover:underline">
          {title}
        </h2>
      </Link>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function TileRow({
  href,
  label,
  value,
  alert = false,
}: {
  href: string;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-background/60"
    >
      <span className="truncate text-muted-foreground">{label}</span>
      <span
        className={cn(
          "shrink-0 font-semibold tabular-nums",
          alert && "text-destructive",
        )}
      >
        {value}
      </span>
    </Link>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- group-tile.test.tsx`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/components/group-tile.tsx src/features/dashboard/components/__tests__/group-tile.test.tsx
git commit -m "feat(dashboard): add GroupTile + TileRow components"
```

---

## Task 8: Rebuild the Home page

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getDashboardSummary`, `getPersonalSummary` (Task 6); `getHotProjects` (unchanged, `@/features/projects/queries`); `GroupTile`, `TileRow` (Task 7); `formatMoney` (unchanged, `@/features/finances/money`); `AnimatedIn` (unchanged).

- [ ] **Step 1: Replace `src/app/(app)/dashboard/page.tsx`**

```tsx
import type { Metadata } from "next";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Briefcase, Landmark, Heart } from "lucide-react";
import { AnimatedIn } from "@/components/shared/animated-in";
import { GroupTile, TileRow } from "@/features/dashboard/components/group-tile";
import { getHotProjects } from "@/features/projects/queries";
import { formatMoney } from "@/features/finances/money";
import { getDashboardSummary, getPersonalSummary } from "@/features/dashboard/queries";

export const metadata: Metadata = { title: "Главная" };

function greeting(hour: number): string {
  if (hour < 6) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

function pluralizeTask(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "задача";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "задачи";
  return "задач";
}

export default async function DashboardPage() {
  const [s, hotProjects, personal] = await Promise.all([
    getDashboardSummary(),
    getHotProjects(1),
    getPersonalSummary(),
  ]);
  const now = new Date();
  const currencies = Object.entries(s.balances);
  const debtCurrencies = Object.entries(s.debts.totals);
  const topProject = hotProjects[0];
  const nextSub = s.subscriptions[0];
  const firingToday = s.tasks.due.length;

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold tracking-tight">
          {greeting(now.getHours())}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
          {format(now, "EEEE, d MMMM", { locale: ru })}
          {firingToday > 0 &&
            ` · ${firingToday} ${pluralizeTask(firingToday)} горит сегодня`}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <AnimatedIn delay={0}>
          <GroupTile id="work" title="Работа" icon={Briefcase}>
            <TileRow
              href="/tasks"
              label="Открытых задач"
              value={String(s.tasks.openCount)}
            />
            <TileRow
              href="/tasks"
              label="Горит сегодня"
              value={String(firingToday)}
              alert={firingToday > 0}
            />
            {topProject && (
              <TileRow
                href={`/projects/${topProject.id}`}
                label={topProject.name}
                value={`${topProject.progress.percent ?? 0}%`}
              />
            )}
          </GroupTile>
        </AnimatedIn>

        <AnimatedIn delay={0.05}>
          <GroupTile id="money" title="Деньги" icon={Landmark}>
            {currencies.length === 0 ? (
              <TileRow href="/finances" label="Баланс" value="—" />
            ) : (
              currencies.map(([currency, value]) => (
                <TileRow
                  key={currency}
                  href="/finances"
                  label={`Баланс, ${currency}`}
                  value={formatMoney(value, currency)}
                />
              ))
            )}
            {nextSub && (
              <TileRow
                href="/subscriptions"
                label={nextSub.name}
                value={formatMoney(nextSub.amount, nextSub.currency)}
              />
            )}
            {debtCurrencies.length > 0 && (
              <TileRow
                href="/debts"
                label="Просрочено долгов"
                value={String(s.debts.overdue)}
                alert={s.debts.overdue > 0}
              />
            )}
          </GroupTile>
        </AnimatedIn>

        <AnimatedIn delay={0.1}>
          <GroupTile id="personal" title="Личное" icon={Heart}>
            <TileRow
              href="/notes"
              label="Закреплённых заметок"
              value={String(personal.pinnedNotesCount)}
            />
            {personal.wishlistHighlights[0] && (
              <TileRow
                href="/wishlist"
                label={personal.wishlistHighlights[0].title}
                value="хочу"
              />
            )}
            <TileRow
              href="/links"
              label="Сохранённых ссылок"
              value={String(personal.bookmarkCount)}
            />
          </GroupTile>
        </AnimatedIn>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: both pass with no errors.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/dashboard/page.tsx"
git commit -m "feat(dashboard): rebuild Home as greeting + three live GroupTiles"
```

---

## Task 9: Manual QA pass (Review Focus verification)

No new files — this task exercises the app by hand against the Review Focus list before calling Foundation done.

- [ ] **Step 1: Start the app**

Run: `pnpm db:up` (if not already running), then `pnpm dev`. Log in.

- [ ] **Step 2: Empty-data check**

If your local DB has data in every module already, this step is informational only (skip forcing an empty state — don't delete real data to test). Otherwise, confirm the Home page's three tiles degrade gracefully with zero tasks/accounts/subscriptions/debts/notes/wishlist/bookmarks: no blank rows, no "undefined", balances show "—".

- [ ] **Step 3: Group landing 404**

Visit `/groups/nope` directly. Confirm the app's normal 404 page renders (not a stack trace / error overlay).

- [ ] **Step 4: Command palette**

Click the rail's search icon. Type a partial, mixed-case, Cyrillic query (e.g. `ЗАдач`). Confirm it narrows to the matching item(s). Clear the query. Confirm all items return. Press `Escape` or click outside — confirm it closes.

- [ ] **Step 5: `⌘K` still opens Jarvis, not the palette**

Press `⌘K` (or `Ctrl+K`) anywhere in the app. Confirm the Jarvis assistant bar opens — not the command palette (there is no keyboard shortcut for the palette in this plan; this check specifically guards against a future regression reintroducing the same shortcut).

- [ ] **Step 6: Active-state correctness on the rail**

Visit `/dashboard`, `/calendar`, and `/settings` in turn. Confirm neither rail icon looks "extra" active on the other two pages you're not on, and each of the two nav icons (Home, Calendar) only highlights on its own page.

- [ ] **Step 7: Dark mode**

Toggle dark mode (via the top strip). Revisit Home and all three `/groups/[id]` pages. Confirm the group-accent backgrounds and text stay legible (no near-invisible text, no color clipping to pure black/white).

- [ ] **Step 8: Full verification commands**

Run: `npx tsc --noEmit && pnpm lint && pnpm test && pnpm build`
Expected: all four succeed with no errors.

- [ ] **Step 9: Nothing to commit**

This task is verification-only. If Step 2–7 surface a bug, fix it as part of the task whose file owns the bug (amend that task's commit is not allowed per this repo's git conventions — make a new small commit), then re-run Step 8.
