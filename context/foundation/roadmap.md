---
project: "TrainSpotter"
version: 1
status: draft
created: 2026-08-02
updated: 2026-08-02
prd_version: 1
main_goal: speed
top_blocker: time
---

# Roadmap: TrainSpotter

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

Rail spotters chasing a specific type of rolling stock currently travel blind — no individual spotter's memory, forum thread, or spreadsheet tells them where a vehicle is likely to reappear. TrainSpotter's bet is that enough hobbyists logging what they see, aggregated, carries real predictive signal that's never been centralized and queried this way before. The product has to first get spotters logging sightings reliably before that signal can exist at all.

## North star

**S-01: User can log in and record a sighting of a rolling-stock type at a station.** — This is the smallest end-to-end slice whose successful delivery would prove the core product hypothesis has a *chance* of working: without a working, trusted sighting-logging loop, there's no data for predictions to run on. It's placed as early as its Prerequisites allow because everything else only matters if this works. The roadmap-generation interview locked this in directly from `shape-notes.md`'s explicit "First MVP flow" — the PRD's only drafted user story (US-01) — rather than asking the question, since no other candidate exists in the artifacts.

> **North star**, used above: the smallest end-to-end user-visible flow that, if shipped first, proves the core hypothesis of the product's Vision. It is sequenced earliest because every other slice's value depends on it existing first.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
| --- | --- | --- | --- | --- | --- |
| F-01 | core-domain-schema | (foundation) rolling-stock types, stations, and sightings have a shared data model with public-read / member-write access rules | — | Access Control, US-01 | ready |
| F-02 | member-admin-roles | (foundation) the system can distinguish a Member from an Admin | — | Access Control | ready |
| S-01 | record-a-sighting | log in, pick-or-add a rolling-stock type and station inline, and record a sighting with a timestamp; it appears immediately on the station's public history | F-01 | US-01, FR-005, FR-007, FR-011 (baseline) | proposed |
| S-02 | browse-rolling-stock-types | browse the catalog of rolling-stock types | F-01 | FR-001 | proposed |
| S-04 | browse-stations | browse the catalog of stations/stops | F-01 | FR-004 | proposed |
| S-03 | edit-rolling-stock-type | edit an existing rolling-stock type | S-02 | FR-003 | proposed |
| S-05 | edit-station | edit an existing station/stop | S-04 | FR-006 | proposed |
| S-06 | browse-sightings | browse recorded sightings across the system | S-01 | FR-008 | proposed |
| S-07 | rolling-stock-type-approval-queue | (Admin) approve or reject newly submitted rolling-stock types before they become usable/visible | S-01, F-02 | FR-002 | proposed |
| S-08 | rate-sighting-correctness | rate the correctness of a recorded sighting | S-01 | FR-009 | proposed |
| S-09 | predict-likely-locations | view predicted likely locations for a rolling-stock type, weighted by correctness ratings, with an explicit "not enough data yet" state below a threshold | S-01, S-08 | FR-010 | blocked |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
| --- | --- | --- | --- |
| A | Sighting core loop | `F-01` → `S-01` → `S-06` / `S-08` → `S-09` | The north star and everything that depends on real sighting data existing — sequenced tightest given the `time` blocker. |
| B | Catalog management | `F-01` → `S-02` → `S-03` / `F-01` → `S-04` → `S-05` | Browse-then-edit for types and stations; both branches only need F-01, so S-02/S-04 (and later S-03/S-05) run in parallel. |
| C | Roles & moderation | `F-02` → `S-07` | Joins Stream A at `S-01` — the approval-queue action needs both the role model and a working type-adding mechanic to gate. |

## Baseline

