<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Record a Sighting

- **Plan**: context/changes/record-a-sighting/plan.md
- **Scope**: Full plan (Phases 1-4 of 4)
- **Date**: 2026-08-02
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 4 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | WARNING |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Topbar not centrally mounted; auth pages have zero navigation — FIXED (Fix A)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architecture
- **Location**: `src/layouts/Layout.astro`, `src/pages/dashboard.astro:3,10`, `src/pages/sightings/new.astro:3,9`, `src/pages/stations/[id].astro:3,42`
- **Detail**: Phase 3's Contract said: "Mount `<Topbar />` in `Layout.astro` (currently unused) so the page is reachable from any screen." The actual `git diff` on `Layout.astro` shows the *only* change there is `class="dark"` on `<html>` — `Topbar` was never mounted centrally. Instead it's imported and rendered individually in `dashboard.astro`, `sightings/new.astro`, and `stations/[id].astro` (added in Phase 4). This was a deliberate, disclosed fix during Phase 3 (Welcome.astro already renders its own `Topbar` on `/`, so a blanket Layout-level mount produced a visible duplicate topbar). But the plan file was never updated to reflect the new approach, and the fix has a real gap: confirmed via `grep` that `src/pages/auth/signin.astro`, `signup.astro`, and `confirm-email.astro` have **no Topbar at all** — a user on the sign-in/sign-up flow has no way back except browser-back. Every future page must also remember to import it individually; nothing enforces this.

  Fix A ⭐ Recommended: Fix at the root — remove `Topbar` from `Welcome.astro`, mount it once in `Layout.astro`, and let every page (including auth pages) inherit it automatically.
    Strength:   Restores the plan's original intent in one place; closes the confirmed auth-page gap; every future page gets nav for free instead of relying on each author remembering.
    Tradeoff:   Touches `Welcome.astro`, a pre-existing scaffold file outside this change's original scope, and needs a quick visual recheck of the homepage's cosmic-background layout.
    Confidence: HIGH — `Topbar` itself already reads `Astro.locals.user` independently; removing one usage and adding one is low-risk.
    Blind spot: Haven't visually verified `Topbar`'s appearance inside `Welcome.astro`'s `z-10` cosmic wrapper vs. `Layout.astro`'s plain placement before `<slot />` — worth a quick before/after screenshot.

  Fix B: Keep the per-page pattern; explicitly add `<Topbar />` to the three auth pages that are missing it, and document "each page mounts its own Topbar" as the house convention (plan addendum or a `lessons.md` entry).
    Strength:   Smaller, additive change; zero risk to the already-working homepage.
    Tradeoff:   Doesn't fix the underlying "must remember every time" gap — the next new page can still ship without nav.
    Confidence: MEDIUM — straightforward, but treats the symptom, not the cause.
    Blind spot: None significant.

- **Decision**: FIXED (Fix A) — Topbar removed from Welcome.astro, mounted once in Layout.astro before `<slot />`; redundant per-page usages removed from dashboard.astro, sightings/new.astro, stations/[id].astro. Verified via `npm run build` (passes). Auth pages (signin/signup/confirm-email) now inherit Topbar automatically since they use Layout.astro.

