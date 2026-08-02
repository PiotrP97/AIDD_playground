<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Browse Recorded Sightings

- **Plan**: context/changes/browse-sightings/plan.md
- **Mode**: Deep
- **Date**: 2026-08-02
- **Verdict**: REVISE
- **Findings**: 0 critical, 2 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding

Grounding: 7/7 paths ✓, 4/4 symbols ✓, brief↔plan ✓

## Findings

### F1 — Clamp-then-requery mechanism is ambiguous; could silently render an empty table — FIXED

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 Contract, `src/pages/sightings/index.astro`
- **Detail**: Confirmed via `@supabase/postgrest-js` source: `count: "exact"` returns the total row count independent of `.range()` (parsed from the `Content-Range` header), while `data` is `[]` when the requested range is entirely past the last row — this part of the plan's assumption is correct. But the Contract's exact sentence — "Once `count` is known, clamp via `clampPage` and re-derive `from`/`to` if the requested page was out of range" — never states a **second Supabase query** must run with the re-derived bounds. As written, an implementer could relabel the page number for display while still rendering the first (empty) query's `data`, producing "page 3 of 3" with a blank table. The plan's own manual test step 5 ("clamps... instead of erroring or showing a blank page") would catch this, but only after the bug is already built — costing a debugging cycle that one explicit sentence avoids.
- **Fix**: Add one sentence to the Contract: "If `clampPage` changes the page number, re-run the query with the newly-derived `from`/`to` before rendering — the first query's `data` is empty for an out-of-range page even though `count` is accurate."
- **Decision**: FIXED — sentence added to Phase 2's Contract in plan.md.

### F2 — Topbar's two-branch structure doesn't mechanically support an "always visible" link as described — FIXED (Fix A)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Completeness
- **Location**: Phase 2 Contract, `src/components/Topbar.astro`
- **Detail**: Confirmed via full read of `Topbar.astro:8-38`: the component is a single `{ user ? (...) : (...) }` ternary with two entirely separate branches (signed-in: email/Dashboard/Record sighting/Sign out; signed-out: Sign in/Sign up) and no shared markup outside it. The plan's Contract correctly states the new link must be "visible regardless of auth state," but doesn't say how to achieve that given this structure — an implementer has to independently decide between duplicating the link in both branches or restructuring the component. Left unresolved, the riskier failure mode is an implementer adding the link to only one branch (most likely the signed-in one, since that's where "Record sighting" already lives), which would directly contradict FR-008's "logged in or not" requirement for nav discoverability specifically.
- **Fix A ⭐ Recommended**: Restructure `Topbar.astro` to render a shared, always-visible links section (e.g. containing "Sightings") outside the ternary, keeping the ternary scoped to genuinely auth-dependent content.
  - Strength: Single source of truth for the new link; the natural place to add more public links later (e.g. future browse-types/browse-stations pages).
  - Tradeoff: Slightly larger diff for this phase than a pure addition.
  - Confidence: HIGH — the ternary is simple enough that extracting a shared section is mechanical and low-risk.
  - Blind spot: Haven't visually verified how a shared section interacts with the existing left/right flex split — worth a quick look during Phase 2's manual testing.
- **Fix B**: Add the link independently to both branches of the existing ternary.
  - Strength: Minimal diff, no structural change to `Topbar.astro`.
  - Tradeoff: Duplicated markup — two places to update if the link's label or href ever changes, an easy spot for future drift.
  - Confidence: MEDIUM — works today, but is exactly the kind of duplication that causes bugs later.
  - Blind spot: None significant.
- **Decision**: FIXED (Fix A) — Phase 2's Contract now explicitly directs restructuring `Topbar.astro` with a shared always-visible links section outside the auth ternary.

### F3 — Vitest zero-config rationale in the plan is factually incorrect (conclusion still holds) — FIXED

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 Contract, "No `vitest.config.ts` needed"
- **Detail**: Confirmed via `astro.config.mjs` and `node_modules` inspection: the plan's stated reason ("Vitest's zero-config default... which this project already has via `@tailwindcss/vite`") is wrong — Vitest zero-config does NOT read `astro.config.mjs` at all (that's only loaded through the Astro integration when Astro itself runs); a bare `vitest run` uses Vite's plain defaults. The conclusion (no config file needed) is still correct, but only because `pagination.ts`/`pagination.test.ts` need zero Vite plugins (no Tailwind/Astro/React/JSX) — not because Vitest inherits anything from Astro's config. A future reader could be misled into thinking Vitest already sees the project's Vite setup, which would break the moment someone tests a file that actually needs a plugin.
- **Fix**: Correct the sentence to: "No `vitest.config.ts` needed — the test target imports nothing that needs a Vite plugin (no Tailwind/Astro/React), so Vitest's bare defaults are sufficient; this does NOT mean Vitest inherits `astro.config.mjs`'s Vite setup."
- **Decision**: FIXED — Phase 1's Contract corrected in plan.md.

### F4 — Offset-based pagination can shift/duplicate rows under concurrent inserts (unacknowledged) — FIXED

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Performance Considerations
- **Detail**: `.range()`-based pagination is offset-based, not cursor-based. If a new sighting is recorded while a visitor is browsing page 2+, the row that was previously last on page 1 shifts into page 2's view, and the visitor's next page can show a row they already saw (or, symmetrically, one row can be skipped entirely). This is a well-known, generally-accepted limitation of this pagination style, not something this slice needs to solve at `target_scale.qps: low` — but the plan doesn't currently acknowledge it anywhere, so a future reader might assume it wasn't considered.
- **Fix**: Add one sentence to Performance Considerations: "Offset-based pagination can shift or duplicate a row at page boundaries under concurrent inserts — accepted as a low-probability, low-impact limitation at this scale; cursor-based pagination would be the eventual fix if it matters later."
- **Decision**: FIXED — sentence added to Performance Considerations in plan.md.