What's already in place in the codebase as of `2026-08-02` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — Astro 6 SSR + React 19 islands, Tailwind 4, shadcn/ui scaffold (`src/pages/`, `src/components/ui/`). No domain UI yet.
- **Backend / API:** absent — only auth API routes exist (`src/pages/api/auth/*`); no rolling-stock/station/sighting/rating endpoints.
- **Data:** absent — Supabase Postgres is the target, but `supabase/` has only `config.toml`; no migrations, no domain schema/tables.
- **Auth:** present — full scaffold wired (`src/lib/supabase.ts`, `src/middleware.ts`, signin/signup/signout pages, session handling). FR-011 (register/log in) is already satisfied by this baseline — no new work needed. Not yet wired: any Member/Admin role distinction.
- **Deploy / infra:** present — deployed and verified to Cloudflare Workers 2026-08-01 (`context/deployment/deploy-plan.md`): live URL, secrets provisioned, auth path verified end-to-end. CI auto-deploy explicitly deferred (manual `wrangler deploy` only).
- **Observability:** absent — no logging/error-tracking/metrics library in `package.json`. Not required by any PRD NFR at MVP scale.

## Foundations

### F-01: Core domain schema

- **Outcome:** (foundation) rolling-stock types, stations, and sightings exist as a shared data model, with public-read / member-write access rules enforced. Scoped to exactly these three entities — no ratings or moderation data model yet; those are introduced by the slices that first need them (S-08, S-07).
- **Change ID:** core-domain-schema
- **PRD refs:** Access Control (public read / member write), US-01 (needs all three entities to exist together)
- **Unlocks:** S-01, S-02, S-04, S-06 — every slice that reads or writes a type, a station, or a sighting depends on this existing first.
- **Prerequisites:** —
- **Parallel with:** F-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Every vertical slice needs at least one domain table to exist; building this first (before any UI) keeps each downstream slice genuinely vertical instead of mixing schema work into whichever slice happens to need it first.
- **Status:** ready

### F-02: Member/Admin role model

- **Outcome:** (foundation) the system can distinguish a Member from an Admin on an authenticated user, with a minimal guard usable by admin-only actions. Extends the existing auth baseline; does not touch sign-in/sign-up/session handling, which already work.
- **Change ID:** member-admin-roles
- **PRD refs:** Access Control (Member vs. Admin roles)
- **Unlocks:** S-07 — the approval-queue action needs to identify who's allowed to approve.
- **Prerequisites:** —
- **Parallel with:** F-01
- **Blockers:** —
- **Unknowns:**
  - How is the very first Admin account created or promoted, given there's no self-service admin signup? — Owner: user. Block: no.
- **Risk:** Only S-07's approval action needs a Member/Admin distinction; building the role model here (not earlier, not folded into F-01) keeps S-01 free of role logic it doesn't need, at the cost of a second small data-model change landing close to when S-07 starts.
- **Status:** ready

## Slices

### S-01: Record a sighting

- **Outcome:** user can log in, pick or add a rolling-stock type and station inline, and record a sighting with a timestamp; the sighting appears immediately on the station's public occurrence history.
- **Change ID:** record-a-sighting
- **PRD refs:** US-01, FR-005, FR-007, FR-011 (baseline-satisfied)
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - This slice ships new types/stations as immediately usable (no approval gate); FR-002's approval-queue restriction is only added later, in S-07. Is that shipping order acceptable? — Owner: user. Block: no.
- **Risk:** Smallest end-to-end loop that proves the data-collection mechanic works. Deliberately ships type/station creation without FR-002's approval gate so the north star isn't blocked on F-02 — the gate is layered on top in S-07 instead.
- **Status:** proposed

### S-02: Browse rolling-stock types

- **Outcome:** user can browse the catalog of rolling-stock types.
- **Change ID:** browse-rolling-stock-types
- **PRD refs:** FR-001
- **Prerequisites:** F-01
- **Parallel with:** S-04
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Read-only, depends on nothing beyond the schema; safe to build alongside S-04 since neither touches the other's data.
- **Status:** proposed

### S-04: Browse stations

