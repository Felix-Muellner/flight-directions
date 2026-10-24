# Flight Directions

A minimalist magnetic heading and distance calculator designed for Microsoft Flight Simulator 2024 (`MSFS 2024`) aircraft autopilot (`HDG`) systems.

## Features

- **Flexible Input Formats**: Accepts 4-letter ICAO airport codes (e.g., `KJFK`), 3-letter IATA airport codes (e.g., `JFK`), decimal coordinates (e.g., `40.6413, -73.7781`), or DMS coordinates (e.g., `40°38'28.7"N 73°46'41.2"W`).
- **Initial Magnetic Heading (`HDG`)**: Calculates the initial forward azimuth (`@turf/bearing`) and adjusts for local magnetic variation at the departure point using the World Magnetic Model (`geomagnetism`), outputting a standard 3-digit autopilot heading (`001°`–`360°`).
- **Route Telemetry**: Displays great-circle distance in nautical miles (`NM`) and kilometers (`km`) (`@turf/distance`), true initial bearing (`TRUE`), and local magnetic declination (`VAR`).
- **Global Airport Lookup**: Resolves ~29,000+ global airports directly from the open-source [`mwgg/Airports`](https://github.com/mwgg/Airports) dataset with $O(1)$ in-memory indexing.
- **Instant Route Reversal**: One-click swap button (`⇄`) to invert origin and destination and recompute the initial heading from the new departure point.
- **Cockpit-Friendly UI**: Low-glare dark interface with tabular monospace numerals designed for night flying.

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Geospatial & Magnetic Math**:
  - [`@turf/bearing`](https://turfjs.org/docs/api/bearing) — Initial true bearing calculation
  - [`@turf/distance`](https://turfjs.org/docs/api/distance) — Great-circle distance in NM and km
  - [`geomagnetism`](https://github.com/naturalatlas/geomagnetism) — World Magnetic Model (WMM) declination

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

Start the local development server on port `3000`:

```bash
npm run dev
```

### Production Build

Type-check and bundle the application for production:

```bash
npm run lint
npm run build
```

## License

Licensed under the [MIT License](./LICENSE.md). Copyright (c) 2026 Felix Müllner.
