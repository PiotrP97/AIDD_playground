---
project: trainspotter
researched_at: 2026-08-01
recommended_platform: Cloudflare Workers
runner_up: Vercel
context_type: mvp
tech_stack:
  language: JavaScript/TypeScript
  framework: Astro 6 (SSR, output: "server") + React 19 islands
  runtime: Cloudflare Workers (workerd) via @astrojs/cloudflare
---

## Recommendation

**Deploy on Cloudflare Workers.**

Cloudflare Workers passes all five agent-friendly criteria (CLI-first via `wrangler`, fully serverless, agent-readable docs via `llms.txt`, a stable deploy/rollback API, and a GA MCP server), costs **$0/month** at the PRD's expected 10k–100k monthly requests, and — critically — this repo's `wrangler.jsonc` and `astro.config.mjs` are **already correctly configured** for it. No adapter swap, no migration. This directly matches the interview answers: no persistent connections needed (Q1), cost is the top priority (Q2), and single-region traffic is fine (Q4), so Cloudflare's edge reach is a bonus rather than a requirement.

## Platform Comparison

Scored against the five agent-friendly criteria (`references/agent-friendly-criteria.md`), filtered by the tech stack (no runtime is excluded — all six candidates support Node/JS SSR) and weighted by the interview: no persistent connections required (so the Netlify/Vercel serverless-only hard filter does not apply), cost-sensitive, no existing platform familiarity, single-region acceptable, Supabase stays external regardless of platform.

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP/Integration | Total |
|---|---|---|---|---|---|---|
| **Cloudflare Workers** | Pass | Pass | Pass | Pass | Pass | 5 Pass |
| **Vercel** | Pass | Pass | Pass | Pass | Pass | 5 Pass |
| Netlify | Partial | Pass | Pass | Partial | Partial | 2P / 3Pt |
| Render | Partial | Pass | Pass | Partial | Partial | 2P / 3Pt |
| Railway | Partial | Partial | Pass | Pass | Partial | 2P / 3Pt |
| Fly.io | Partial | Partial | Pass | Partial | Partial | 1P / 4Pt |