- **Outcome:** user can browse the catalog of stations/stops.
- **Change ID:** browse-stations
- **PRD refs:** FR-004
- **Prerequisites:** F-01
- **Parallel with:** S-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Mirrors S-02's shape for stations; parallel-safe for the same reason.
- **Status:** proposed

### S-03: Edit rolling-stock type

- **Outcome:** user can edit an existing rolling-stock type.
- **Change ID:** edit-rolling-stock-type
- **PRD refs:** FR-003
- **Prerequisites:** S-02
- **Parallel with:** S-05
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Editing needs a place to find the type to edit, so it follows the browse slice rather than preceding it.
- **Status:** proposed

### S-05: Edit station

- **Outcome:** user can edit an existing station/stop.
- **Change ID:** edit-station
- **PRD refs:** FR-006
- **Prerequisites:** S-04
- **Parallel with:** S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Editing needs a place to find the station to edit, so it follows S-04.
- **Status:** proposed

### S-06: Browse sightings

- **Outcome:** visitor (logged in or not) can browse recorded sightings across the system.
- **Change ID:** browse-sightings
- **PRD refs:** FR-008
- **Prerequisites:** S-01
- **Parallel with:** S-07, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Needs real sighting rows to browse, so it can't precede S-01; otherwise independent of the catalog-management slices.
- **Status:** proposed

### S-07: Rolling-stock-type approval queue

- **Outcome:** a newly submitted rolling-stock type enters a pending-approval queue and is not usable/visible until an Admin approves it.
- **Change ID:** rolling-stock-type-approval-queue
- **PRD refs:** FR-002
- **Prerequisites:** S-01, F-02
- **Parallel with:** S-06, S-08
- **Blockers:** —
- **Unknowns:**
  - Should Admin moderation (FR-012, currently nice-to-have) be promoted to must-have, given this slice already makes FR-002 partially dependent on an Admin doing the approving? — Owner: user. Block: no.
- **Risk:** Approval gating requires knowing who's an Admin, so it waits on F-02; sequenced after the north star since permissive type-adding is acceptable for the first working loop (see S-01's Unknown).
- **Status:** proposed

### S-08: Rate sighting correctness

- **Outcome:** user can rate the correctness of a recorded sighting.
- **Change ID:** rate-sighting-correctness
- **PRD refs:** FR-009
- **Prerequisites:** S-01
- **Parallel with:** S-06, S-07
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Needs sightings to exist as rating targets; otherwise self-contained.
- **Status:** proposed

### S-09: Predict likely locations

- **Outcome:** user can view predicted likely locations for a given rolling-stock type, weighted by how members have rated the correctness of underlying sightings; below a minimum data threshold, the system shows an explicit "not enough data yet" state instead.
- **Change ID:** predict-likely-locations
- **PRD refs:** FR-010
- **Prerequisites:** S-01, S-08
- **Parallel with:** S-06, S-07
- **Blockers:** —
- **Unknowns:**
  - What is the minimum sighting/station volume threshold below which the prediction shows "not enough data yet" instead of a result? No fixed number exists yet; real usage data from S-01–S-08 may be needed to calibrate it. — Owner: user. Block: yes.
