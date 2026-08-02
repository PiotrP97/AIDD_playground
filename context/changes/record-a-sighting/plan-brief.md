# Record a Sighting — Plan Brief

> Full plan: `context/changes/record-a-sighting/plan.md`

## What & Why

TrainSpotter's roadmap north star (S-01, `context/foundation/roadmap.md`): a
logged-in Member can log in, pick or inline-create a rolling-stock type and a
station, and record a sighting with a timestamp. Without this working
data-collection loop, there's no data for the product's actual bet — crowdsourced
sighting history predicting where a rolling-stock type will reappear — to run on.

## Starting Point

The repo is the unmodified `10x-astro-starter` scaffold with a fully working
auth layer (Supabase, route protection, sign-in/up/out) and nothing else — no
domain schema, no JSON API, no non-trivial interactive UI, no dynamic routes.
F-01 (core domain schema) was never planned or built as its own change.

## Desired End State

A Member can visit a page, search or create a rolling-stock type and station via a
combobox, submit a sighting, and land on that station's page seeing it listed. Any
signed-out visitor can view a station's page and its sightings without logging in.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| F-01 scope | Fold into this plan (Phase 1) | F-01 was never planned separately; one plan matches the roadmap's time-constrained framing | Plan |
| Server architecture | Client-side fetch/JSON | Only way to support a live-searchable inline-create combobox; sets the app's first JSON API convention | Plan |
| Picker UX | Searchable combobox + inline "+ Add new" | Satisfies US-01's acceptance criteria in one control | Plan |
| Validation | Introduce Zod | First multi-field form with real constraints; hand-rolled validation doesn't scale | Plan |
| Timestamp | Both: user-editable `occurred_at` + auto `reported_at` | FR-007 needs a user-provided sighting time; server audit trail is free to add | Plan |
| Duplicate names | Case-insensitive unique constraint | Nearly free, directly protects the PRD's data-quality guardrail | Plan |
| RLS write scope | INSERT only, no UPDATE/DELETE | Matches this slice's scope; editing is S-03/S-05's job | Plan |
| Primary keys | UUID | Supabase/Postgres default; avoids leaking row counts in public URLs | Plan |
| Nav entry point | New page + mount the (currently dead) Topbar | Fixes a real scaffold gap as a side effect | Plan |
| Testing | Manual verification only | No test runner exists yet; adding one is a separate future decision | Plan |
| Partial-failure handling | Sequential calls, self-healing on retry | Simplest; a failed final insert leaves a harmless, reusable type/station row | Plan |

## Scope

**In scope:** domain schema + RLS (types, stations, sightings), JSON search/create
API routes, a reusable creatable-combobox component, the sighting-recording form
page, and the station occurrence-history page.

**Out of scope:** FR-002's approval gate (S-07), editing types/stations (S-03/S-05),
ratings (S-08), predictions (S-09), standalone browse pages (S-02/S-04/S-06),
moderation/search (Parked), any test runner.

## Architecture / Approach

Astro SSR pages stay server-rendered where read-only (the station page queries
Supabase directly, no API needed). The one interactive piece — the sighting form —
is a React island (`client:load`) talking to three new JSON API routes
(`/api/rolling-stock-types`, `/api/stations`, `/api/sightings`) via `fetch`,
validated on both ends by shared Zod schemas in `src/lib/schemas/`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Core domain schema & RLS | Tables + policies, local and production | Must reach the *already-live* production Supabase project before/with app deploy |
| 2. Sighting-domain API routes | Search/create JSON endpoints | First JSON API in the app — sets the convention for later slices |
| 3. Sighting-recording UI | Combobox + form + nav wiring | First non-trivial interactive component in the app |
| 4. Station occurrence-history page | Public dynamic route | First dynamic route (`[id].astro`) in the app |

**Prerequisites:** Docker running (for local Supabase), access to the production
Supabase project's SQL editor or CLI credentials for the migration push.
**Estimated effort:** not sized — this plan does not carry time estimates.

## Open Risks & Assumptions

- The combobox's "no near-duplicate exists" heuristic is a UX nudge, not a hard
  guarantee — the DB-level unique index is the actual data-quality backstop.
- Applying Phase 1's migration to production is a manual, one-time step this plan
  can't automate from a non-interactive shell (same class of gap noted for the
  original Cloudflare deploy in `context/deployment/deploy-plan.md`).

## Success Criteria (Summary)

- A Member can complete the full record-a-sighting flow end-to-end, including
  creating brand-new types/stations inline.
- A signed-out visitor can view any station's sighting history without logging in.
- Re-running the flow with the same type/station name surfaces it as an existing
  searchable result instead of creating a duplicate.
