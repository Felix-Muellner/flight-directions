# Flight Directions — Specification

Terms follow [`context.md`](../context.md).

## Purpose

A static web app that gives Microsoft Flight Simulator 2024 pilots the
**magnetic heading** to set in the autopilot `HDG` for a direct great-circle
route from an **origin** to a **destination**, plus **true bearing**,
**magnetic variation** and **distance**.

## Milestones

1. **Harden:** make the existing behaviour verifiable and correct. No new
   features except the safety rules below.
2. **Snapshot and deploy:** bundled **airport database** snapshot, live updates
   in the browser, deployment to GitHub Pages. Specified in detail before it
   starts; see [Milestone 2 outline](#milestone-2-outline).

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

## Milestone 2 outline

- Build step downloads a pinned `airports.json`, trims it to `icao`, `iata`,
  `name`, `lat`, `lon`, and ships it as a separate static asset.
- On every app start, the browser checks GitHub for a newer `airports.json`,
  validates it, and stores it in IndexedDB. Any failure keeps the current data.
- Deploy as a static site to GitHub Pages; later also to a homelab. No server
  component.
