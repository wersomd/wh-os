# JinseiOS: solid minimalism redesign and Kaspi-style finance categories

Date: 2026-08-22
Status: proposed

## Goal

Redesign the authenticated JinseiOS application into a quiet, solid personal
workspace. The interface must be practical for its primary daily use:
finances, debts, and tasks. It uses a white light theme and a genuine dark
theme, with green as the only product accent. The finance flow replaces free
text categories with an explicit chooser seeded with familiar categories for
Kaspi Gold spending.

## Product principles

1. Work surface first. Information, status, and next actions appear before
   decoration.
2. One accent only. Green communicates selection, the primary action, positive
   movement, and focused input. Income and expense keep accessible semantic
   colors only where their meaning requires it.
3. Calm density. Pages use simple bands and aligned lists, not stacks of
   floating cards. Borders divide areas; shadows are absent or nearly
   imperceptible.
4. Familiar finance. An operation has a clear account, amount, date, and a
   selectable category. Transfers remain a separate operation and never read as
   ordinary spending.
5. Dark is first-class. Both themes use the same hierarchy and interaction
   rules, not a recolored light interface.

## Visual system

### Tokens

`src/app/globals.css` becomes the single source of the application palette.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `background` | pure white | deep graphite | application canvas |
| `card` | white or a near-white band | charcoal surface | compact tools, dialogs, repeated rows only |
| `foreground` | near-black | near-white | primary text |
| `muted` | cool light gray | dark gray-green | inactive surfaces |
| `border` | neutral gray | low-contrast gray-green | structure and dividers |
| `primary` | mature evergreen | lighter evergreen | selected state and primary command |
| `success` | muted green | soft green | positive money state |
| `destructive` | restrained brick red | soft coral | spending and destructive states |

The electric-violet primary and ring values are removed. Corner radius is 6px
for controls and 8px for dialogs and compact cards. Numeric amounts use
`tabular-nums`. There are no gradients, decorative glows, large colored
surfaces, or animated background effects.

### Application shell

- Sidebar: white/graphite vertical rail with grouped navigation, a single quiet
  active row, and no colored icon field. The active row has a soft green tint
  plus green icon/text treatment.
- Top bar: slim and functional. Keep only mobile navigation, theme control, and
  account menu.
- Page header: title, short contextual period or status, then one primary
  command. Secondary commands become outline buttons or an overflow menu.
- Tabs: baseline tabs with a green active underline, rather than enclosed pills.
- Lists: one framed list with row dividers. Repeated objects do not get cards
  inside cards.

## Finance experience

### Navigation and overview

`/finances` has four tabs: `Обзор`, `Операции`, `Категории`, `Бюджеты`.
Analytics remains within the overview as an expandable period view rather than
a competing top-level visual destination.

The overview order is:

1. Balance across active accounts.
2. Income and expense for the current month.
3. Recent operations, presented as a dense readable list.
4. Spending by category and budget progress.

Accounts use compact rows or modest panels, with archive/edit actions under an
overflow menu. The current `SavingsInsightCard` becomes a quiet optional block,
not the page hero.

### Operation entry

The new operation dialog keeps the existing amount, date, account, category,
and note data model. It becomes a short vertical sequence: expense/income,
amount, category, account and date, note.

The category field becomes mandatory for normal income and expenses. It opens a
searchable grouped selector, never a free-text input. The selected category is
shown with a small neutral icon tile and its label. A `Другое` category is
always available. Adding a custom category is available only from the
`Категории` tab, not while entering an operation.

Transfers continue to be entered through the dedicated transfer dialog and use
the system `Перевод` category internally. It remains hidden from category
selection and expense analytics.

### Default categories

Kaspi publicly confirms its purchase analytics includes categories such as
supermarkets, cafes and restaurants, and clothes and shoes. It does not publish
an exhaustive public taxonomy. JinseiOS therefore uses the following familiar,
editable starter set rather than claiming an exact private Kaspi list.

Expense groups:

