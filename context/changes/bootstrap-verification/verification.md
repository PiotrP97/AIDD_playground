---
bootstrapped_at: 2026-07-30T19:52:22Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: trainspotter
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: trainspotter
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

### Why this stack

TrainSpotter is a solo, after-hours MVP with a 3-week timeline that requires login (email/password or OAuth, FR-011), a relational data model for rolling-stock types, stations, sightings, and ratings, and a public read-only surface for visitors — all of which the recommended `(web, js)` default, Astro+Supabase+Cloudflare, ships out of the box via Supabase's Postgres + auth SDK. The short timeline and solo team favor a battle-tested, agent-friendly starter over a from-scratch assembly, and this card clears all four agent-friendly gates. No payments, realtime, AI/LLM, or background-job features are in scope per the PRD's functional requirements and non-goals, so those flags are false. Deployment stays on the starter's own default, Cloudflare Pages, and CI runs on GitHub Actions with auto-deploy-on-merge — the standard low-friction shape for a solo after-hours project.

## Pre-scaffold verification

| Signal      | Value                                          | Severity | Notes                                                              |
| ----------- | ----------------------------------------------- | -------- | ------------------------------------------------------------------- |
| npm package | not run                                         | n/a      | `cmd_template` starts with `git clone`; no npm CLI package to check |
| GitHub repo | przeprogramowani/10x-astro-starter last pushed 2026-05-17T10:33:39Z | fresh    | from card `docs_url`; `gh` CLI unavailable, checked via GitHub REST API (`curl`) instead |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 17 top-level paths (88 non-`node_modules` files; `node_modules/` moved as a whole installed dependency tree)
**Conflicts (.scaffold siblings)**: CLAUDE.md, README.md
**.gitignore handling**: append-merged (new sections added: generated types `.astro/`, `.env.production`, Cloudflare `.dev.vars` / `.wrangler/`; duplicate patterns already present in cwd's `.gitignore` were dropped)
**.bootstrap-scaffold cleanup**: deleted (cloned `.git/` removed before move-up so the upstream starter's history did not leak into this repo)

## Post-scaffold audit

**Tool**: `npm audit --json`
**Summary**: 1 CRITICAL, 12 HIGH, 7 MODERATE, 2 LOW
**Direct vs transitive**: 0/1/2/0 direct of total 1/12/7/2 (CRITICAL/HIGH/MODERATE/LOW)

#### CRITICAL findings

- **tar** `<=7.5.20` (transitive, via `node-tar`) — six advisories: PAX size-override file smuggling (GHSA-vmf3-w455-68vh), process crash via PAX numeric path type confusion (GHSA-w8wr-v893-vjvp), decompression/parse DoS via unlimited input (GHSA-23hp-3jrh-7fpw), infinite loop via negative tar entry size (GHSA-8x88-c5mf-7j5w), uncaught exception DoS via NUL byte in PAX records (GHSA-gvwx-54wh-qm9j), stack-overflow DoS via uncontrolled recursion (GHSA-r292-9mhp-454m). Fix available.

#### HIGH findings

- **astro** `<=7.0.9` (direct) — six XSS/SSRF advisories (reflected XSS via unescaped slot name, Host-header SSRF in prerendered error page fetch, XSS via unescaped spread attribute names, reflected XSS via View Transition animation properties, incomplete fix for CVE-2026-54298, XSS via unescaped `transition:*` directive values on hydrated islands); also pulls in vulnerable `esbuild`, `sharp`. Fix available.
- **brace-expansion** `<=5.0.7` (transitive) — DoS via exponential-time `{}` expansion / unbounded expansion length (GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg). Fix available.
- **devalue** `5.6.3 - 5.8.0` (transitive) — DoS via sparse array deserialization (GHSA-77vg-94rm-hx3p). Fix available.
- **fast-uri** `3.0.0 - 3.1.3` (transitive) — host confusion via literal backslash authority delimiter / failed IDN canonicalization (GHSA-v2hh-gcrm-f6hx, GHSA-4c8g-83qw-93j6). Fix available.
- **js-yaml** `4.0.0 - 4.2.0` (transitive) — quadratic-complexity DoS via merge-key/alias chains (GHSA-h67p-54hq-rp68, GHSA-52cp-r559-cp3m). Fix available.
- **miniflare** (transitive, via `sharp`, `undici`, `ws`) — inherits their advisories below. Fix available.
- **postcss** `<=8.5.17` (transitive) — path traversal in source-map auto-loading leads to arbitrary `.map` file disclosure (GHSA-r28c-9q8g-f849). Fix available.
- **sharp** `<0.35.0` (transitive) — inherited libvips CVEs (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591) (GHSA-f88m-g3jw-g9cj). Fix available.
- **svgo** `4.0.0 - 4.0.1` (transitive) — `removeScripts` plugin leaves some executable scripts intact (GHSA-2p49-hgcm-8545). Fix available.
- **undici** `7.0.0 - 7.27.2` (transitive) — seven advisories: TLS cert-validation bypass via SOCKS5 proxy, HTTP header injection via Set-Cookie percent-decoding, WebSocket DoS via fragment-count bypass, cross-origin request routing via proxy pool reuse, HTTP response queue poisoning via keep-alive reuse, Set-Cookie SameSite downgrade, cross-user cache-whitespace disclosure. Fix available.
- **vite** `7.0.0 - 7.3.3` (transitive) — NTLMv2 hash disclosure via UNC path handling on Windows (launch-editor), `server.fs.deny` bypass on Windows alternate paths (GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff). Fix available.
- **ws** `8.0.0 - 8.20.1` (transitive) — uninitialized memory disclosure, memory-exhaustion DoS from tiny fragments (GHSA-58qx-3vcg-4xpx, GHSA-96hv-2xvq-fx4p). Fix available.

#### MODERATE findings

- **@astrojs/language-server** `2.14.0 - 2.16.10` (transitive, via `volar-service-yaml`). Fix available.
- **@cloudflare/vite-plugin** (transitive, via `miniflare`, `wrangler`, `ws`). Fix available.
- **supabase** `1.1.6 - 2.98.2` (direct, via `tar`). Fix available.
- **volar-service-yaml** `<=0.0.70` (transitive, via `yaml-language-server`). Fix available.
- **wrangler** `<=0.0.0-kickoff-demo || 3.108.0 - 4.101.0` (direct, via `esbuild`, `miniflare`). Fix available.
- **yaml** `2.0.0 - 2.8.2` (transitive) — stack overflow via deeply nested YAML collections (GHSA-48c2-rrv3-qjmp). Fix available.
- **yaml-language-server** (transitive, via `yaml`). Fix available.

#### LOW / INFO findings

- **@babel/core** `<=7.29.0` (transitive) — arbitrary file read via `sourceMappingURL` comment (GHSA-4x5r-pxfx-6jf8). Fix available.
- **esbuild** `0.27.3 - 0.28.0` (transitive) — arbitrary file read via dev server on Windows (GHSA-g7r4-m6w7-qqqr). Fix available.

All findings report a fix available (`npm audit fix`); bootstrapper did not run it — see Next steps.

## Hints recorded but not acted on

| Hint                     | Value              |
| ------------------------ | ------------------- |
| bootstrapper_confidence  | first-class          |
| quality_override         | false                |
| path_taken               | standard             |
| self_check_answers       | null                 |
| team_size                | solo                 |
| deployment_target        | cloudflare-pages      |
| ci_provider              | github-actions        |
| ci_default_flow          | auto-deploy-on-merge  |
| has_auth                 | true                  |
| has_payments             | false                 |
| has_realtime             | false                 |
| has_ai                   | false                 |
| has_background_jobs      | false                 |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review `CLAUDE.md.scaffold` and `README.md.scaffold` against your existing `CLAUDE.md` / `README.md` and decide which content to keep or merge.
- Address audit findings per your project's risk tolerance — 22 advisories were found (1 CRITICAL, 12 HIGH, 7 MODERATE, 2 LOW), all with a fix available via `npm audit fix`.
