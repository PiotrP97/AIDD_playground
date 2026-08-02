# Browse Recorded Sightings — Plan Brief

> Full plan: `context/changes/browse-sightings/plan.md`

## What & Why

Implements S-06 (FR-008's full scope): a system-wide, public, paginated list of every
recorded sighting — distinct from the station-scoped occurrence history `/stations/[id]`
already delivers. This is the roadmap's next step after S-01 (record-a-sighting), letting
visitors actually see the sighting data the app has started collecting.

## Starting Point

S-01 is implemented and merged: the `sightings`/`rolling_stock_types`/`stations` schema,
public-read RLS, and the exact query/render pattern this page needs already exist and are
proven in `src/pages/stations/[id].astro`. No pagination, list-filtering, or test-runner
infrastructure exists anywhere in the codebase yet.

## Desired End State

Any visitor, signed in or not, can visit `/sightings` and see every recorded sighting
system-wide, newest first, paginated 20 per page, each row showing the rolling-stock type,
a linked station name, and when it was seen. Reachable from the Topbar and the dashboard.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Data volume handling | Full pagination (page param, prev/next) | User's explicit choice — scales properly as sightings accumulate, unlike the app's other unpaginated views |
| Filtering/search | None — flat list only | FR-013 (search) is nice-to-have/Parked; combining it with pagination created a real UX conflict (client-side filter only searches the loaded page), resolved by dropping filtering entirely |
| Nav entry point | Topbar (public) + dashboard link | FR-008 is explicitly public ("logged in or not") — signed-out visitors need a way to find it, not just authenticated ones |
| Empty state | Plain "No sightings recorded yet." | Matches the exact copy already used on a station's own page with zero sightings |
| Testing | Add Vitest, unit-test the pagination logic | User's explicit choice to start test coverage; scoped narrowly to the one piece of genuinely testable logic (page-param parsing/clamping) rather than full page rendering |
| Invalid/out-of-range `page` param | Clamp silently, never error | `page` is a display parameter, not a resource identifier (unlike station `id`, which 404s) |

## Scope

**In scope:** paginated system-wide sightings list, Vitest setup, pagination utility + unit tests, Topbar/dashboard nav links.

**Out of scope:** search/filtering (FR-013, Parked), any change to the station-scoped occurrence history, rating/prediction display (S-08/S-09 not built), broader test coverage beyond this slice's pagination logic.

## Architecture / Approach

A plain server-rendered Astro page (no new API route — prev/next are full-page `<a>`
navigations via a `page` query param, matching the app's existing no-JS-needed pattern for
this kind of view). Pagination math and param parsing/clamping live in a small,
framework-free `src/lib/pagination.ts`, which is what Vitest actually unit-tests — the page
itself stays manually verified, consistent with the rest of the project.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Pagination utility + Vitest setup | Testable page-param logic, project's first test runner | First Vitest setup in this repo — low risk, zero-config expected |
| 2. Sightings list page + nav | The actual `/sightings` page, Topbar + dashboard links | None significant — closely mirrors the proven `stations/[id].astro` pattern |

**Prerequisites:** S-01 implemented and merged (confirmed — schema, RLS, and the reference pattern all exist).
**Estimated effort:** not sized — this plan does not carry time estimates.

## Open Risks & Assumptions

- Manual testing needs 20+ seeded sightings to actually exercise pagination — plan's manual steps call this out explicitly.
- `Astro.response` behavior for `count: "exact"` queries at scale is unverified beyond MVP data volumes; acceptable given `target_scale.qps: low`.

## Success Criteria (Summary)

- Any visitor can browse all recorded sightings, newest first, without signing in.
- Pagination works correctly at both boundaries and clamps out-of-range page numbers instead of erroring.
- The pagination utility's edge cases are covered by passing unit tests.
