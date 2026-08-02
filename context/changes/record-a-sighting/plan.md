# Record a Sighting Implementation Plan

## Overview

Implements S-01, the roadmap's north star (`context/foundation/roadmap.md`): a
logged-in Member can log in, pick or inline-create a rolling-stock type and a
station via a searchable combobox, and record a sighting with a timestamp. The
sighting appears immediately on the station's public occurrence-history page.
F-01 (core domain schema) was never planned or built separately, so this plan
folds in exactly the minimal schema it needs as Phase 1.

## Current State Analysis

The repo is the unmodified `10x-astro-starter` scaffold plus a working auth
layer — no TrainSpotter domain code exists yet:

- No domain schema: `supabase/migrations/` doesn't exist, no `.sql` file
  exists anywhere in the repo.
- No JSON API convention: the only existing API routes
  (`src/pages/api/auth/{signin,signup,signout}.ts`) are classic HTML
  `formData()` handlers that redirect with errors in the URL query string —
  not `fetch`/JSON.
- No non-trivial interactive UI: existing forms
  (`src/components/auth/SignInForm.tsx`) use plain `useState` + hand-rolled
  regex validation, no Zod, no react-hook-form.
- No dynamic routing: `src/pages/**` contains zero bracket-named files.
- Minimal UI kit: `src/components/ui/` has only `button.tsx`; no
  Select/Combobox/Popover/Command/Input/Label/Table installed yet.
- Auth itself is fully working and needs no new code: `src/lib/supabase.ts`,
  `src/middleware.ts`, and the auth pages already satisfy FR-011.
- The app is already deployed to production
  (`https://trainspotter.cloudflare-anemia242.workers.dev`, see
  `context/deployment/deploy-plan.md`), so this plan's migration must reach
  the live Supabase project, not just the local stack.

## Desired End State

A logged-in Member can visit a "record a sighting" page, search for or
create a rolling-stock type and a station inline, submit a sighting with a
timestamp, and land on that station's page seeing the sighting listed. A
signed-out visitor can view any station's page and see its recorded
sightings without logging in.

Verification: follow the Manual Testing Steps below end-to-end against both
local (`npx supabase start` + `npm run dev`) and, for the schema migration
only, the production Supabase project.

### Key Discoveries:

- `src/lib/supabase.ts:5` — single `createClient(requestHeaders, cookies)`
  factory (no separate browser client); returns `null` when env vars are
  unset. New API routes call this exact factory the same way the auth
  routes do, so RLS's `auth.uid()` resolves from the request's own cookies.
- `src/middleware.ts:4,18-21` — `PROTECTED_ROUTES` array matched via
  `.startsWith()`; adding `/sightings/new` here is the existing, idiomatic
  way to gate the new page, rather than an ad hoc per-page check.
- `src/env.d.ts:1-5` — `App.Locals.user: User | null` is already typed and
  populated by middleware on every request.
- `src/components/Topbar.astro` reads `Astro.locals.user` itself but is
  never imported by any page today — dead code. This plan mounts it in
  `src/layouts/Layout.astro` (confirmed by the user as in-scope).
- `components.json` — shadcn "new-york" style, aliases `@/components/ui`,
  `@/lib`, etc.; new primitives are added via `npx shadcn@latest add [name]`.
- `supabase/config.toml`: `db.migrations.enabled = true`,
  `schema_paths = []` — confirms plain SQL files under
  `supabase/migrations/` is the intended mechanism, not declarative schema.
  `db.seed.sql_paths = ["./seed.sql"]` references a file that doesn't exist;
  out of scope here since the flow is self-seeding via inline-create.
- No date/time library in `package.json` — a native
  `<input type="datetime-local">` is used instead of adding one.
- `eslint.config.js` uses `strictTypeChecked`/`stylisticTypeChecked` (no
  implicit `any`), `no-misused-promises` with `checksVoidReturn.attributes:
  false` (async `onClick` handlers are fine), and the `react-compiler` plugin
  is enforced — new components must stay compiler-friendly.

