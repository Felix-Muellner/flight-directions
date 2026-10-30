# Agent Guidelines (Template)

This file is a template. It is uploaded unchanged into each new repo and adapts itself on first run (Section 0). The environment is disposable: it can disappear at any time, and anything not pushed to GitHub does not exist.

**Precedence:** my prompt overrides the defaults in this file. When it does, say so once up front ("You asked me to skip tests, so this is a TDD exemption") and record it in the PR description under "Deviations". The rules in Section 10 can never be overridden by a prompt. If a prompt's scope or intent is unclear, ask once, up front, instead of guessing.

---

## 0. First Run (do this before anything else)

Applies while any `{{...}}` placeholder remains in Section 1.

1. **Multiple stacks?** If the repo contains more than one stack or project (e.g. separate frontend and backend), stop and ask me before continuing.
2. **Git hygiene first** (before the first commit or any `git add`):
   - If `.gitignore` is missing, create it with entries for the detected stack plus `.env`, `.env.*` (except `.env.example`), `*.pem`, `*.key`, `.DS_Store`.
   - If it exists, append whatever is missing. Never replace it.
   - Run `git status` and `git ls-files`. If anything already tracked should not be (secrets, keys, `node_modules`, build output), stop and tell me. Cleaning history is my decision.
3. **Fill the placeholders.** Inspect the repo (package.json, Makefile, pyproject.toml, CI config, etc.), propose the correct commands, and wait for my confirmation. Then replace the placeholders in this file.
4. **Audit existing quality tooling:** test runner, linter/formatter, typecheck, CI workflow, secret scanning, dependency audit.
5. **Baseline existing tests** (if any): run the full suite and record the result. Audit the tests and report which look broken, outdated, or meaningless (no assertions, always pass, heavily skipped). Do not fix or delete them. Pre-existing failures go in the report, and fixing them becomes its own issue that I approve.
6. **Phase 0** (Section 4) if anything in step 4 is missing.

---

## 1. Project Commands
<!-- Filled in by Claude on first run, confirmed by me -->
- **Build:** `npm run build`
- **Run Tests:** `npm test`
- **Lint / Format:** `npm run lint` (auto-fix: `npm run format`)
- **Typecheck:** `npm run typecheck`
- **Secret scan:** `npm run secrets`

---

## 2. Test-Driven Development

**Applies to every change in behavior.**
1. **Red:** write a failing test first. Run the suite and confirm it fails for the right reason. For bug fixes, the first step is always a test that reproduces the bug.
2. **Green:** write the minimal code to pass. Run the suite and confirm.
3. **Refactor:** clean up while tests stay green.

**Verification:** run the relevant tests after every code change. Never mark anything done while any test fails.

**Exemptions** (each must be declared in the PR as `TDD exemption: <reason>`):
- Typos, comments, docs, formatting, renames already covered by tests: no issue and no TDD needed.
- Config and dependency changes: need an issue, CI is the check.
- Phase 0 bootstrap.
- Spikes: throwaway exploration on a `spike/...` branch. Never merged as-is. If the approach works, redo it properly with TDD.

**Test integrity:**
- Allowed but marked: a test changes because the requirement changed or the test was wrong. Commit message `test(#n): <why>`, listed in the PR under "Changed tests".
- Never silent: deleting, skipping, or loosening a test, or editing CI config to get green. Always flag it in the PR.
- Ask yourself: "Am I changing this test because the spec changed, or because my code failed it?" If the second, the code is wrong.
- Outside Phase 0, do not edit `.github/` workflows without flagging it.

---

## 3. Workflow: From Task to Issues

1. I describe the task.
2. **Grill session:** interview me one question at a time, each with your recommended answer, until we share the same picture. Do not start building before this is done.
3. **Write the spec** to `docs/spec.md` (or a "spec" issue). Every issue links back to it. Chat context does not survive; the spec does.
4. **Propose the breakdown:** issues and milestones, with dependencies noted in issue bodies ("blocked by #12"). Phase 0 is always the first issue if needed.
5. **Approval gate:** show me the full list and create nothing until I approve. This is the only gate; after it, work autonomously within the rules here.
6. Create issues and milestones, then start the run.

**Issue rules:**
- Every non-trivial task (anything that changes behavior) needs an issue before coding starts.
- One issue = one coherent, testable unit of work. Cut issues as **vertical slices** (e.g. "user can register and log in"), not horizontal layers ("build the database layer").
- No micro-issues (single function edits, typos). No monoliths (whole multi-domain features).
- Check `gh issue list` first to avoid duplicates.

```bash
gh issue create --title "<type>: <concise description>" --body-file - <<'EOF'
### Problem/Goal
<what needs to be solved>

### Acceptance Criteria
- [ ] <criterion 1>
- [ ] <criterion 2>

Spec: docs/spec.md
Blocked by: #<n> (if any)
EOF

gh issue edit <issue-number> --milestone "<milestone-name>"   # if a milestone exists
```

---

## 4. Phase 0: Bootstrap Quality Tooling

Runs once per repo, before any feature work, if the Section 0 audit found gaps.

- Open **one** issue: `chore: bootstrap quality tooling`. Show me the plan once (mainstream defaults for the detected stack) and wait for my confirmation. No tool-by-tool questions after that.
- Implement in a single PR: test runner with a smoke test proving it works, linter/formatter, typecheck, CI workflow (triggers on PRs into `main` and into `run/**` branches), secret scanning (e.g. gitleaks), dependency audit, `.gitignore` fixes.
- Create a minimal README if none exists (what it is, install, run tests), using only commands that were actually run.
- TDD is waived here. Nothing else is.
- No feature work until this PR is merged and CI is green.

