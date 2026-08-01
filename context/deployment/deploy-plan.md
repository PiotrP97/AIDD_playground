---
project: trainspotter
platform: Cloudflare Workers
plan_approved_at: 2026-08-01
status: deployed
---

# TrainSpotter — First Deployment to Cloudflare Workers

## Context

`context/foundation/infrastructure.md` already recorded the platform decision (Cloudflare Workers, chosen over Vercel/Netlify/Render/Railway/Fly.io via a scored, bias-checked research pass) and a "Getting Started" outline. This plan turns that outline into an executable, ordered runbook for the project's actual first deploy — grounded in the repo's real current state (confirmed via read-only exploration, not assumed) and three decisions the user made when asked:

1. **Rename** the Worker/package from the leftover scaffold name `10x-astro-starter` to `trainspotter` before deploying.
2. **Neither a Cloudflare account nor a Supabase cloud project exists yet** — this plan includes account/project creation, not just credential-wiring.
3. **Manual deploy only** — no CI auto-deploy wiring in this pass, even though `context/foundation/tech-stack.md` hints `ci_default_flow: auto-deploy-on-merge`. That's explicit follow-up work, deferred so the manual path is proven first.

Confirmed repo state (read directly, current as of this plan):
- `wrangler.jsonc`: `name: "10x-astro-starter"`, `main: "@astrojs/cloudflare/entrypoints/server"`, `nodejs_compat` flag, `compatibility_date: "2026-05-08"`, Workers Assets model (`assets.binding: "ASSETS"`, `directory: "./dist"`) — all correctly configured, only the `name` needs changing.
- `package.json`: `name: "10x-astro-starter"`, no `deploy` script exists yet, `wrangler ^4.90.0` and `@astrojs/cloudflare ^13.5.0` already pinned as deps.
- `astro.config.mjs`: `output: "server"`, `adapter: cloudflare()`, `env.schema` declares `SUPABASE_URL`/`SUPABASE_KEY` as `context: "server", access: "secret", optional: true` — no changes needed.
- `src/lib/supabase.ts` reads secrets via `astro:env/server` (not `process.env`), returns a `null` client gracefully if unset — this is what `wrangler secret put` will feed at runtime, no code changes needed.
- `src/lib/config-status.ts` drives the "Supabase nie jest skonfigurowany — funkcje uwierzytelniania są wyłączone." banner (exact string confirmed) via `Boolean(SUPABASE_URL && SUPABASE_KEY)` — its disappearance after deploy is the end-to-end proof secrets are wired.
- No `.dev.vars` or `.dev.vars.example` exists on disk yet, though README already instructs `cp .env.example .dev.vars`.
- `.github/workflows/ci.yml` only lints + builds — no deploy step, no `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` anywhere in the repo. Left untouched per decision #3.
- `supabase/`: only `config.toml` (local CLI config, `project_id: "10x-astro-starter"`) — no migrations, no domain schema. The Supabase cloud project this plan creates only needs **Auth** configured; no table/migration work is in scope.
- No `.wrangler/` state, no account/URL references anywhere — this is a genuine first deploy.

## Steps

Each step is tagged **[AGENT]** (executed directly), **[HUMAN]** (requires the user — account creation, OAuth click-through, pasting a dashboard value), or **[AGENT, human supplies value]** (agent runs the command; the human types the secret at the prompt so it never passes through chat).

### Phase 1 — Account creation gates [HUMAN]

1. Sign up for a Cloudflare account at `dash.cloudflare.com/sign-up`.
2. Sign up for Supabase at `supabase.com/dashboard` (GitHub OAuth is fastest); create an Organization if needed.
3. Create a new Supabase cloud project named `trainspotter`, pick a region, set a DB password. Wait for provisioning (~2 min).
4. In the new project: Settings → API → copy the **Project URL** and the **anon / public** key (not `service_role`).
5. Note for later, no action now: cloud Supabase defaults to "Confirm email" ON (local `supabase/config.toml` has it off) — relevant only if testing signup during verification. Free-tier projects also pause after ~1 week idle.

