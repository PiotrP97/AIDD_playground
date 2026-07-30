---
name: commit
description: Create a git commit whose subject line is prefixed based on the current branch — no prefix on main/master, [FIX] on fix/fixup branches, [FEATURE] on feature branches. Flags a mismatch between the branch's category and the actual change for user confirmation, and never pushes without an explicit separate request. Trigger phrases — "/commit", "commit this", "zrób commit", "zacommituj zmiany".
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
---

# /commit — Branch-aware commit

Wraps a normal git commit with one piece of project convention: the subject line gets a prefix derived from the current branch's naming category. The skill never decides silently when the branch and the diff disagree about what kind of change this is — it asks. It never pushes.

## When to trigger

The user invokes `/commit`, or asks in natural language to commit the current changes.

## When to skip

- The working tree is clean (nothing staged, nothing modified, no relevant untracked files) — report that and stop, don't create an empty commit.
- The user is asking to push, open a PR, or amend a previous commit — those are separate actions. This skill only covers the commit step; see Step 6 for why it never pushes on its own.

## Workflow

### Step 1 — Gather state

Run in parallel:

- `git status` (never `-uall`)
- `git diff` and `git diff --cached` (unstaged and staged changes)
- `git branch --show-current`
- `git log -n 5 --oneline` (existing commit-message style to match)

If there is nothing to commit, tell the user and stop here.

### Step 2 — Resolve the branch category and prefix

Match the current branch name, in this order:

1. Branch is exactly `main` or `master` → **no prefix**.
2. Branch starts with `fix/`, `fix-`, `fixup/`, or `fixup-` → prefix is `[FIX]`. Requiring the separator avoids false positives like `fixture-branch`.
3. Branch starts with `feature/` or `feature-` → prefix is `[FEATURE]`.
4. Anything else (e.g. `chore/x`, `refactor/x`, `docs/x`) → ask the user via `AskUserQuestion` what prefix, if any, to use for this run. Don't guess, and don't silently extend this skill's rules — if the user wants a new standing rule, that's a separate ask to update this file.

### Step 3 — Detect a branch/change mismatch

Read the diff gathered in Step 1 and judge whether the change's nature matches the branch's category:

- On a `fix/*` / `fixup/*` branch: does the diff look like it introduces new functionality rather than fixing a bug?
- On a `feature/*` branch: does the diff look like a pure bug fix with no new capability?
- On `main`/`master`: structurally anything is allowed, but a large feature-shaped or breaking change committed straight to trunk is still worth surfacing, since committing directly to trunk is itself a meaningful choice.

If a mismatch looks plausible, stop and ask the user (`AskUserQuestion`) how to proceed. Offer at least:

- Commit to the current branch anyway (prefix follows the current branch's category from Step 2).
- Create a new branch that matches the change (propose a name, e.g. `fix/<slug>` or `feature/<slug>`, confirm with the user) and commit there instead.

Do not resolve this silently in either direction — this is exactly the kind of call that belongs to the user, per this skill's design.

### Step 4 — Draft the commit message

Match the repository's existing commit style from `git log`. Write 1-2 sentences focused on *why* the change was made, not *what* changed (the diff already shows that). Prepend the prefix resolved in Step 2 (`[FIX] `, `[FEATURE] `, or nothing) to the subject line.

### Step 5 — Stage and commit

- Stage the specific files relevant to this change by name — never a blind `git add -A` or `git add .`.
- Before committing, check whether anything about to be staged looks like it might carry secrets (`.env`, `credentials.json`, etc.); warn the user if so.
- Create the commit via a heredoc so multi-line messages are formatted correctly. Preserve whatever commit-trailer convention this environment already applies to assistant-authored commits (e.g. a `Co-Authored-By` line) — this skill only changes the subject-line prefix, it does not remove or replace existing trailer conventions.
- Run `git status` afterward to confirm the commit landed and report what, if anything, is still left uncommitted.

### Step 6 — Never push automatically

Once the commit is created, stop. Do **not** run `git push` (or anything that touches the remote) as part of this skill, regardless of what was discussed earlier in the conversation. Only push in direct response to an explicit, separate user instruction to push, given after the commit already exists.

### Step 7 — Show the commit message

Print the commit message that was actually used (full body, not just the subject line) back to the user, so they can see exactly what got committed.

## Guardrails

- Never `--amend` an existing commit; always create a new one (unless the user explicitly asks for `--amend`).
- Never `--no-verify` or otherwise bypass hooks. If a pre-commit hook fails, fix the underlying issue, re-stage, and create a new commit.
- Never invent a prefix for an unmatched branch name without asking (Step 2, case 4).
- Never push, force-push, open a PR, or touch any remote — that is out of scope for this skill entirely.