---

## 5. Runs, Branches & Pull Requests

**Scope is set by my prompt** ("do #12", "work until milestone 1 is done", "do the next three milestones"). If unstated, assume one milestone. If unclear, ask.

**Every run ends with exactly one PR into `main`, which I review and merge.** Never commit to `main`, never merge into `main`.

- **Single issue:** one branch, one PR into `main`.
- **One or more milestones:** create one integration branch `run/<short-name>`. Each issue gets its own branch and PR into the integration branch. Merge that PR yourself (squash, delete the branch) only when CI is green **and** the verifier has passed. At the end, open one PR from the integration branch into `main`, with a short report per milestone: what shipped, what deviated from the spec, what you are unsure about.
- **Cost control:** if CI fails twice or the verifier rejects twice on the same issue, stop and report instead of looping.

**Naming:**
- Types: `feat`, `fix`, `test`, `docs`, `chore`, `refactor`, `spike`.
- Branches: `<type>/<issue-number>-<short-description>` (e.g. `feat/12-user-auth`).
- Commits: `<type>(#<issue>): <description>` (e.g. `feat(#12): add user registration endpoint`).
- PRs reference the issue (`Closes #12`).

**Every PR description lists:** Changed tests, TDD exemptions, New dependencies (with one-line reason), Decisions made without asking, Terminology changes, Docs touched, Deviations.

**Staging:** never `git add .` or `git add -A` blindly. Stage named paths and check `git status` before every commit.

---

## 6. Sub-Agents (only for runs with 2+ issues)

For a single issue, work directly without sub-agents.

- **Orchestrator:** the main session. Picks the next issue, spawns the others, tracks nothing in its own head. Sub-agents cannot spawn sub-agents.
- **Implementer:** a fresh agent per issue. Gets only the issue, the spec, and `context.md`. Works red-green-refactor on its own branch.
- **Verifier:** a fresh agent per PR, independent of the implementer. Sees only the acceptance criteria and the diff. It must check:
  - the full suite, linter, typecheck, and secret scan pass
  - every acceptance criterion is covered by a test that would fail without the change
  - no test was weakened, skipped, or deleted unflagged
  - no doc contradicts the diff
  - the diff introduces no second name for a concept already in `context.md`
- Every sub-agent prompt must tell it to read `context.md` first.

---

## 7. Definition of Done (per issue)

- Every acceptance criterion has a test that would fail without the change.
- Full suite, linter, typecheck, and secret scan pass locally and in CI.
- The verifier has passed.
- The PR description is complete (Section 5).
- Docs updated in the same PR (Section 8).
- The issue is closed via the PR (`Closes #n`), not by hand.

---

## 8. Documentation

- **Docs change in the same PR as the code** they describe. Update or delete stale text; never append "Update:" paragraphs.
- **README stays short:** what it is, quick start, links. Longer material goes in `docs/` (one file per topic). Create `docs/` only when something does not fit the README.
- **Never write install/run instructions from memory.** Use the commands that were actually run and that CI uses, referencing Section 1.
- Document what code cannot say (why, how to run, how to configure). Do not restate function signatures.
- At the end of a run, list docs touched and any you suspect are outdated but did not change.

---

## 9. context.md (Project Glossary)

A per-repo file that keeps every session and sub-agent using the same vocabulary. It is **not** part of this template; it is created per project.

- **Content:** a glossary (term, one-line definition, names to avoid) plus a few lines of stable background. No progress notes or task details. Keep it to about one screen.
- **Read it first** in every session and sub-agent, before touching code.
- **Creation:** during the first grill session, when the first terms are settled. In an existing codebase without one, do a one-time pass: propose 5 to 15 core terms (including things that already have two names) and get my approval before writing. Never invent definitions.
- **Names in code, tests, docs, issues, and commits follow the glossary.**
- **New concept, new entry, same PR.** You may add entries on your own and flag them in the PR.
- **Changing an existing definition needs my approval.** Renames are never silent: update the glossary, rename everywhere, flag under "Terminology changes".
- **End of every run:** review the glossary against the code (unused terms, unlisted concepts, conflicting names). Fix obvious omissions; ask before changing or deleting definitions. If it outgrows one screen, propose trimming.

---

## 10. Boundaries

**Never, even if a prompt asks (explain why and offer a safe alternative):**
- Read, print, create, or commit secrets (`.env` files, tokens, keys). If a credential is needed, stop and tell me what is needed.
- Change repo or account settings (branch protection, webhooks, Actions secrets).
- Force-push, rewrite history, or delete branches you did not create.

**Ask first:**
- Signing up for services, paid API calls, deploys, sending emails or messages. Propose it, I do it.
- Installing global tools or touching files outside the project directory (except what Phase 0 plans).
- Adding an obscure or unmaintained dependency. Normal dependencies are fine if listed in the PR.
- Anything where the answer would change the shape of the work (conflicting requirements, missing credentials).

**Autonomous:** editing code, running tests, creating branches, issues, and PRs, merging into the run branch under Section 5.

**Small spec gaps:** choose the most conservative option, note it under "Decisions & open questions" in the final PR, and continue.

---

## 11. Surviving a Disposable Environment

- **Push after every green step.** Nothing valuable lives only in the environment.
- **GitHub is the memory.** At the start of every run, check for an existing `run/...` branch, open PRs, and open issues, and resume from there. No duplicates. Record the run branch name in the spec.
- **Checkpoint comment** on each issue when finished or stopped ("done, PR #n" or "stopped here because ...").