### Phase 2 — Local config changes [AGENT]

1. `wrangler.jsonc`: `"name": "10x-astro-starter"` → `"name": "trainspotter"`.
2. `package.json`: `"name": "10x-astro-starter"` → `"name": "trainspotter"`.
3. `supabase/config.toml`: `project_id = "10x-astro-starter"` → `project_id = "trainspotter"`. This is a local-only CLI identifier (Docker container/volume namespacing), unrelated to the cloud project's own generated ref ID — safe to rename since no local `supabase start` stack has ever been run under the old name (no `.wrangler/` or Docker evidence found).
4. Run `npm install` to resync `package-lock.json`'s root name.
5. Create `.dev.vars.example` (new, tracked) mirroring `.env.example`, closing the gap between what the README instructs and what actually exists on disk.
6. Create `.dev.vars` (gitignored, already excluded) from the template — agent creates the file, human fills in the real Project URL / anon key from Phase 1 so the secret doesn't pass through chat.

### Phase 3 — Cloudflare authentication [AGENT invokes, HUMAN completes browser step]

```bash
npx wrangler login
npx wrangler whoami   # verify
```
OAuth browser flow — the right auth path here since no CI automation is being wired (a scoped API token is a later concern, only once CI needs unattended access). If multiple Cloudflare accounts show up under `whoami`, may need an explicit `account_id` in `wrangler.jsonc` — unlikely on a brand-new single account.

### Phase 4 — Secret provisioning [AGENT runs command, HUMAN types value]

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_KEY
npx wrangler secret list   # verify names only, values never shown
```
Paste the Project URL / anon key from Phase 1 directly at each interactive prompt. If either command errors because the Worker script doesn't exist yet, run Phase 5's deploy first to create the Worker shell, then re-run these two commands and redeploy.

### Phase 5 — Build and deploy [AGENT]

```bash
npm run build
npx wrangler deploy --dry-run   # compile-check only, catches nodejs_compat gaps early
npx wrangler deploy             # actual Workers deploy
```
This is the **Workers** deploy command — never `wrangler pages deploy` or any other Pages-specific command, which targets a different, incompatible product. Capture the printed `https://trainspotter.<subdomain>.workers.dev` URL and Version ID.

### Phase 6 — Verification [AGENT, one optional human check]

```bash
curl -I https://trainspotter.<subdomain>.workers.dev                     # expect 200
curl -s https://trainspotter.<subdomain>.workers.dev | grep -i "Supabase nie jest skonfigurowany"   # expect no match = secrets live
curl -I https://trainspotter.<subdomain>.workers.dev/dashboard           # expect 301/302 to /auth/signin
npx wrangler tail --format pretty --status error   # tail while hitting /, /auth/signin, /auth/signup, /dashboard — expect no error lines
```
Optional **[HUMAN]**: sign up a throwaway test account in-browser at `/auth/signup`, then confirm `/dashboard` is reachable while authenticated. Not required — this deploy's scope is auth-plumbing only, no domain features exist yet to test beyond that.

### Phase 7 — Update this file with the outcome [AGENT]

Once the deploy is verified, this file gets updated with the actual outcome: the resulting Worker URL and the Version ID from Phase 5, plus which verification checks passed — this is what downstream milestone-planning skills read as "what's already deployed."

## Explicitly deferred (not in this pass)

- CI auto-deploy wiring (`.github/workflows/ci.yml` untouched, no `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` repo secrets) — per decision #3.
- Any `supabase/migrations/` or domain schema work — no rolling-stock/station/sighting/rating tables exist yet; out of scope for this deploy.
- Custom domain/routes — ships on the default `*.workers.dev` subdomain.

## Assumptions to flag during execution

- Whether `wrangler secret put` works against a not-yet-deployed Worker name (contingency noted in Phase 4).
- Current Cloudflare Workers free-tier signup terms (no payment method expected, unverified live).
- Browser auto-launch behavior for `wrangler login` from this shell — may need a manually-opened URL instead.

## Critical files

