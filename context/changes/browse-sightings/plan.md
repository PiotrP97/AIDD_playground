# Browse Recorded Sightings Implementation Plan

## Overview

Implements S-06 (FR-008's full scope): a system-wide, paginated, public list
of all recorded sightings — distinct from the station-scoped occurrence
history `/stations/[id].astro` already delivers as part of S-01. Also
introduces Vitest as the project's first test runner, scoped to a small
pagination utility.

## Current State Analysis

S-01 (record-a-sighting) is implemented and merged, so the schema, RLS, and
query pattern this slice needs already exist and are proven:

- `sightings` / `rolling_stock_types` / `stations` tables with public-read
  RLS (`supabase/migrations/20260802140537_domain_schema.sql`).
- `src/pages/stations/[id].astro` already establishes the exact pattern this
  page needs: server-rendered Astro page, direct Supabase query joining
  `sightings` → `rolling_stock_types` / `stations`, `Intl.DateTimeFormat`
  for timestamps, a dark-themed `<table>`, no auth gate.
- `context/foundation/lessons.md` has one standing rule so far: always check
  the Supabase `error` from a query rather than discarding it.
- No test runner exists in this repo yet (`package.json` has no `test`
  script, no `vitest`/`jest`/etc. in devDependencies).
- No pagination or list-filtering code exists anywhere in the codebase —
  this is the first paginated view.

## Desired End State

Any visitor (signed in or not) can visit a sightings list showing every
recorded sighting system-wide, newest first, with prev/next pagination.
Each row shows the rolling-stock type name, the station name (linked to
that station's own page), and when the sighting occurred. The page is
reachable from the Topbar (public) and the dashboard.

Verification: `npm run build`, `npm run test`, and the manual steps below
against local Supabase with the existing seeded/created test data.

### Key Discoveries:

- `src/pages/stations/[id].astro:16-30` — the exact create-client /
  query / error-check / render pattern this page reuses: `createClient`
  returns `null` when unconfigured (503), the query destructures both
  `data` and `error`, and `error` is logged (not silently discarded) per
  `lessons.md`.
- `src/pages/stations/[id].astro:47-71` — the table markup, dark-theme
  classes, and `Intl.DateTimeFormat("en-GB", { dateStyle: "medium",
  timeStyle: "short" })` formatter this page's table reuses verbatim.
- `src/components/Topbar.astro` and `src/layouts/Layout.astro` — `Topbar`
  is now centrally mounted in `Layout.astro` (fixed during S-01's
  impl-review), so every page already has it; only the link itself needs
  adding to `Topbar.astro`.
- `package.json` — Vite is already a transitive dependency (via Astro) at
  `^7.3.2` (see the `overrides` block), so Vitest needs no separate Vite
  version to reconcile.
- No `.test.ts` / `__tests__` convention exists yet — this plan establishes
  co-located `*.test.ts` files next to source, Vitest's own default
  discovery pattern, requiring no custom `include` config.

## What We're NOT Doing

- Search or filtering (FR-013, nice-to-have, Parked in the roadmap) — this
  slice is a flat, paginated list only, per the PRD's explicit FR-008/
  FR-013 boundary.
- Any change to the station-scoped occurrence history page — it keeps
  showing all of a station's sightings unpaginated, unaffected by this
  slice.
- Rating display (FR-009 / S-08 not built yet) or prediction data (S-09).
- A test runner beyond what this slice's own pagination utility needs —
  Vitest is introduced here, but broader test coverage (API routes,
  components) is explicitly out of scope for this plan.

## Implementation Approach

Two phases: (1) a small, framework-free pagination utility with Vitest unit
tests — this also stands up the project's first test runner — and (2) the
list page itself plus its two nav entry points. The page is a plain
server-rendered Astro route with prev/next `<a>` links (full page
navigation via the `page` query param), matching the app's existing
no-client-JS-needed pattern for this kind of view — no new API route.

## Critical Implementation Details

### User experience spec: invalid/out-of-range `page` param

The `page` query param is a display parameter, not a resource identifier
(unlike a station `id`, which 404s when invalid) — so it should never error
or 404. `parsePage` treats anything non-numeric, missing, zero, or negative
as page `1`. Once the total row count is known from the query, `clampPage`
pulls any page beyond the last one back to the last valid page (e.g.
`?page=9999` on a 3-page result set silently renders page 3, not an empty
page or an error).

## Phase 1: Pagination utility + Vitest setup

### Overview

Adds `vitest` as a dev dependency with a `test` script, and a small,
framework-free pagination utility with unit tests covering its edge cases.

### Changes Required:

#### 1. Vitest setup

**File**: `package.json`

**Intent**: Add the project's first test runner.

**Contract**: `vitest` added to `devDependencies`; `"test": "vitest run"` script added. No `vitest.config.ts` needed — the test target imports nothing that needs a Vite plugin (no Tailwind/Astro/React), so Vitest's bare defaults are sufficient. This does NOT mean Vitest inherits `astro.config.mjs`'s Vite setup — zero-config Vitest never reads that file at all; it's coincidentally fine only because this specific utility needs no plugin.

#### 2. Pagination utility

**File**: `src/lib/pagination.ts`

**Intent**: Centralizes the page-param parsing, range calculation, and clamping logic the list page needs, as plain, independently testable functions.

**Contract**:
- `const PAGE_SIZE = 20`
- `parsePage(raw: string | null): number` — returns `1` for anything not a positive integer.
- `calculateRange(page: number, pageSize: number): { from: number; to: number }` — zero-indexed, inclusive bounds matching Supabase's `.range(from, to)` contract.
- `calculateTotalPages(count: number, pageSize: number): number` — `Math.max(1, Math.ceil(count / pageSize))` (always at least 1 page, even with zero rows, so the empty-state page itself is always reachable at `?page=1`).
- `clampPage(page: number, totalPages: number): number`

#### 3. Pagination utility tests

**File**: `src/lib/pagination.test.ts`

**Intent**: Covers the edge cases named in this plan's Critical Implementation Details — invalid/missing/negative/zero page input, and out-of-range clamping.

**Contract**: One `describe` block per function; cases include `parsePage(null)`, `parsePage("abc")`, `parsePage("0")`, `parsePage("-3")`, `parsePage("2")`; `calculateTotalPages(0, 20)` (expect `1`, not `0`); `clampPage` above and below the valid range.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Unit tests pass: `npm run test`
- Build succeeds: `npm run build`

#### Manual Verification:

- None — this phase is pure logic with full unit coverage; no user-facing surface yet.

---

## Phase 2: Sightings list page + nav

### Overview

The public, paginated sightings list itself, plus its two nav entry points (Topbar, dashboard).

### Changes Required:

#### 1. Sightings list page

**File**: `src/pages/sightings/index.astro`

**Intent**: Server-rendered, no auth required (matches the public-read RLS policy, mirrors `stations/[id].astro`'s pattern). Reads the `page` query param, queries a page of sightings joined with their rolling-stock type and station, renders a table, and renders prev/next links.

**Contract**: Query: `supabase.from("sightings").select("id, occurred_at, rolling_stock_types(name), stations(id, name)", { count: "exact" }).order("occurred_at", { ascending: false }).range(from, to)`, using `parsePage`/`calculateRange` from `src/lib/pagination.ts`; `error` is checked and logged per `lessons.md`, same as `stations/[id].astro`. Once `count` is known, clamp via `clampPage` and re-derive `from`/`to` if the requested page was out of range. If `clampPage` changes the page number, re-run the query with the newly-derived `from`/`to` before rendering — the first query's `data` is empty for an out-of-range page even though `count` is accurate. Table columns: rolling-stock type name (plain text — no type detail page exists yet), station name (linked to `/stations/{id}`), `occurred_at` formatted with the same `Intl.DateTimeFormat` config as `stations/[id].astro`. Empty state: `<p>No sightings recorded yet.</p>`, matching that page's exact copy. Prev/next: plain `<a href="/sightings?page={n}">` links, omitted (not just disabled) at the first/last page respectively.

#### 2. Nav wiring

**File**: `src/components/Topbar.astro`, `src/pages/dashboard.astro`

**Intent**: Makes the new page discoverable from both the always-visible Topbar (since FR-008 is public) and the dashboard.

**Contract**: `Topbar.astro` is currently a single `{ user ? (...) : (...) }` ternary with no markup shared between its two branches — restructure it to render a shared, always-visible links section (containing the new `<a href="/sightings">Sightings</a>` link) outside that ternary, so it's a single source of truth rather than duplicated into both branches; the ternary itself stays scoped to genuinely auth-dependent content (email/Dashboard/Record sighting/Sign out vs. Sign in/Sign up). `dashboard.astro` gets a second link alongside the existing "Record a sighting" one.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Build succeeds: `npm run build`
- Unit tests still pass: `npm run test`

#### Manual Verification:

- Visiting `/sightings` while signed out shows the list (confirms public read)
- With more than 20 sightings seeded, prev/next links appear and navigate correctly; the first page has no "prev", the last page has no "next"
- Visiting `/sightings?page=9999` (beyond the last page) clamps to the last valid page instead of erroring or showing a blank page
- A station name in the list links to that station's own `/stations/{id}` page
- With zero sightings (fresh local DB before seeding), the page shows "No sightings recorded yet." instead of an empty table
- Topbar's "Sightings" link is visible both signed in and signed out; dashboard's link works when signed in

**Implementation Note**: After this phase's automated verification passes, pause for manual confirmation — this phase's manual steps are the end-to-end proof S-06 works.

---

## Testing Strategy

### Unit Tests:

- `src/lib/pagination.test.ts` — `parsePage`, `calculateRange`, `calculateTotalPages`, `clampPage`, covering the invalid-input and out-of-range cases named in Critical Implementation Details.

### Integration Tests:

None — this repo has no integration-test setup, and adding one is out of scope per "What We're NOT Doing."

### Manual Testing Steps:

1. `npx supabase start`, `npm run dev`.
2. Ensure at least 20+ sightings exist locally (reuse `/sightings/new` from S-01, or seed directly via SQL, to exceed one page).
3. Visit `/sightings` signed out; confirm the list renders, newest sighting first.
4. Click "Next"; confirm the URL becomes `?page=2` and different rows render. Click "Prev" to return.
5. Manually visit `/sightings?page=9999`; confirm it clamps to the actual last page rather than erroring.
6. Click a station name in a row; confirm it navigates to that station's `/stations/{id}` page.
7. Confirm the Topbar's "Sightings" link is present both signed in and signed out, and the dashboard's link works signed in.

## Performance Considerations

Fixed page size (20) keeps each request's row count bounded regardless of
total sighting count, so this scales fine at the roadmap's stated MVP scale
(`target_scale.qps: low`) without caching.

Offset-based pagination (`.range()`) can shift or duplicate a row at page
boundaries if a new sighting is recorded while a visitor is mid-browse —
accepted as a low-probability, low-impact limitation at this scale; cursor-
based pagination would be the eventual fix if it ever matters.

## Migration Notes

No schema changes — this slice only reads existing tables.

## References

- Roadmap: `context/foundation/roadmap.md` (`### S-06: Browse sightings`)
- PRD: `context/foundation/prd.md` (FR-008)
- Lessons: `context/foundation/lessons.md` (Supabase query error-checking rule)
- Closest existing implementation pattern: `src/pages/stations/[id].astro`
- Prior change: `context/changes/record-a-sighting/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Pagination utility + Vitest setup

#### Automated

- [x] 1.1 Lint passes: `npm run lint` — db648d6
- [x] 1.2 Unit tests pass: `npm run test` — db648d6
- [x] 1.3 Build succeeds: `npm run build` — db648d6

### Phase 2: Sightings list page + nav

#### Automated

- [x] 2.1 Lint passes: `npm run lint` — ef23f87
- [x] 2.2 Build succeeds: `npm run build` — ef23f87
- [x] 2.3 Unit tests still pass: `npm run test` — ef23f87

#### Manual

- [x] 2.4 Visiting /sightings while signed out shows the list — ef23f87
- [x] 2.5 Prev/next links appear correctly and navigate; absent at first/last page — ef23f87
- [x] 2.6 /sightings?page=9999 clamps to the last valid page — ef23f87
- [x] 2.7 Station name links to that station's /stations/{id} page — ef23f87
- [x] 2.8 Zero-sightings state shows "No sightings recorded yet." — ef23f87
- [x] 2.9 Topbar "Sightings" link visible signed in and signed out; dashboard link works signed in — ef23f87
