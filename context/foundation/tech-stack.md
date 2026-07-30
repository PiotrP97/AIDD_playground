---
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
---

## Why this stack

TrainSpotter is a solo, after-hours MVP with a 3-week timeline that requires login (email/password or OAuth, FR-011), a relational data model for rolling-stock types, stations, sightings, and ratings, and a public read-only surface for visitors — all of which the recommended `(web, js)` default, Astro+Supabase+Cloudflare, ships out of the box via Supabase's Postgres + auth SDK. The short timeline and solo team favor a battle-tested, agent-friendly starter over a from-scratch assembly, and this card clears all four agent-friendly gates. No payments, realtime, AI/LLM, or background-job features are in scope per the PRD's functional requirements and non-goals, so those flags are false. Deployment stays on the starter's own default, Cloudflare Pages, and CI runs on GitHub Actions with auto-deploy-on-merge — the standard low-friction shape for a solo after-hours project.