| Group | Categories |
| --- | --- |
| Everyday | Продукты, Кафе и рестораны, Дом и коммунальные услуги, Связь и интернет |
| Movement | Такси и транспорт, Авто и топливо |
| Personal | Здоровье и аптеки, Красота и уход, Одежда и обувь, Образование |
| Life | Маркетплейсы и покупки, Подписки и сервисы, Развлечения, Путешествия |
| Family | Дети и семья, Подарки и благотворительность |
| Other | Другое |

Income groups:

| Group | Categories |
| --- | --- |
| Main | Зарплата, Подработка и фриланс, Бизнес |
| Other | Возврат средств, Подарки, Инвестиции, Другое |

Each preset has a stable Lucide icon and a restrained semantic color. The user
may rename, recolor, add, archive, or hide a category from the Categories tab.
Preset categories are created idempotently: existing categories are preserved;
missing presets are inserted. The application never duplicates a category with
the same name and transaction type.

### Data and validation

The existing `Category` model already supports a name, transaction type, color,
and icon. Add a `kind` field (`SYSTEM`, `PRESET`, `CUSTOM`) and `active` boolean
with defaults that preserve current rows as custom and active. The compound
unique name/type constraint stays in place.

`Transaction.categoryId` is required only for new ordinary user-entered
income/expense transactions after the migration. Existing uncategorized rows
remain valid and display as `Без категории` until the user edits them. The
server action accepts a category id, validates that it is active and matches the
operation type, and never creates a category from user-entered text.

## Tasks, debts, and remaining modules

### Tasks

- The default view is a clean list with checkbox, title, project, due date, and
  priority aligned into stable columns.
- Board remains available, but is a focused working mode with restrained column
  surfaces and no decorative color treatment.
- Quick add stays at the top as the primary capture action.

### Debts

- The summary separates `Я должен` and `Мне должны` in two aligned values.
- Debt rows show person, remaining amount, due date, and a compact payment
  action. Status is semantic text and not a large colored badge.
- Payment is a focused dialog using the same field sequence as a finance
  operation.

### Other modules

Projects, calendar, notes, health, subscriptions, goals, links, wishlist,
journal, and settings inherit the new tokens and application shell. Any module
with a repeated-card layout moves toward framed lists, rows, and full-width
sections. No business behavior is changed outside finance category handling.

## Architecture

### Shared components

- Refine the existing UI primitives in `src/components/ui/` through tokens,
  retaining their APIs.
- Add a small `CategoryIcon` mapping component in the finance feature so icon
  names are not coupled to database values across pages.
- Add reusable `FinanceCategoryPicker` for operation dialogs and category
  management. It takes type, value, categories, and an `onValueChange` callback.
- Retain `PageHeader`, `EmptyState`, and common formatted money utilities.

### Data flow

```
FinancesPage
  -> queries active and inactive categories with id, group, icon, color, kind
  -> FinancesView renders overview, operations, categories, budgets
  -> TransactionDialog uses FinanceCategoryPicker
  -> server action validates category ID + transaction type
  -> Prisma persists the transaction and refreshes /finances + /dashboard
```

## Migration and rollout

1. Add category metadata fields and create an idempotent seed/upsert routine.
2. Preserve all existing categories and transactions.
3. Replace category-name transaction APIs with category-id APIs while accepting
   existing uncategorized data on reads.
4. Release the selector, then remove the free-text category input.

## Verification

- Unit test category seeding, uniqueness, active status, and type validation.
- Unit test that an expense cannot use an income category and that a transfer
  does not appear in category spending.
- Add component tests for category filtering and selected state.
- Run lint, the full test suite, and a production build.
- Verify light and dark themes at desktop and mobile widths, including finance,
  debts, tasks, a category picker, and a transaction dialog.

## Files expected to change

- `src/app/globals.css`
- `src/components/layout/{sidebar,topbar}.tsx`
- `src/components/ui/*` where visual primitives need token-aligned refinement
- `prisma/schema.prisma` plus a new migration and seed update
- `src/features/finances/{constants,queries,actions,schema}.ts`
- `src/features/finances/components/*`
- `src/features/tasks/components/*`
- `src/features/debts/components/*`
- selected view components for the remaining modules, limited to visual layout
  and shared tokens
