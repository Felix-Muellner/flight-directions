# Flight Directions — Specification

Terms follow [`context.md`](../context.md).

## Purpose

A static web app that gives Microsoft Flight Simulator 2024 pilots the
**magnetic heading** to set in the autopilot `HDG` for a direct great-circle
route from an **origin** to a **destination**, plus **true bearing**,
**magnetic variation** and **distance**.

## Milestones

- **M1 Harden:** make the existing behaviour verifiable and correct. No new
  features except the safety rules below.
- **M1.5 Polish:** clear errors for invalid input, a validated **airport
  database**, display edge cases, magnetic model validity, remaining test
  gaps. Done before the app goes public. See
  [Milestone 1.5 requirements](#milestone-15-requirements).
- **M2 Snapshot and deploy:** **bundled snapshot**, **live update** in the
  browser, manual deployment to GitHub Pages. See
  [Milestone 2 requirements](#milestone-2-requirements).

Later milestones change some earlier rules; where they differ, the later
milestone wins.

## Milestone 1 requirements

### Structure

- Pure logic lives in modules outside `src/App.tsx`, importable by tests:
  coordinate parsing, location input resolution, route calculation, airport
  database loading.
- `src/App.tsx` contains only UI.
- The magnetic model date and the airport database loader are injectable so
  tests are deterministic and offline. The app uses the current date.

### Location input

Each **location input** is trimmed and resolved in this order:

1. **Coordinates** (latitude first, then longitude, separated by whitespace,
   `,` or `;`):
   - Decimal degrees, optionally signed, optionally followed by a hemisphere
     letter (`N`/`S`, `E`/`W`, any case), optional `°`.
     Examples: `40.6413, -73.7781`, `40.6413 N 73.7781 W`.
   - DMS with mandatory hemisphere letters.
     Example: `40°38'28.7"N 73°46'41.2"W`.
2. **Airport code**: 3–4 letters or digits, case-insensitive, looked up in the
   **airport database** by ICAO code (4 characters) or IATA code (3 characters).

Invalid coordinates, which are never treated as an airport code:

- A sign that contradicts the hemisphere letter (`-40.5 N`, `73.7 E` with
  `-`). A redundant matching sign (`-40.5 S`) is accepted.
- DMS minutes ≥ 60 or seconds ≥ 60.
- Latitude outside ±90° or longitude outside ±180°, checked after DMS
  conversion (`90°00'01"N` is invalid).

Status line under each field:

| Situation | Status |
|---|---|
| Empty | *(empty)* |
| Valid coordinates | `lat°, lon°` with 4 decimals |
| Airport found | `ICAO / IATA · Name` (or `ICAO · Name` without IATA) |
| Airport code, database loading | `Loading airport database...` |
| Airport code, database failed | `Airport database offline` |
| Airport code not in database | `Airport code not found` |
| Anything else | `Enter ICAO, IATA, or lat, lon` |

If two airports share an IATA code, the input resolves to neither and the
status is `Airport code not found`. ICAO lookup takes precedence over IATA.

Out of scope for milestone 1: decimal-minutes format (`40°38.5'N`), DMS
without hemisphere letters, longitude-first input, airport name search.

### Route calculation

Given a resolved origin and destination:

- **Earth model:** sphere with mean radius 6,371.0088 km; 1 NM = 1.852 km.
- **Distance:** great-circle distance, shown in NM and km, rounded to whole
  units with thousands separators.
- **True bearing:** initial great-circle bearing at the origin, 0–360°,
  shown with one decimal, zero-padded (`051.4°`).
- **Magnetic variation:** WMM2025 at the origin for the current date, shown
  as `x.x° E` or `x.x° W` (east positive).
- **Magnetic heading:** true bearing minus magnetic variation, normalised to
  0–360, rounded to the nearest degree, shown as three digits `001`–`360`
  (0 is shown as `360`).

### Degenerate routes

`MIN_ROUTE_DISTANCE_NM = 1` (one named constant). The message appears in a status line below
the route values.

| Case | HDG | TRUE | VAR | DIST | Message |
|---|---|---|---|---|---|
| Identical coordinates | `---°` | `---.-°` | shown | shown | `Origin and destination are the same point` |
| Distance < 1 NM | `---°` | `---.-°` | shown | shown | `Origin and destination too close (< 1 NM)` |
| Within 1 NM of antipodal | `---°` | `---.-°` | shown | shown | `Route direction undefined (antipodal points)` |

### Magnetic pole zones

Judged at the origin from the WMM horizontal field strength `H`:

| Zone | Condition | HDG | Message |
|---|---|---|---|
| Blackout zone | H < 2,000 nT | `---°` | `Magnetic heading unreliable near magnetic pole` |
| Caution zone | 2,000 ≤ H < 6,000 nT | shown | `Near magnetic pole` |

TRUE, VAR and DIST stay visible in both zones.
A degenerate route takes precedence: its message replaces the zone message.
Thresholds follow NOAA's WMM definitions; the zone message uses the same
status line as degenerate routes.

### Airport database

- Fetched at runtime from `mwgg/Airports`, pinned to commit
  `a89e4e0dda9d9878337e2da190ebe1ef1d6af705`, via jsDelivr with
  `raw.githubusercontent.com` as fallback.
- Entries without numeric `lat`/`lon` are ignored.
- Tests use a small checked-in fixture, never the network.

### Verification

Expected values come from published or independently calculated sources,
never from the current code's output:

- Magnetic variation: NOAA WMM2025 official test values (fixed dates and
  locations), tolerance 0.1°.
- True bearing and distance: independently calculated reference pairs on
  the spherical earth model (e.g. KJFK→EGLL ≈ 2,991 NM), using the standard
  haversine and forward-azimuth formulas; tolerance 0.1° and 1 NM.
- Magnetic heading: edge cases for rounding, `0 → 360`, wrap near north, and
  east/west variation.
- Component tests (React Testing Library + jsdom, airport database stubbed):
  roughly one test per visible state, including swap.

## Milestone 1.5 requirements

### Invalid location input

The status line names the specific problem. This replaces the milestone 1
status table for the rows below; the other rows are unchanged.

| Situation | Status | Style |
|---|---|---|
| Sign contradicts hemisphere letter (`-48.2 N`) | `Sign contradicts hemisphere letter` | error |
| DMS minutes or seconds ≥ 60 | `Minutes and seconds must be below 60` | error |
| Latitude outside ±90° | `Latitude must be between 90° S and 90° N` | error |
| Longitude outside ±180° | `Longitude must be between 180° W and 180° E` | error |
| Airport code not in database | `Airport code not found` | error |
| Airport database failed | `Airport database offline` | warning |
| Anything else (`3f8jg9f8j`) | `Enter ICAO, IATA, or lat, lon` | error |

- If several problems apply, the first in table order is shown.
- **Error style:** red field border, red status text, `aria-invalid="true"`.
  **Warning style:** neutral warning colour, no `aria-invalid`.
- The status text updates live while typing. The error style appears only
  after the field loses focus, and disappears as soon as the input becomes
  valid or empty.

### Airport database validation

Every entry is checked before use; invalid entries are skipped, the rest of
the database stays usable:

- `icao`: string of exactly 4 letters or digits.
- `iata`: string of exactly 3 letters or digits, or empty/missing.
- `lat`: number from −90 to 90. `lon`: number from −180 to 180. Both present.
- `name`: string.

### Display edge cases

- **True bearing:** a value that rounds to `0.0` is shown as `360.0°`, so the
  range is `000.1°`–`360.0°`, matching the magnetic heading convention.
- **Magnetic variation:** a value that rounds to `0.0` is shown as `0.0°`
  without `E` or `W`.

### Magnetic model validity

- WMM2025 is valid from 2025-01-01 to 2029-12-31.
- Outside that range all values stay visible, and the route status line shows
  `Magnetic model expired (WMM2025) – variation may be inaccurate`.
- Only one route message is shown. Precedence: degenerate route > blackout
  zone > model expired > caution zone.
- The current date is read for every calculation, not once at app load.
- Updating to WMM2030 is out of scope.

### Tests and tooling

- Tests pin the coordinate pattern anchors and whitespace handling (e.g.
  `abc 48.2, 14.0` is not coordinates), the exact 1.00 NM boundary (1.00 NM is
  a valid route), the airport validation rules above, and dates just inside
  and outside the model validity range.
- TypeScript `strict` is set explicitly in `tsconfig.json`.

## Milestone 2 requirements

### Bundled snapshot

- The repo stores the `mwgg/Airports` commit and the SHA-256 of its
  `airports.json` side by side.
- The build downloads that file, checks the SHA-256 and **fails** on a
  mismatch, applies the [validation rules](#airport-database-validation), and
  fails if more than 1% of entries are invalid.
- It keeps only `icao`, `iata`, `name`, `lat`, `lon` and ships the result as a
  separate static asset served from the same site. The app no longer fetches
  the airport database from jsDelivr.
- If the snapshot cannot be loaded, the status is `Airport database offline`
  (including HTTP errors such as 404).

### Live update

- **When:** automatically on every app start, and when the user presses
  **Check for updates**.
- **Source:** the latest `airports.json` on `mwgg/Airports` `master`, from
  `raw.githubusercontent.com` only.
- **Checks**, all of which must pass or the whole update is rejected:
  1. The [validation rules](#airport-database-validation); more than 1% invalid
     entries rejects the update.
  2. The number of valid airports is at most 5% lower than in the data in use.
  3. At most 1% of airports present in both versions move by more than 1 NM.
- **Result:** an accepted update is stored in IndexedDB with its commit and
  commit date, and is used immediately. On later starts the newer of the
  stored update and the bundled snapshot is used.
- **Failure** of any kind (network, checks, storage) keeps the data in use.
- **Trust limit:** these checks catch broken, truncated or mass-corrupted
  files. They do not catch a deliberate change to a single airport upstream;
  for updates we trust the `mwgg/Airports` maintainers and GitHub. The README
  says so.

### Footer

- `Airport data: mwgg/Airports (MIT) · YYYY-MM-DD`: the source links to the
  repository, the licence to its licence text, the date is the commit date of
  the data in use.
- A **Check for updates** button, disabled while a check runs.
- Update status after a check: `Checking for updates…`, `Updated just now`
  (then `Updated n min ago`), `Already up to date`, or
  `Update failed – keeping current data`.

### Deployment

- A GitHub Actions workflow deploys to GitHub Pages, started **manually**
  (`workflow_dispatch`) on `main`. It builds, runs tests, lint, typecheck and
  the secret scan, and deploys only if all pass.
- The repository owner enables Pages once (Settings → Pages → Source: GitHub
  Actions).
- The gitleaks binary used by the secret scan is checked against a pinned
  SHA-256 before it runs.

### Out of scope for milestone 2

- Deployment to a homelab (its own later milestone).
- Updates that only use snapshots reviewed in this repository.

## Decisions made without asking

The owner set the priority for data sources (free, legal, open source) and
left the mechanics to the agent:

- `mwgg/Airports` stays the source; it is MIT-licensed and maintained.
- The live update takes the latest `master`, not a reviewed snapshot.
- An accepted update is used immediately, not from the next start.
- Footer and status wording, the "first problem in table order" rule, and the
  relative "n min ago" time.