- **Risk:** This is the slice the PRD's Primary Success Criterion is actually about ("over 70% of ratings consider predictions plausible"), and the last one to land — it needs real sightings and a working ratings mechanism to weight against, so it can't move earlier without gutting its own accuracy.
- **Status:** blocked

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
| --- | --- | --- | --- | --- |
| F-01 | core-domain-schema | [Build core domain schema (types, stations, sightings)](https://github.com/PiotrP97/AIDD_playground/issues/3) | yes | Run `/10x-plan core-domain-schema` |
| F-02 | member-admin-roles | [Add Member/Admin role distinction](https://github.com/PiotrP97/AIDD_playground/issues/4) | yes | Run `/10x-plan member-admin-roles` |
| S-01 | record-a-sighting | [Record a rolling-stock sighting at a station](https://github.com/PiotrP97/AIDD_playground/issues/5) | no | Blocked on F-01 |
| S-02 | browse-rolling-stock-types | [Browse rolling-stock types](https://github.com/PiotrP97/AIDD_playground/issues/6) | no | Blocked on F-01 |
| S-04 | browse-stations | [Browse stations/stops](https://github.com/PiotrP97/AIDD_playground/issues/7) | no | Blocked on F-01 |
| S-03 | edit-rolling-stock-type | [Edit a rolling-stock type](https://github.com/PiotrP97/AIDD_playground/issues/8) | no | Blocked on S-02 |
| S-05 | edit-station | [Edit a station/stop](https://github.com/PiotrP97/AIDD_playground/issues/9) | no | Blocked on S-04 |
| S-06 | browse-sightings | [Browse recorded sightings](https://github.com/PiotrP97/AIDD_playground/issues/10) | no | Blocked on S-01 |
| S-07 | rolling-stock-type-approval-queue | [Admin approval queue for new rolling-stock types](https://github.com/PiotrP97/AIDD_playground/issues/11) | no | Blocked on S-01, F-02 |
| S-08 | rate-sighting-correctness | [Rate the correctness of a sighting](https://github.com/PiotrP97/AIDD_playground/issues/12) | no | Blocked on S-01 |
| S-09 | predict-likely-locations | [Predict likely locations for a rolling-stock type](https://github.com/PiotrP97/AIDD_playground/issues/13) | no | Blocked on S-01, S-08; Open Roadmap Question #1 |

## Open Roadmap Questions

1. **What is the minimum sighting/station volume threshold below which the prediction shows "not enough data yet" instead of a result (FR-010)?** — Owner: user. Block: S-09.
2. **Should Admin moderation (FR-012) be promoted from nice-to-have to must-have?** — FR-002's approval queue already depends on an Admin doing the approving, so moderation capability is partially load-bearing even at its current nice-to-have priority. Owner: user. Block: S-07 (partially — a minimal approve/reject action is already scoped into S-07 regardless of this answer; this only affects whether full moderate/delete becomes must-have).
3. **Is it acceptable that newly-added rolling-stock types are immediately usable once S-01 ships, with FR-002's approval-queue restriction only taking effect once S-07 ships?** — Surfaced during roadmap sequencing, not in the original PRD. Owner: user. Block: roadmap-wide (affects S-01 and S-07 scope/sequencing).

## Parked

- **FR-012 full scope (Admin moderate/delete of arbitrary entries)** — Why parked: nice-to-have priority; `main_goal: speed` defers non-essentials rather than sequencing them late. The load-bearing sliver (approve/reject a pending rolling-stock type) is already covered by S-07.
- **FR-013 (search rolling-stock types and sighting locations)** — Why parked: nice-to-have priority; PRD's own resolution notes the small MVP dataset makes this acceptable to defer.
- **CI auto-deploy wiring** — Why parked: explicit decision already made in `context/deployment/deploy-plan.md` (manual `wrangler deploy` proven first); not urgent given `top_blocker: time`.
- **Observability tooling (logging/error-tracking/metrics)** — Why parked: no PRD NFR gates launch on it at MVP scale; consistent with the "go simple" investment stance derived from `main_goal: speed`.
- **User ranking/gamification** — Why parked: PRD Non-Goal; keeps the product focused on data quality, not competition.
- **Map-based sighting display** — Why parked: PRD Non-Goal; avoids mapping-integration cost before the core prediction loop is proven.
- **Social media sharing** — Why parked: PRD Non-Goal; not a discovery/social feed for v1.
- **Wikipedia linking for rolling-stock types** — Why parked: PRD Non-Goal; avoids dependency on an external content source.
- **Native mobile/desktop app** — Why parked: PRD Non-Goal, implicit via `product_type: web-app`.

## Done