- **Cloudflare Workers**: `wrangler deploy` / `wrangler rollback [VERSION_ID]` / `wrangler tail` are all deterministic, scriptable, GA. Free tier: 100,000 requests/day, well past the PRD's expected scale, at $0. `@astrojs/cloudflare` now targets Workers only (Cloudflare deprecated Pages for new capabilities in April 2025); the repo's `wrangler.jsonc` already uses the current Workers Assets model. Official Cloudflare MCP servers are GA.
- **Vercel**: Ties on raw criteria — full Node runtime (no `workerd` compatibility surface to worry about), `vercel rollback`/`vercel logs` both GA and agent-optimized, official MCP GA. Loses the tiebreak on two points: requires swapping `@astrojs/cloudflare` → `@astrojs/vercel`, and the free Hobby tier's fair-use terms restrict "primarily commercial" use — an ambiguity worth avoiding for a public crowdsourced app, even though TrainSpotter has no monetization in scope.
- **Netlify**: GA Astro adapter (v8.1.2, Astro 6-compatible), agent-readable docs, likely-$0 credit-based free tier. Falls to Partial on CLI-first and stable-deploy-API because **rollback has no CLI subcommand** — it's dashboard or raw REST API only, a direct conflict with the "an agent cannot click" rationale behind the CLI-first criterion. The official MCP server also doesn't yet expose log or rollback tools.
- **Render**: Same rollback gap as Netlify (dashboard/API only, no CLI subcommand). Free tier spins down after 15 minutes of inactivity with a ~1 minute cold start, which risks violating the PRD's NFR of <1s response time on the first request after idle — the paid Starter tier ($7/mo) is needed to avoid this, which cuts against the cost-minimization priority.
- **Railway**: Solid CLI (`railway up`, `railway logs`) and GA `llms.txt` docs, but no dedicated rollback subcommand, always-on container billing (~$15–25/mo realistic floor regardless of request volume — no free tier), and its MCP server is explicitly labeled "a work in progress." Highest recurring cost of the six, in direct tension with the top-priority interview answer.
- **Fly.io**: Weakest overall. Container/Dockerfile ownership is mandatory (out of this skill's scope to write), and a documented, unresolved-as-of-check regression (2026-01-16 to 2026-01-23) has `fly launch` failing to auto-generate a working Dockerfile for Astro 5+ SSR apps — a real reliability gap for a solo dev on a tight timeline. No free tier since 2024; realistic floor ~$5–20/mo.

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

Wins the tiebreak against Vercel on two grounds: zero migration cost (the repo is already configured correctly) and unambiguous $0 pricing at MVP scale, versus Vercel's Hobby-tier commercial-use ToS risk and required adapter swap.

#### 2. Vercel

The strongest alternative if the Cloudflare Workers CPU-time/Node-compatibility risks (see cross-check below) turn out to bite in practice — full Node runtime sidesteps both concerns entirely, at the cost of an adapter migration and a green-lit check on Hobby-tier ToS fit.

#### 3. Netlify

A reasonable fallback with a mature adapter and likely-free tier, but the missing CLI-native rollback is a genuine agent-ops gap worth weighing against Vercel's completeness before choosing this over the runner-up.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. **Partial Node compatibility** — `nodejs_compat` covers common Node builtins but not the full surface. A future dependency (image processing, PDF export, etc.) that touches an uncovered API fails at runtime, not build time, and debugging a `workerd`-specific incompatibility costs disproportionate time on a solo, after-hours, 3-week timeline.
2. **Free-tier CPU-time ceiling (10ms/invocation)** — FR-010's prediction ranking (aggregating and weighting sighting history by correctness rating) is exactly the kind of non-trivial computation that could exceed this as the sighting table grows, forcing either a paid-tier upgrade or a rewrite to push the logic into Supabase/Postgres instead.
3. **Dev/prod parity gaps remain despite the `workerd`-based dev server** — Supabase auth's cookie/session handling in SSR can behave differently under `wrangler dev` vs. deployed, especially around binding modes.
4. **`compatibility_date` pinning is a deliberate-update burden** — letting it go stale silently forecloses newer `nodejs_compat` coverage; there's no automatic "catch up" without an explicit decision.
5. **No native cron/background jobs** — if prediction recompute-on-schedule or moderation-queue sweeps (FR-012) ever need to run outside a request, Workers requires bolting on Cron Triggers as a separate primitive with its own deploy/testing story.

### Pre-Mortem — How This Could Fail

Six months in, TrainSpotter's prediction feature (FR-010) started timing out for popular rolling-stock types with thousands of sightings. The team had assumed Workers' request/response model was fine because "no persistent connections were needed" — true, but nobody separately checked whether the prediction ranking computation would fit inside the 10ms free-tier CPU budget once the sighting table grew. It didn't, so predictions either errored or silently fell back to "not enough data" — corrupting the very metric (70% of predictions considered plausible) the MVP was built to hit. The fix meant moving ranking logic into a Postgres view/RPC on Supabase, relearning where business logic "lived" mid-project. Separately, an npm package pulled in for CSV export depended on a Node API `nodejs_compat` didn't cover, discovered only at deploy time — costing a weekend of the solo dev's limited after-hours budget.

### Unknown Unknowns

- The 10ms CPU budget is per-invocation, not per-logical-request — Supabase auth middleware + SSR render + any business logic share one budget, which isn't obvious from "Astro deploys fine to Cloudflare" tutorials.
- `nodejs_compat` coverage expands over time tied to `compatibility_date` — unlike Vercel/Netlify's full-Node runtime, there's no fixed, look-up-once list of what's supported.
- The default image service (`cloudflare-binding`) transforms images at the edge; if sighting photos get added later (a natural feature request, not currently in FR scope), this default behaves differently than Node-based image pipelines most tutorials assume.
- `wrangler rollback` reverts Worker code/version but never touches Supabase schema/data — a bad migration paired with a code rollback can leave DB and code silently out of sync, with no tooling to detect the mismatch.
- Workers Assets (not Pages) is now the deploy model, but a lot of existing "deploy Astro to Cloudflare" tutorial content still assumes the older Pages Git-integration workflow (automatic per-PR preview URLs via dashboard). The Workers-native equivalent needs explicit Workers Builds CI configuration, a different setup path.

**Decision**: proceed with Cloudflare Workers, risks absorbed into the risk register below.

## Operational Story

- **Preview deploys**: Workers Builds (CI-driven) generates a preview URL per branch/PR when connected to the GitHub repo; this supersedes the old Pages per-PR dashboard flow and needs explicit CI configuration rather than being automatic out of the box.
- **Secrets**: `SUPABASE_URL` / `SUPABASE_KEY` are already declared as server-only secrets in `astro.config.mjs`'s `env.schema` (`access: "secret"`). Set them with `wrangler secret put SUPABASE_URL` (interactive or piped); local dev reads from `.dev.vars` (gitignored). Only the Cloudflare account holder and anyone with the scoped API token can read/rotate them.
- **Rollback**: `wrangler rollback [<VERSION_ID>]` reverts the deployed Worker version (defaults to previous stable); list candidates with `wrangler versions list --json`. Caveat: this rolls back code only — any Supabase schema migration tied to that release does **not** roll back automatically and must be reverted separately.
- **Approval**: routine deploys (`wrangler deploy`) and log reads are safe for unattended agent execution. Rotating the Cloudflare API token, changing billing tier, or deleting the Worker/project are human-only, panel-by-hand actions.
- **Logs**: `wrangler tail [WORKER] --format pretty --status error` streams live runtime logs read-only from the terminal; no dashboard needed for routine debugging.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Prediction ranking computation (FR-010) exceeds the 10ms free-tier CPU budget as sighting volume grows | Pre-mortem | M | H | Push ranking/aggregation into a Supabase Postgres view or RPC rather than computing it in the Worker; load-test with realistic sighting volume before the free-tier ceiling becomes a launch blocker |
| A future dependency relies on a Node API not covered by `nodejs_compat`, failing only at deploy time | Devil's advocate | M | M | Run `wrangler deploy --dry-run` in CI before merging; vet new dependencies against Cloudflare's compatibility matrix before adding them |
| `wrangler rollback` reverts Worker code but leaves Supabase schema/data unsynced after a bad migration | Unknown unknowns | L | H | Treat DB migrations and Worker deploys as a single release unit; document the paired rollback steps in `context/deployment/deploy-plan.md` before first production migration |
| Stale `compatibility_date` silently blocks newer `nodejs_compat` coverage | Devil's advocate | L | L | Review and bump `compatibility_date` in `wrangler.jsonc` on a periodic cadence (e.g. each significant feature milestone) rather than leaving it untouched indefinitely |
| No native cron primitive if scheduled recompute/moderation sweeps become necessary later | Devil's advocate | L | L | If a scheduled job becomes necessary, add a Cloudflare Cron Trigger as a separate, explicitly-scoped Worker rather than forcing it into the request-response Worker |
| Tutorial/AI-assistant guidance for "deploy Astro to Cloudflare" may still describe the deprecated Pages Git-integration flow | Unknown unknowns | M | L | Rely on this document and `developers.cloudflare.com/workers` (not general Pages tutorials) as the source of truth for CI/preview setup |

## Getting Started

1. Confirm current config is intact: `wrangler.jsonc` should already declare `assets.binding: "ASSETS"`, `main: "@astrojs/cloudflare/entrypoints/server"`, the `nodejs_compat` flag, and a `compatibility_date` — no changes needed per this research.
2. Authenticate: `npx wrangler login`.
3. Set secrets before first deploy: `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_KEY` (values from the Supabase project dashboard).
4. Build and deploy: `npm run build && npx wrangler deploy` (or `wrangler deploy --dry-run` first to compile-check without publishing).
5. Verify: `npx wrangler tail --format pretty --status error` while exercising the deployed app to confirm no runtime errors, then check the free-tier request count in the Cloudflare dashboard against the 100k/day ceiling as usage grows.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup (Workers Builds configuration for preview URLs is named above as a follow-up, not configured here)
- Production-scale architecture (multi-region, HA, DR)
