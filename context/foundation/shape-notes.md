---
project: "TrainSpotter"
context_type: greenfield
created: 2026-07-28
updated: 2026-07-28
product_type: web-app
target_scale:
  users: medium
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "pain category"
      decision: "decision paralysis — spotter has too little signal to decide where to go"
    - topic: "insight"
      decision: "crowdsourced sighting history has real predictive value; never aggregated/queried this way before"
    - topic: "primary persona scope"
      decision: "hobbyist rail spotters, broad public, open registration — not a narrow niche or private group"
    - topic: "auth strategy"
      decision: "login required (email/password or OAuth) — ratings/edits must be traceable to deter abuse"
    - topic: "role model"
      decision: "admin + member roles — admins can moderate/delete bad entries, members add/edit/rate"
    - topic: "read access"
      decision: "public read (browse without login), login required to write (add/edit/rate)"
    - topic: "first MVP flow scope"
      decision: "logging a sighting (login → pick/add rolling-stock type → pick/add station → record occurrence with timestamp) — does NOT need to show a live prediction; ratings are a separate MVP feature, not part of the first flow"
    - topic: "timeline"
      decision: "3 weeks after-hours work — user confirmed the scoped-down first flow fits"
    - topic: "product framing"
      decision: "web-app, medium user scale (dozens to ~100), no hard deadline, after-hours work"
  frs_drafted: 13
  quality_check_status: accepted
---

## Vision & Problem Statement

Rail spotters who want to see or photograph a specific type of rolling stock cannot predict where or when it will appear. Rolling stock is operated by many carriers across national rail routes, so a spotter targeting a particular vehicle type today has to plan trips blind — traveling to a station or stop with no real basis for believing the vehicle will be there, and often wasting the trip.

Enough hobbyist spotters independently log what they see at stations that, aggregated, this sighting history carries real predictive signal about where a given rolling-stock type is likely to reappear — a pattern that no individual spotter's memory, forum thread, or spreadsheet captures today, because the data has never been centralized and queried this way.

## User & Persona

**Primary persona**: Hobbyist rail spotters — individual rail enthusiasts across the general public, not affiliated with any organization or narrow regional group. Open registration; anyone interested in tracking rolling-stock appearances can join. They reach for this product when planning a spotting trip and wanting to know where a specific rolling-stock type is most likely to show up, and when logging what they've seen after a trip.

## Success Criteria

### Primary
- Over 70% of user ratings consider the system's rolling-stock location predictions plausible.

### Secondary
- A sufficient volume of sightings/stations is collected for predictions to be meaningful — no fixed number set yet; a threshold can be defined once real usage data exists (see Open Questions).

### Guardrails
- Data quality/trust: incorrect or spammy sighting entries must not silently degrade prediction quality or erode spotters' trust in the rating system.

