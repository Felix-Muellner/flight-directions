# MSFS 2024 Magnetic Heading Calculator

A minimalist, resource-efficient flight navigation utility with two input fields that accepts ICAO/IATA airport codes or geographic coordinates and calculates the initial magnetic heading for direct entry into Microsoft Flight Simulator 2024 aircraft autopilot (`HDG`) systems.

## User Review & Critical Decisions

> [!IMPORTANT]
> The application strictly adheres to the single-purpose minimalism requirement: it contains **only** the two location input fields (Origin and Destination) and the calculated Magnetic Heading readout, with no extraneous features, maps, or clutter.

- **Confirmed Decision 1 (Heading Calculation)**: Calculates the **initial magnetic heading** at the departure point (initial forward azimuth adjusted for local magnetic declination via the World Magnetic Model), formatted as a 3-digit autopilot heading (`001°`–`360°`).
- **Confirmed Decision 2 (Supported Input Formats)**: Both input fields accept **ICAO (4-letter)** codes, **IATA (3-letter)** codes, or **decimal/DMS coordinates** (e.g., `40.6413, -73.7781`).
- **Confirmed Decision 3 (Visual Theme)**: **Dark cockpit-friendly theme** designed for low-glare night flying alongside MSFS 2024.

---

## 1. Overview & Core Concept

- **What It Does**: Takes a departure point and arrival point (each entered as an ICAO code, IATA code, or latitude/longitude coordinate pair), resolves their coordinates, computes the initial true bearing and local magnetic variation at the origin, and outputs the exact 3-digit Magnetic Heading (`HDG`) required by standard MSFS 2024 autopilot panels.
- **Target Audience / Persona**: Microsoft Flight Simulator 2024 pilots seeking an instant, distraction-free magnetic heading readout without heavyweight flight planning suites.
- **Key Value**: Zero-bloat, instant calculation using pre-existing open-source geomagnetic and airport datasets.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Input Origin & Destination**: The user types an ICAO code (e.g., `KJFK`), IATA code (e.g., `JFK`), or coordinates (e.g., `40.6413, -73.7781`) into the **From** and **To** input fields.
  2. **Instant Resolution & Calculation**: As valid codes or coordinates are entered, the app resolves the locations against the existing airport dataset (or coordinate parser) and immediately displays the resolved location subtitle (e.g., airport name/coordinates) and the 3-digit **Magnetic Heading** in a crisp autopilot-style numeric readout.
  3. **Error / Unrecognized State**: If an input cannot be parsed as coordinates or matched to an airport code, a quiet inline text indicator informs the user without intrusive popups.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Avionics-grade minimalist utility—flat, low-glare dark surfaces with crisp 1px borders and high-legibility instrumentation typography.
  - *Color Palette & Mood*:
    - **60% Dominant Canvas**: Deep cockpit obsidian (`#07090E`).
    - **30% Structural Surfaces**: Matte instrument slate (`#111827`) with subtle `1px` borders (`#1E293B`) and muted slate labels (`#94A3B8`).
    - **10% Telemetry Accent**: Calibrated avionics amber/cyan (`#38BDF8` / `#F59E0B`) strictly for the primary magnetic heading readout and focus states.
  - *Typography & Hierarchy*:
    - **Interface Labels**: Clean geometric sans-serif (`Plus Jakarta Sans` / system sans).
    - **Numeric Readout & Inputs**: Dedicated tabular monospace (`JetBrains Mono` / `font-mono tabular-nums`) so heading digits (`001°`–`360°`) and coordinates align with zero layout jitter.
  - *Component Styling & Layout*: Single centered instrument console container on a full viewport canvas, featuring the two input fields and the primary magnetic heading display.

- **Interactive Feedback & Motion**:
  - Instantaneous zero-latency calculation as inputs change, with clean focus rings (`focus-visible`) and no unnecessary animations.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Pre-existing Airport Database Integration**
  - *Chosen Approach*: Load an established open-source global airport dataset from the web (`mwgg/Airports` / OurAirports indexed JSON via CDN/package) cached in memory on initialization.
  - *Why*: Eliminates manual airport database maintenance while covering ~29,000+ global airports by both ICAO and IATA codes with minimal memory footprint.
  - *Alternatives Considered*: Hardcoding a small list of airports (rejected by prompt constraints and lacks coverage) or querying a rate-limited paid aviation API (adds unnecessary key management and latency).

- **Decision 2: Magnetic Declination & Bearing Libraries**
  - *Chosen Approach*: Use the `geomagnetism` library (standard World Magnetic Model implementation) for magnetic declination at the origin coordinates and standard spherical trigonometry (`geodesy` / forward azimuth formula) for initial true bearing.
  - *Why*: Relies on proven pre-existing mathematical models rather than reinventing magnetic field approximations.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:
```
┌──────────────────────────────────────────────────────────────┐
│                 Minimalist Flight Heading App                │
│                                                              │
│  ┌─────────────────────────┐    ┌─────────────────────────┐  │
│  │   Origin Input Field    │    │ Destination Input Field │  │
│  │ (ICAO / IATA / Lat,Lon) │    │ (ICAO / IATA / Lat,Lon) │  │
│  └────────────┬────────────┘    └────────────┬────────────┘  │
│               └──────────────┬───────────────┘               │
│                              ▼                               │
│        ┌───────────────────────────────────────────┐         │
│        │         Location Resolver Utility         │         │
│        │  • Coordinate Parser (Decimal / DMS)      │         │
│        │  • Web Airport Dataset Lookup (ICAO/IATA) │         │
│        └─────────────────────┬─────────────────────┘         │
│                              ▼                               │
│        ┌───────────────────────────────────────────┐         │
│        │       Heading Calculation Engine          │         │
│        │  • Initial Forward Azimuth (True Bearing) │         │
│        │  • WMM Declination (`geomagnetism` pkg)   │         │
│        │  • 3-Digit Autopilot Normalization        │         │
│        └─────────────────────┬─────────────────────┘         │
│                              ▼                               │
│        ┌───────────────────────────────────────────┐         │
│        │      Autopilot Magnetic Heading Readout   │         │
│        │            e.g.  HDG  284°                │         │
│        └───────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `originInput` (`string`): Raw user text for departure.
  - `destinationInput` (`string`): Raw user text for arrival.
  - `airportData` (`Record<string, { lat: number; lon: number; name?: string }>`): Loaded asynchronously once from the public web dataset and indexed for $O(1)$ lookup by 4-letter ICAO or 3-letter IATA code.
  - `calculationResult`: Derived synchronously via `useMemo` from resolved origin and destination coordinates, containing `magneticHeading` (`001`–`360` formatted string), `trueBearing`, and `magneticDeclination`.

- **Interactive Component & State Mapping**:
  - Typing in either input field immediately runs the resolver: first checking if the string matches a coordinate pair (`lat, lon`), and otherwise looking up the normalized uppercase code in the loaded airport dictionary.
  - When both points resolve to valid `{ lat, lon }` coordinates, the `geomagnetism` model computes the local declination at the origin (`model.point([lat, lon]).decl`) and subtracts it from the initial true bearing (`(trueBearing - declination + 360) % 360`), rounding to the nearest integer degree (`001°`–`360°`, where `0°` is displayed as `360°` per standard MSFS autopilot convention).