### F2 — Stale-response race in the combobox's debounced search — FIXED

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/components/sightings/CreatableCombobox.tsx:30-57`
- **Detail**: The debounce clears the pending *timer* but not an in-flight `fetch`. If a slower response for an earlier keystroke resolves after a faster response for a later one, `setItems(data.items)` has no request-id/`AbortController` guard, so stale results can silently overwrite correct ones.
- **Fix**: Add an `AbortController` per search request (abort the previous one when a new debounced search fires) and ignore responses from an aborted/superseded request.
- **Decision**: FIXED — added `abortRef` alongside `debounceRef` in `CreatableCombobox.tsx`; each debounced fetch aborts the previous in-flight one and passes `signal`; `AbortError` is swallowed silently (not treated as a real failure); `finally` only clears `loading` if the completing request is still the current one. Verified via `npm run build` (passes).

### F3 — Supabase query error silently discarded, masking real failures as "not found" — FIXED + ACCEPTED-AS-RULE: "Query errors from Supabase must be checked, not just destructured-and-ignored"

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/pages/stations/[id].astro:20-26`
- **Detail**: `const { data } = await supabase.from("stations")...single();` never checks `error`. A malformed `id` (invalid UUID) throws a Postgres error, and any transient DB/RLS failure behaves identically — both collapse into the generic "Station not found" state, indistinguishable from a station that genuinely doesn't exist. This hides real outages from users and from logs.
- **Fix**: Destructure `error` alongside `data`, log it when present (e.g. `console.error`), while still falling back to the 404 UI for the user — but now the failure is observable server-side instead of silent.
- **Decision**: FIXED + ACCEPTED-AS-RULE — recorded in `context/foundation/lessons.md` ("Query errors from Supabase must be checked, not just destructured-and-ignored"; Rule: always check for errors when executing a DB query; Applies to: DB queries). Code fixed: `stations/[id].astro` now destructures `error`, logs it via `console.error` when present and not `PGRST116` (the expected "no rows" shape), and keeps the same 404 UI fallback for the user either way. Verified via `npm run build` (passes; `no-console` fires as a warning only, matching this project's own lint config).

### F4 — 404 mechanism differs from the plan's literal Contract — FIXED (docs)

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/pages/stations/[id].astro:30`
- **Detail**: Phase 4's Contract specified `return new Response(null, { status: 404 })` from frontmatter. The actual code sets `Astro.response.status = 404` and continues rendering the full `Layout` with a "Station not found." message instead of an early bare return. This was a deliberate, disclosed adaptation — `return` at the top level of Astro frontmatter crashes this repo's `@typescript-eslint/no-misused-promises` rule (confirmed via a minimal repro during implementation, not a code-quality issue). The result arguably better satisfies the plan's own manual-verification wording ("not-found state rather than an empty page") than a bare `Response(null)` would have.
- **Fix**: No code change needed. Update Phase 4's Contract text in `plan.md` to describe the `Astro.response.status` mechanism actually used, so a future reader isn't misled by the stale literal snippet.
- **Decision**: FIXED (docs) — `plan.md`'s Phase 4 Contract text updated to describe the actual `Astro.response.status = 404` mechanism, with a dated note explaining why it diverges from the original snippet.

### F5 — Unused `dialog.tsx` installed as a transitive shadcn dependency

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: `src/components/ui/dialog.tsx`
- **Detail**: Phase 3's Contract said `npx shadcn@latest add popover command input label`. The shadcn CLI auto-installed `dialog.tsx` too, since `command.tsx` imports `Dialog`/`DialogContent`/etc. for its (unused-by-this-app) `CommandDialog` export. Confirmed via search: nothing in `src/` besides `command.tsx` itself references `dialog.tsx`.
- **Fix**: Either delete `src/components/ui/dialog.tsx` as dead code (re-installable in seconds via `npx shadcn add dialog` if a future slice needs it), or leave it — harmless either way, this is purely a scope-discipline note, not a risk.
- **Decision**: SKIPPED

### F6 — `occurred_at` has no sanity bound

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `supabase/migrations/20260802140537_domain_schema.sql:31`, `src/lib/schemas/sighting.ts:6`
- **Detail**: Nothing prevents a sighting timestamped arbitrarily in the past or future (DB only requires `not null`; Zod only validates ISO-datetime format). Explicitly out of this slice's scope, but worth flagging since `occurred_at` is exactly the field the PRD's prediction feature (S-09) and data-quality guardrail will depend on.
- **Fix**: No action needed now. Worth a `check` constraint or validation bound (e.g., not more than N days in the future) whenever a slice that hardens data quality lands.
- **Decision**: SKIPPED

### F7 — `RecordSightingForm`'s submission model sets a new precedent, diverging from `SignInForm`

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/components/sightings/RecordSightingForm.tsx:22-56` vs `src/components/auth/SignInForm.tsx:18-40,43`
- **Detail**: Field-level state style matches (`useState` per field, no form library) as the plan intended. But the submission mechanism diverges: `SignInForm` is a native `<form method="POST">` with a server-driven redirect; `RecordSightingForm` intercepts submit, POSTs JSON via `fetch`, and redirects imperatively via `window.location.href`. This is a reasonable, arguably necessary divergence (combobox selections aren't native form fields; the API returns JSON), and it's the first form to establish this pattern — future form authors will copy whichever example they see first.
- **Fix**: No code change needed. Worth a short note (e.g. in `lessons.md`) that fetch+JSON is now the house pattern for interactive multi-field forms, while native form+redirect stays for simple forms — so the choice is deliberate, not accidental, next time.
- **Decision**: SKIPPED