- `wrangler.jsonc` — rename target
- `package.json` — rename target
- `supabase/config.toml` — rename target
- `.env.example` → basis for new `.dev.vars.example` / `.dev.vars`
- `context/foundation/infrastructure.md` — platform decision this plan executes against

## Outcome

**Status: deployed and verified — 2026-08-01.**

- **Worker URL**: https://trainspotter.cloudflare-anemia242.workers.dev
- **Version ID**: `b0ae68f1-20c1-48f5-8f3b-cbd4abc13c9f`
- **Cloudflare account**: `Cloudflare.anemia242@passmail.com's Account` (`b2d6960daa4915679462e341a5cab4fc`)
- **Supabase project**: `trainspotter` (`https://fkvdtbddsylzfpokmakt.supabase.co`)

### What happened, phase by phase

- **Phase 1 (accounts)**: completed by the user — Cloudflare account and a new Supabase cloud project (`trainspotter`) created; Project URL and **publishable** key retrieved from Settings → API.
  - Correction made mid-flow: the user initially pasted the project's **secret key** (`sb_secret_...`, Supabase's service_role-equivalent — bypasses Row Level Security) instead of the **publishable key** (`sb_publishable_...`). This was caught before it was written to any file; the user was asked to rotate the exposed secret key and supply the publishable key instead, which was then used correctly. The secret key was never stored in `.dev.vars`, `wrangler secret`, or committed anywhere.
- **Phase 2 (local renames)**: `wrangler.jsonc`, `package.json`, `supabase/config.toml` renamed `10x-astro-starter` → `trainspotter`; `package-lock.json` resynced via `npm install`; `.dev.vars.example` added (tracked); `.dev.vars` created locally (gitignored) with real values.
- **Phase 3 (auth)**: `wrangler login` via OAuth succeeded; `wrangler whoami` confirmed a single, unambiguous account (no `account_id` override needed).
- **Phase 4 (secrets)**: `wrangler secret put SUPABASE_URL` / `SUPABASE_KEY` succeeded. Per the plan's contingency, the first `secret put` auto-created the Worker shell (it didn't exist yet) via a non-interactive fallback prompt.
- **Phase 5 (build & deploy)**: `npm run build` succeeded. `wrangler deploy --dry-run` passed cleanly (no `nodejs_compat` gaps). The first real `wrangler deploy` uploaded the script/assets/KV binding but stopped short — **new finding, not anticipated in the original plan**: a brand-new Cloudflare account has no `workers.dev` subdomain registered yet, and Wrangler refuses to prompt for this interactively from a non-TTY shell (piping input to stdin does not work around it — it detects the non-interactive context and short-circuits before reading stdin). This required the user to either visit `https://dash.cloudflare.com/<account_id>/workers/onboarding` or run `wrangler deploy` themselves in a real terminal. The user ran it directly in their own terminal, registered the subdomain interactively, and the deploy completed.
- **Phase 6 (verification)**: all checks passed — root URL `200`, no "Supabase nie jest skonfigurowany" banner (secrets live), `/dashboard` → `302` to `/auth/signin` for an unauthenticated request (proves the middleware's live `supabase.auth.getUser()` call actually reached the real Supabase project, not just that env vars are present). `wrangler tail` live-tail was not run separately — the three checks above already exercise the auth path end-to-end.

### New risk surfaced for the risk register (not in `infrastructure.md`'s original list)

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| First deploy on a brand-new Cloudflare account silently stalls because no `workers.dev` subdomain is registered yet, and Wrangler's confirmation prompt cannot be answered from a non-interactive/CI shell | Execution finding | L (one-time, per-account) | M (blocks first deploy until a human intervenes) | Register the `workers.dev` subdomain once, manually, during Cloudflare account setup (Phase 1) for any future project on a fresh account — do this before attempting the first `wrangler deploy`, not after |

### Deferred, unchanged from the approved plan

- CI auto-deploy wiring — not done.
- Supabase migrations / domain schema — not done (no tables exist yet; this deploy is auth-plumbing only).
- Custom domain/routes — not done; running on the default `*.workers.dev` subdomain.
