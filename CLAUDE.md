# Agent Guidelines

The environment is disposable: anything not pushed to GitHub is lost.

My prompt may override this file, except Section 6. List every override under "Deviations" in the PR. If scope or intent is unclear, ask once, up front.

---

## 1. Setup (first run only — delete this section when done)

1. If the repo contains more than one stack or project, stop and ask.
2. Before the first commit, make sure `.gitignore` covers the stack and secrets. If anything already tracked should not be (secrets, build output), stop and tell me. Cleaning history is my decision.
3. Propose, together, and wait for my confirmation:
   - the commands for Section 2
   - `.devcontainer/devcontainer.json`: create it if missing, add the features the stack needs, keep GitHub CLI and the Claude Code install. After committing, tell me to rebuild the environment.
4. Run existing tests and report failures and suspicious tests. Do not fix or delete them; fixes become issues.
5. If tests, lint, typecheck, CI on PRs, secret scanning, or dependency audit are missing: propose one bootstrap plan, wait for confirmation, implement it in one PR. TDD is waived for it. No feature work until it is merged.
6. Delete this section and replace the placeholders in Section 2.

---

## 2. Project Commands

- **Build:** `{{BUILD_COMMAND}}`
- **Test:** `{{TEST_COMMAND}}`
- **Lint / Format:** `{{LINT_COMMAND}}`
- **Typecheck:** `{{TYPECHECK_COMMAND}}`
- **Secret scan:** `{{SECRET_SCAN_COMMAND}}`

---

## 3. Plan

1. **Grill session:** interview me one question at a time, each with your recommended answer, until we share the same picture. Do not build before this is done.
2. **Spec:** write it to `docs/spec.md`.
3. **Issues:** propose issues and milestones as vertical slices. Create nothing until I approve. After approval, work autonomously within this file.

Every behavior change needs an issue. Issue body: goal, acceptance criteria (checklist), link to the spec, `Blocked by: #n` if any.

**Glossary (`context.md`):** create it during the first grill session. Term, one-line definition, names to avoid; about one screen, no progress notes.
- Names in code, tests, docs, issues, and commits follow it.
- Add new entries yourself; changing or removing a definition needs my approval. Never invent definitions.

---

## 4. Build

- **Start of every session:** read `context.md`, then check open issues, PRs, and `run/...` branches and resume from there.
- **TDD** for every behavior change. Bug fixes start with a test that reproduces the bug.
  Exempt: docs, typos, formatting, config and dependency changes, spikes on `spike/...` branches (never merged).
- **Tests and CI:** never delete, skip, or loosen a test, or edit CI config, without flagging it in the PR. A test that changes because the requirement changed gets its own commit: `test(#n): <why>`.
- **Dev container:** when a new tool is needed, update `.devcontainer/` in the same PR.
- **Docs** change in the same PR as the code. Install and run instructions use only commands that were actually run. README stays short; longer material goes in `docs/`.
- **Naming:** branches `<type>/<issue>-<short-description>`, commits `<type>(#<issue>): <description>`.
- **Staging:** never `git add -A` or `git add .`; stage named paths.
- **Push after every green step.**
- **Stop and report** if CI fails or the verifier rejects twice on the same problem.

---

## 5. Finish

A PR is one meaningful, reviewable step. It may close several related issues (`Closes #12, closes #13`). How work is split into PRs and branches comes from my prompt; if unstated, open one PR into `main` and stop.

**Definition of Done** (checked by the verifier):
- Every acceptance criterion has a test that would fail without the change.
- Tests, lint, typecheck, and secret scan pass locally and in CI.
- No doc contradicts the diff. No second name for a term in `context.md`.
- The PR description lists: changed tests, TDD exemptions, new dependencies (with reason), decisions made without asking, terminology changes, docs touched, deviations.

**Verifier:** before you merge any PR yourself, a fresh sub-agent that sees only the acceptance criteria, the diff, and `context.md` must confirm the Definition of Done.

**End of every run:** comment on each touched issue ("done, PR #n" or "stopped because ..."), check `context.md` against the code, and list docs you suspect are outdated.

---

## 6. Boundaries (cannot be overridden)

**Never:**
- Read, print, create, or commit secrets. If a credential is needed, tell me.
- Commit to or merge into `main`.
- Change repo or account settings.
- Force-push, rewrite history, or delete branches you did not create.

**Ask first:**
- Sign-ups, paid API calls, deploys, sending emails or messages.
- Global installs or touching files outside the project.
- Obscure or unmaintained dependencies.
- Anything that changes the shape of the work.

**Small spec gaps:** choose the most conservative option, note it in the PR, continue.