### First MVP flow (smallest end-to-end proof)
1. User logs in.
2. User picks a rolling-stock type (or adds a new one if it doesn't exist yet).
3. User picks a station/stop (or adds a new one if it doesn't exist yet).
4. User records the sighting with a timestamp.

This flow does not need to surface a live prediction — predictions only become meaningful once enough historical data accumulates. Rating other users' entries for correctness is a separate MVP capability, not part of this first flow.

## User Stories

### US-01: Member records a rolling-stock sighting at a station

- **Given** a logged-in Member with a rolling-stock type and a station/stop selected (existing or newly added)
- **When** they submit a sighting with a timestamp
- **Then** the sighting is saved and appears in the station's occurrence history, visible to all visitors

#### Acceptance Criteria
- A sighting requires a rolling-stock type, a station/stop, and a timestamp to be saved
- If the type or station doesn't exist yet, the Member can add it inline before submitting
- The saved sighting is visible to all visitors (public read) immediately after submission

## Functional Requirements

### Rolling-stock types
- FR-001: Member can browse rolling-stock types. Priority: must-have
  > Socratic: Counter-argument considered: a dedicated browse page might be redundant if types only ever appear as a picker field. Resolution: kept as written; no counter-argument accepted.
- FR-002: Member can add a new rolling-stock type; the new type enters a pending-approval queue and is not usable/visible until an Admin approves it. Priority: must-have
  > Socratic: Counter-argument considered: open, unmoderated additions risk duplicate types under different names, degrading prediction data. Resolution: modified — new types require Admin approval before becoming usable.
- FR-003: Member can edit an existing rolling-stock type. Priority: must-have
  > Socratic: Counter-argument considered: unrestricted edits without change history risk vandalism or edit wars. Resolution: kept as written; risk accepted for MVP given a small initial community — revisit if abuse occurs.

### Stations & stops
- FR-004: Member can browse stations/stops. Priority: must-have
  > Socratic: Counter-argument considered: a manually built station list without integration to an official registry may be incomplete or misleading. Resolution: kept as written; no counter-argument accepted.
- FR-005: Member can add a new station/stop. Priority: must-have
  > Socratic: Counter-argument considered: duplicate stations under different names would fragment historical data and weaken predictions. Resolution: kept as written; risk accepted for MVP, corrected manually by Admin (FR-012) as issues surface.
- FR-006: Member can edit an existing station/stop. Priority: must-have
  > Socratic: Counter-argument considered: editing a station's location could accidentally break historical links to existing sightings. Resolution: kept as written; risk accepted for MVP.

### Sightings
- FR-007: Member can record a sighting of a rolling-stock type at a station with a timestamp. Priority: must-have
  > Socratic: Counter-argument considered: without verification (e.g. a photo), users could submit false sightings that pollute prediction training data. Resolution: kept as written; the correctness-rating system (FR-009) acts as a post-hoc filter instead of upfront verification.
- FR-008: Visitor (logged in or not) can browse recorded sightings. Priority: must-have
  > Socratic: Counter-argument considered: fully public visibility of exact sighting time/location could raise misuse concerns unrelated to spotting as a hobby. Resolution: kept as written; no counter-argument accepted.

### Data quality
- FR-009: Member can rate the correctness of a recorded sighting. Priority: must-have
  > Socratic: Counter-argument considered: a rating system without rater reputation/weighting is vulnerable to collusion. Resolution: kept as written; no counter-argument accepted.

### Prediction
- FR-010: Member can view predicted likely locations for a given rolling-stock type based on historical sighting data; below a minimum data threshold, the system shows an explicit "not enough data yet" state instead of a prediction. Priority: must-have
  > Socratic: Counter-argument considered: a prediction based on very little data at launch would be misleading while still being presented as "the answer." Resolution: modified — an explicit empty/insufficient-data state replaces a low-confidence prediction below a minimum data threshold.

### Access & moderation
- FR-011: Visitor can register and log in (email/password or OAuth). Priority: must-have
  > Socratic: Counter-argument considered: a full account system (registration + OAuth) is significant effort that could be simplified to one login method without losing MVP value. Resolution: kept as written; no counter-argument accepted.
- FR-012: Admin can moderate/delete entries. Priority: nice-to-have
  > Socratic: Counter-argument considered: without moderation, data quality could degrade from day one — arguably too important to be nice-to-have. Resolution: kept as nice-to-have per user decision; note FR-002 now depends on Admin approval, so moderation capability is partially load-bearing even at nice-to-have priority — flagged for re-evaluation if approval queue backs up.

### Search
- FR-013: Visitor can search rolling-stock types and their sighting locations. Priority: nice-to-have
  > Socratic: Counter-argument considered: without search, a large catalog becomes unusable, but with the small MVP dataset this is likely acceptable. Resolution: kept as nice-to-have; no counter-argument accepted.

## Non-Functional Requirements

- A visitor sees a response to any core action (browsing, submitting a sighting, requesting a prediction) in under ~1 second under typical load.
- A member's email address is never publicly visible alongside their sightings, ratings, or contributed types/stations.
- The product remains usable on the latest two major versions of the mainstream desktop and mobile browsers.

## Business Logic

Based on the history of reported sightings for a given rolling-stock type, the system indicates the stations/stops where that type is most likely to reappear.

The rule consumes historical sighting reports — each pairing a rolling-stock type, a station/stop, and a timestamp — weighted by how members have rated those reports' correctness, so unreliable entries carry less influence. Its output is a ranked list of likely stations for a rolling-stock type the member selects, or an explicit "not enough data yet" state when the historical record is too thin to support a confident answer. A member encounters this rule when they pick a rolling-stock type they want to spot and ask the system where it's likely to show up — the moment that turns "hunting blind" into a targeted trip.

## Access Control

Login required (email/password or OAuth) — ratings and edits to shared data must be traceable to a user to deter abuse and low-quality/spam contributions. Two roles:

- **Member** (default on sign-up): can add/edit rolling-stock types, stations/stops, and sighting occurrences; can rate the correctness of entries.
- **Admin**: everything a Member can do, plus moderate/delete bad or abusive entries, and approve newly submitted rolling-stock types (FR-002).

An unauthenticated visitor can browse read-only content; adding, editing, or rating requires login.

## Non-Goals

- **User ranking/gamification** — no leaderboards or ranking of spotters by activity in the MVP; keeps the product focused on data quality, not competition.
- **Map-based sighting display** — sightings are shown as lists/tables, not plotted on a map, in the MVP; avoids the cost of a mapping integration before the core prediction loop is proven.
- **Social media sharing** — no built-in sharing of finds to social platforms in the MVP; the product isn't a discovery/social feed for v1.
- **Wikipedia linking** — rolling-stock types are not linked to external Wikipedia pages in the MVP; avoids dependency on an external content source.
- *(Implicit via `product_type: web-app`)* No native mobile or desktop app in the MVP.

## Open Questions

1. **What is the minimum sighting/station volume threshold below which the prediction shows "not enough data yet" instead of a result (FR-010)?** — Owner: user. By: once real usage data exists to calibrate against.
2. **Should Admin moderation (FR-012) be promoted from nice-to-have to must-have?** — FR-002's approval queue for new rolling-stock types already depends on an Admin doing the approving, so moderation capability is partially load-bearing even at its current nice-to-have priority. Owner: user. By: before implementation planning, or revisit if the approval queue backs up during MVP use.