## What We're NOT Doing

- FR-002's approval-queue gate for new rolling-stock types — deferred to
  S-07 per the roadmap's explicit sequencing decision; types/stations
  created here are immediately usable, not pending.
- Editing existing types/stations (FR-003/FR-006 — S-03/S-05).
- Rating sighting correctness (FR-009 — S-08) and the prediction feature
  (FR-010 — S-09).
- Standalone "browse types"/"browse stations" pages (FR-001/FR-004 —
  S-02/S-04); the combobox's search is not a substitute for those.
- A system-wide "browse all sightings" page (FR-008's full scope — S-06);
  this plan only delivers the station-scoped occurrence history US-01's
  acceptance criteria require.
- Admin/moderation and search (FR-012/FR-013 — Parked in the roadmap).
- Any UPDATE/DELETE policies or UI for types, stations, or sightings.
- Adding a test runner — verification for this slice is manual only.

## Implementation Approach

Four phases, each independently shippable: (1) the domain schema + RLS,
(2) JSON API routes for search/create, (3) the sighting-recording UI, and
(4) the station occurrence-history page. Phase 1 uses plain SQL migrations
applied to both local and production Supabase. Phases 2-4 introduce Zod as
the shared client/server validation layer and a small reusable
searchable-combobox-with-inline-create component, since the app has no
precedent for either yet.

## Critical Implementation Details

### Timing & lifecycle: inline-create happens before final submit, not at it

When a Member types a name with no match in the combobox and picks
"Create '<query>'", that POST fires immediately and the newly created row's
id becomes the combobox's selected value right away — creation is not
deferred to the form's final submit. This means by the time the "Record
sighting" button is pressed, `rollingStockTypeId` and `stationId` are
already concrete, pre-existing UUIDs (either freshly created or
pre-existing), and the final `POST /api/sightings` call only ever
references rows that already exist. If that final call fails (network
error, etc.), the type/station rows already exist — the user simply
resubmits the same form without recreating anything. This is the
"self-healing on retry" behavior agreed with the user; no cross-table
transaction or rollback logic is needed anywhere in this plan.

### User experience spec: when the combobox offers "Create new"

The "Create '<query>'" option only appears when no existing row
case-insensitively matches the typed query exactly (not "no results at
all" — a near-miss substring match should still surface the existing row
as a pickable option, since the goal is steering users away from creating
near-duplicates, per the unique-index decision). Search queries are
debounced (~300ms) against `GET /api/rolling-stock-types?q=` /
`GET /api/stations?q=`, case-insensitive substring match, capped at 20
results, ordered by name.

## Phase 1: Core domain schema & RLS

### Overview

Creates `rolling_stock_types`, `stations`, and `sightings` with public-read /
member-insert-only Row Level Security, and case-insensitive unique
constraints on type/station names.

### Changes Required:

#### 1. Domain schema migration

**File**: `supabase/migrations/<timestamp>_domain_schema.sql`

**Intent**: Create the three tables this slice needs, nothing more (no
ratings or moderation columns — those land with S-08/S-07). Public can
`SELECT` from all three; only authenticated users can `INSERT`; no
`UPDATE`/`DELETE` policy exists for anyone in this slice (RLS enabled with
no policy = denied by default).

**Contract**:
- `rolling_stock_types(id uuid pk default gen_random_uuid(), name text not null, created_by uuid not null references auth.users(id), created_at timestamptz not null default now())`, unique index on `lower(name)`.
- `stations(id uuid pk default gen_random_uuid(), name text not null, created_by uuid not null references auth.users(id), created_at timestamptz not null default now())`, unique index on `lower(name)`.
- `sightings(id uuid pk default gen_random_uuid(), rolling_stock_type_id uuid not null references rolling_stock_types(id), station_id uuid not null references stations(id), occurred_at timestamptz not null, reported_at timestamptz not null default now(), created_by uuid not null references auth.users(id))`, index on `station_id`, index on `rolling_stock_type_id`.
- `occurred_at` is the user-entered "when I saw it" (FR-007's timestamp, defaults to now client-side, editable); `reported_at` is the server-stamped submission time, not user-editable.
- RLS: enable on all three tables. `SELECT` policy `using (true)` for `anon, authenticated`. `INSERT` policy for `authenticated` only, `with check (auth.uid() = created_by)` — `created_by` is set server-side from the authenticated request, never client-supplied.

### Success Criteria:

#### Automated Verification:

- Local Supabase stack starts: `npx supabase start`
- Migration applies cleanly from scratch: `npx supabase db reset`

#### Manual Verification:

- In Supabase Studio (`http://localhost:54323`), confirm RLS is enabled on
  all three tables and the expected `SELECT`/`INSERT` policies are present
- Confirm an anonymous insert attempt is rejected and an authenticated
  insert (with matching `created_by`) succeeds
- Apply the migration to the production Supabase project (`trainspotter`,
  see `context/deployment/deploy-plan.md`) via `supabase db push` or the
  dashboard SQL editor, before or alongside deploying this change's app code

---

## Phase 2: Sighting-domain API routes

### Overview

JSON search/create endpoints for rolling-stock types and stations, and a
create endpoint for sightings — the app's first JSON (not form-POST) API
routes, validated with Zod and gated on authentication for all writes.

### Changes Required:

#### 1. Shared Zod schemas

**File**: `src/lib/schemas/rolling-stock-type.ts`, `src/lib/schemas/station.ts`, `src/lib/schemas/sighting.ts`

**Intent**: One schema per entity, imported by both the API routes (server-side validation) and the form island (client-side validation before submit) — a single source of truth for field constraints.

**Contract**: `rollingStockTypeCreateSchema = z.object({ name: z.string().trim().min(1).max(120) })`; `stationCreateSchema` mirrors it with `max(160)`; `sightingCreateSchema = z.object({ rollingStockTypeId: z.string().uuid(), stationId: z.string().uuid(), occurredAt: z.string().datetime() })`.

#### 2. Type & station search/create routes

**File**: `src/pages/api/rolling-stock-types/index.ts`, `src/pages/api/stations/index.ts`

**Intent**: `GET` supports the combobox's search-as-you-type (public, no auth required, matching the public-read RLS policy); `POST` supports inline-create (auth required).

**Contract**: `GET ?q=<string>` → `200 { items: [{ id, name }] }`, case-insensitive substring match, limit 20, ordered by name. `POST { name }` → `201 { id, name }` on success; `401` if `context.locals.user` is null; `400 { error }` on Zod validation failure; `409 { error }` on unique-constraint violation (duplicate name). The Supabase client for each request is created via `createClient(context.request.headers, context.cookies)` (same factory the auth routes use) so RLS's `auth.uid()` resolves from the request's own session.

#### 3. Sighting create route

**File**: `src/pages/api/sightings/index.ts`

**Intent**: Creates a sighting referencing an already-resolved type id and station id (see Critical Implementation Details — inline-create already happened before this call fires).

**Contract**: `POST { rollingStockTypeId, stationId, occurredAt }` → `201 { id }`; `401` unauthenticated; `400 { error }` on Zod validation failure; `404 { error }` if the referenced type or station id doesn't exist (map the FK violation).

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Build succeeds (includes Astro's typecheck): `npm run build`

#### Manual Verification:

- Unauthenticated `POST /api/sightings` returns `401`
- Authenticated `GET /api/rolling-stock-types?q=<partial>` returns the
  expected filtered, case-insensitive results
- Authenticated `POST /api/rolling-stock-types` with a new name returns
  `201`; the same name again (any case) returns `409`

---

## Phase 3: Sighting-recording UI

### Overview

A reusable searchable-combobox-with-inline-create component, the
`/sightings/new` page and its form island, and wiring `Topbar` into the
shared layout so the new page is reachable from anywhere.

### Changes Required:

#### 1. Install missing shadcn primitives

**File**: N/A (CLI step)

**Intent**: The combobox pattern needs Popover + Command (shadcn's standard combobox recipe); the form needs Input and Label.

**Contract**: `npx shadcn@latest add popover command input label` — installs into `src/components/ui/` per `components.json`'s existing aliases; also pulls in `cmdk` as a new dependency.

#### 2. Reusable creatable combobox

**File**: `src/components/sightings/CreatableCombobox.tsx`

**Intent**: One component, parameterized by search endpoint, create endpoint, and an `onSelect(id, name)` callback — used twice (once for types, once for stations) rather than writing two near-identical components.

**Contract**: Props: `{ searchEndpoint: string; createEndpoint: string; label: string; onSelect: (id: string, name: string) => void }`. Internally: debounced `fetch` to `searchEndpoint`, renders results plus a conditional "Create '<query>'" item per the UX spec above, `fetch` to `createEndpoint` on that item's selection.

#### 3. Record-sighting form island

**File**: `src/components/sightings/RecordSightingForm.tsx`

**Intent**: Hosts two `CreatableCombobox` instances (type, station) plus a `datetime-local` input defaulting to now, validates with `sightingCreateSchema` before submit, `POST`s to `/api/sightings`, and on success navigates to the resulting station's page.

**Contract**: Plain `useState` for form state (matches `SignInForm.tsx`'s existing style — no react-hook-form introduced), following the same controlled-input pattern as `FormField.tsx`. Submit disabled until both combobox ids are resolved and the datetime value passes `sightingCreateSchema`.

#### 4. New page, route protection, nav

**File**: `src/pages/sightings/new.astro`, `src/middleware.ts`, `src/layouts/Layout.astro`, `src/pages/dashboard.astro`

**Intent**: `new.astro` renders `<RecordSightingForm client:load />` inside `Layout`. Add `/sightings/new` to `PROTECTED_ROUTES` in `middleware.ts` (same mechanism already protecting `/dashboard`). Mount `<Topbar />` in `Layout.astro` (currently unused) so the page is reachable from any screen. Add a link to `/sightings/new` from the existing card in `dashboard.astro`.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Build succeeds: `npm run build`

#### Manual Verification:

- Visiting `/sightings/new` while signed out redirects to `/auth/signin`
- Signed in: typing in either combobox filters existing rows; typing a
  wholly new name surfaces "Create '<query>'"
- Full happy path: pick or create a type, pick or create a station, submit
  with the default timestamp → success, browser lands on the new station's
  page
- `Topbar` is now visible on every page with a working link to the new form

---

## Phase 4: Station occurrence-history page

### Overview

A new, public, server-rendered dynamic route showing a station's recorded
sightings — the app's first bracket route.

### Changes Required:

#### 1. Station detail page

**File**: `src/pages/stations/[id].astro`

**Intent**: Server-rendered, no auth required (matches the public-read RLS policy). Reads `Astro.params.id`, queries the station row and its sightings (joined with `rolling_stock_types` for the type name), renders the station name as a heading and the sightings as a table (type name, `occurred_at` formatted via `Intl.DateTimeFormat`). `reported_at` and `created_by` are not displayed (the latter per the NFR that a member's email is never publicly shown alongside their contributions).

**Contract**: If no station matches `Astro.params.id`, return `new Response(null, { status: 404 })` from the frontmatter rather than rendering an empty page.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Build succeeds: `npm run build`

#### Manual Verification:

- Visiting `/stations/<real-id>` while signed out shows the station's
  sightings list (confirms public read works without a session)
- The sighting recorded during Phase 3's manual test appears in the list
  with the correct rolling-stock type name and timestamp
- Visiting `/stations/<a-uuid-that-does-not-exist>` returns a 404 /
  not-found state rather than an empty page

**Implementation Note**: After this phase's automated verification passes,
pause for manual confirmation before considering the change complete — this
phase's manual steps are also the end-to-end proof that S-01 works.

---

## Testing Strategy

### Unit Tests:

None — no test runner is configured in this repo (per `CLAUDE.md`), and the
user confirmed manual verification only for this slice; adding a runner is
its own future decision, not a rider on this plan.

### Integration Tests:

None, for the same reason.

### Manual Testing Steps:

1. `npx supabase start`, apply the Phase 1 migration, `npm run dev`.
2. Sign up/sign in as a test Member (existing auth flow, no changes needed).
3. Visit `/sightings/new`; confirm the page is reachable via the now-mounted
   `Topbar` link and via the dashboard card.
4. Create a brand-new rolling-stock type and a brand-new station inline via
   the comboboxes; submit with the default (now) timestamp.
5. Confirm the browser lands on the new station's page and the sighting is
   listed with the correct type name and timestamp.
6. Open the same `/sightings/new` flow again and confirm the type/station
   just created now appear as searchable existing results (not offered as
   "Create new" again) — proves the unique-index + search path both work.
7. Sign out; revisit the station page from step 5 and confirm it still
   renders (public read) and `/sightings/new` now redirects to sign-in.
8. Attempt to create a second type/station with the same name in a
   different case; confirm the API returns `409` and the UI surfaces a
   clear error instead of silently failing.

## Performance Considerations

None beyond what's already covered — MVP scale (roadmap: `target_scale.qps:
low`), no caching or pagination needed at this data volume.

## Migration Notes

This is the first schema migration in the project — there is no existing
production data to migrate. The production Supabase project (`trainspotter`)
is already live and serving the deployed app
(`context/deployment/deploy-plan.md`), so the migration must be applied
there (Phase 1's manual verification) before or alongside deploying this
change's application code, or the live site will error on the missing
tables the new API routes and pages depend on.

## References

- Roadmap: `context/foundation/roadmap.md` (`### F-01: Core domain schema`,
  `### S-01: Record a sighting`)
- PRD: `context/foundation/prd.md` (US-01, FR-005, FR-007, FR-011)
- Closest existing implementation pattern (auth routes, diverges into JSON
  for this plan): `src/pages/api/auth/signin.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Core domain schema & RLS

#### Automated

- [x] 1.1 Local Supabase stack starts: `npx supabase start` — d82c1a3
- [x] 1.2 Migration applies cleanly from scratch: `npx supabase db reset` — d82c1a3

#### Manual

- [x] 1.3 RLS enabled and expected SELECT/INSERT policies present on all three tables — d82c1a3
- [x] 1.4 Anonymous insert rejected; authenticated insert with matching created_by succeeds — d82c1a3
- [x] 1.5 Migration applied to the production Supabase project before/alongside app deploy — d82c1a3

### Phase 2: Sighting-domain API routes

#### Automated

- [x] 2.1 Lint passes: `npm run lint`
- [x] 2.2 Build succeeds: `npm run build`

#### Manual

- [x] 2.3 Unauthenticated POST /api/sightings returns 401
- [x] 2.4 Authenticated GET search returns expected case-insensitive filtered results
- [x] 2.5 Authenticated POST create returns 201; duplicate name (any case) returns 409

### Phase 3: Sighting-recording UI

#### Automated

- [ ] 3.1 Lint passes: `npm run lint`
- [ ] 3.2 Build succeeds: `npm run build`

#### Manual

- [ ] 3.3 Visiting /sightings/new while signed out redirects to /auth/signin
- [ ] 3.4 Combobox search filters existing rows; new name surfaces "Create '<query>'"
- [ ] 3.5 Full happy path: create/pick type + station, submit, lands on station page
- [ ] 3.6 Topbar visible on every page with a working link to the new form

### Phase 4: Station occurrence-history page

#### Automated

- [ ] 4.1 Lint passes: `npm run lint`
- [ ] 4.2 Build succeeds: `npm run build`

#### Manual

- [ ] 4.3 Visiting /stations/<real-id> while signed out shows the sightings list
- [ ] 4.4 Phase 3's recorded sighting appears with correct type name and timestamp
- [ ] 4.5 Visiting /stations/<nonexistent-id> returns a 404 / not-found state
