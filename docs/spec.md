# Spec: Testable domain layer (Run M1)

- **Run branch:** `run/domain-layer`. Each issue gets its own branch and PR into this branch. At the end there is one PR into `main`.
- **Milestone:** `M1: Testable domain layer`
- **Status:** planned. Issues not yet created (see [Resume here](#resume-here)).

## Goal

All domain logic (coordinate parsing, airport lookup, heading/distance calculation)
currently lives unexported inside `src/App.tsx`, so it cannot be tested. This run
extracts it into pure, tested modules under `src/domain/`. `App.tsx` keeps only UI:
state, effects and JSX.

This is the prerequisite for the README roadmap item "Agentic Unit Testing".

## Why no backend / REST API

We considered splitting the project into a separate frontend and backend with a REST API, and decided against it for now:

- There are no secrets, no users, no shared or persisted state, and the computation is trivial
  (it runs in microseconds in the browser).
- A backend would add a second stack, hosting, CI and new failure modes (latency,
  CORS, outages) with no functional gain.
- REST *would* be the right style if a backend is ever justified: stateless, cacheable
  GET resources such as `GET /airports/{code}` and `GET /route?from=&to=`.
- A clean `src/domain/` layer keeps that option open, because the modules could later sit behind
  such an endpoint unchanged.

## Decisions

Agreed with the project owner:
- The app stays frontend-only. No backend in this run.
- **The refactor keeps behaviour 1:1.** Tests document the current behaviour. Every bug found
  during extraction becomes its own `fix:` issue with a reproducing test, and is not fixed
  inside the refactor PR.
- **Maths tests use independent reference values**, not snapshots of the current output:
  - declination (VAR): NOAA's official WMM calculator
  - bearing and distance: published great-circle references
  - each value has a tolerance (e.g. ±0.5°, ±1 NM) and its source cited in a test comment
  - edge cases: identical points, crossing the date line, near the poles, hemisphere signs

Made without asking (flag in the PRs):
- WMM declination depends on the date (`geomagnetism.model()` uses "now"). To make tests
  deterministic, the flight calculation takes an optional `date` (default: now). Runtime
  behaviour is unchanged.
- Fetching the airport list stays in `App.tsx` (`useEffect`). Only the pure part (raw
  JSON → `Map`) moves out, as `buildAirportIndex(data)`.

## Milestone M1 issues

Issue numbers are filled in once the issues are created.

### 1. `docs: add context.md glossary`
**Goal:** a shared vocabulary for code, tests and issues (CLAUDE.md §9).
- [ ] `context.md` proposed with candidate terms (origin, destination, location input,
      resolved location, airport index, autopilot heading (HDG), true bearing,
      magnetic declination (VAR), distance NM/km), and approved by the owner before it is written
- [ ] Issue numbers filled into this spec

TDD exemption: docs.

### 2. `refactor: extract coordinate parsing into src/domain/coordinates.ts`
Blocked by: #1
- [ ] `applyHemisphere`, `validateCoordinates`, `parseCoordinates` and their regexes move to
      `src/domain/coordinates.ts`. Shared types go to `src/domain/types.ts`
- [ ] `src/domain/coordinates.test.ts` covers: decimal input, N/S/E/W suffixes, DMS,
      out-of-range values, garbage input
- [ ] `App.tsx` imports the module, and its behaviour is unchanged

### 3. `refactor: extract airport index and location resolution into src/domain/airports.ts`
Blocked by: #2
- [ ] `buildAirportIndex(data)` (taken from the loop in `loadAirports` in `App.tsx`) and
      `resolveLocation` move to `src/domain/airports.ts`
- [ ] Tests use a small fixture: ICAO hit, IATA hit, not found, loading state, DB-error
      state, coordinates path
- [ ] The ICAO/IATA key-collision behaviour is documented by a test. If it is a bug, open a
      separate `fix:` issue

### 4. `refactor: extract flight calculation into src/domain/navigation.ts`
Blocked by: #1
- [ ] `calculateFlightData` moves to `src/domain/navigation.ts` with an optional `date`
- [ ] Tests compare against independent references (see Decisions) with tolerances and
      cited sources
- [ ] Edge cases covered: identical points, crossing the date line, near the poles, heading `000` → `360`

### Run-wide
- `src/smoke.test.ts` stays. No test is deleted.
- Verification for every issue: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`,
  `npm run secrets`, CI green, and the verifier sub-agent passed.
- Manual check: `npm run dev`, then KJFK→EGLL, `JFK`→`LHR`, decimal and DMS coordinates,
  the swap button, and an unknown code showing "Airport code not found".

## Backlog / Later

Not part of M1. Create as an issue with the label `backlog` and **no milestone**.

### `perf: reduce airport dataset download size`

```markdown
### Problem/Goal
On every page load the app downloads the full `mwgg/Airports` JSON (several MB)
from jsDelivr / raw.githubusercontent.com. This is slow on poor connections, wastes bandwidth,
and airport codes stop working when offline or when both URLs fail.

### Options to evaluate
- Build-time slim dataset: generate a JSON with only icao/iata/name/lat/lon and ship it
  with the app (no server needed)
- Browser cache (Cache API / IndexedDB) so the list is downloaded once
- Split the data (e.g. by first letter) and load only the part that is needed
- Small REST endpoint `GET /airports/{code}` (the only option that needs a backend)

### Acceptance Criteria
- [ ] Decision recorded in docs/spec.md, with a size/latency comparison
- [ ] Initial download size measurably reduced
- [ ] Airport lookup behaviour unchanged (covered by the tests from M1 #3)

Spec: docs/spec.md
Blocked by: M1 #3
```

## Resume here

For a fresh session (for example after rebuilding the codespace):

1. Read `CLAUDE.md`, then this file.
2. Check `gh auth status`. The GitHub CLI comes from `.devcontainer/devcontainer.json`.
   If it is missing, the codespace needs a rebuild.
3. Check `gh issue list` and `gh api repos/{owner}/{repo}/milestones` for duplicates.
4. Create the label `backlog`, the milestone `M1: Testable domain layer`, issues 1–4 (with the
   milestone) and the backlog issue (label only, no milestone).
5. Replace the placeholders "#1/#2" in this file with the real issue numbers, then commit and push.
6. Start issue 1 (the `context.md` proposal, which needs the owner's approval).
