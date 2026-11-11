# Flight Directions

[![CI](https://github.com/Felix-Muellner/flight-directions/actions/workflows/ci.yml/badge.svg)](https://github.com/Felix-Muellner/flight-directions/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)

Magnetic heading and distance calculator for Microsoft Flight Simulator 2024.
Enter an origin and a destination and get the magnetic heading to set in the
autopilot `HDG`.

## Features

- **Location input:** ICAO code (`KJFK`), IATA code (`JFK`) or coordinates —
  decimal (`40.6413, -73.7781`, `40.6413 N 73.7781 W`) or DMS
  (`40°38'28.7"N 73°46'41.2"W`).
- **Magnetic heading:** initial great-circle true bearing corrected by the
  magnetic variation at the origin (World Magnetic Model 2025), shown as
  `001`–`360`.
- **Route values:** distance in NM and km, true bearing, magnetic variation.
- **Safety rules:** invalid coordinates are rejected; no magnetic heading for
  identical, too-close (< 1 NM) or antipodal points, or in the blackout zone
  near a magnetic pole; a warning in the caution zone.
- **Airport database:** [mwgg/Airports](https://github.com/mwgg/Airports),
  loaded at runtime from a pinned commit, with a fallback source.

Full behaviour: [`docs/spec.md`](docs/spec.md).

## How it was built

This started as an AI-generated prototype (Google AI Studio).
I then hardened it with Claude Code, using a spec-first, test-first workflow:
- **Spec first:** behaviour is written down in [`docs/spec.md`](docs/spec.md),
  terms in [`context.md`](context.md); every behaviour change has an issue.
- **Tests first:** magnetic variation is checked against NOAA's official
  WMM2025 test values, true bearing and distance against independently
  calculated routes.
- **CI on every pull request:** lint, typecheck, tests, build, dependency
  audit and secret scan.
- **AI agent under written rules:** I work with Claude Code; the rules it
  follows are in [`CLAUDE.md`](CLAUDE.md).

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS · Vitest · Biome · GitHub Actions

## Development

Requires Node.js 22.12+ and npm 10.9+. A dev container is included (GitHub
Codespaces or VS Code Dev Containers).

```bash
npm ci               # install exact dependencies from package-lock.json
npm run dev          # dev server on http://localhost:3000
npm test             # run tests (Vitest)
npm run lint         # lint + format check (Biome); fix with: npm run format
npm run typecheck    # TypeScript check
npm run build        # production build to dist/
npm run secrets      # secret scan (gitleaks, downloaded to .tools/ on first run)
```

## Status

- **Milestone 1 — Harden:** done.
- **Milestone 2 — Snapshot and deploy:** next (bundled airport database, live
  demo on GitHub Pages).

## License

[MIT](LICENSE.md)
