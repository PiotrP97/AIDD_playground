<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Browse Recorded Sightings

- **Plan**: context/changes/browse-sightings/plan.md
- **Scope**: Full plan (Phases 1-2 of 2)
- **Date**: 2026-08-02
- **Verdict**: APPROVED
- **Findings**: 0 critical, 0 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — `count: "exact"` triggers a full count scan on every request

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/pages/sightings/index.astro:24`
- **Detail**: `count: "exact"` is a known Postgres/PostgREST characteristic — it performs a full or index count scan on every request, not a defect in this diff. Fine at the roadmap's stated MVP scale (`target_scale.qps: low`), already flagged as an accepted tradeoff in the plan's own Performance Considerations.
- **Fix**: No action needed now. Worth switching to `count: "planned"`/`"estimated"` (or caching the count) if the sightings table grows large enough for this to matter.
- **Decision**: SKIPPED

### F2 — DB query errors and a genuinely empty result render identically to the user

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/pages/sightings/index.astro:20-31`
- **Detail**: On a real Supabase/RLS failure, `fetchPage` logs the error (per `lessons.md`) but still returns `{ rows: [], count: 0 }`, so the page renders "No sightings recorded yet." indistinguishably from an actually-empty table. This is consistent with the pre-existing pattern in `stations/[id].astro` (not a new defect introduced here), but it's now duplicated onto a second page.
- **Fix**: No action needed now — consistent with established precedent. Worth a shared "query failed" vs. "genuinely empty" UI distinction if/when this pattern gets a third consumer.
- **Decision**: SKIPPED
