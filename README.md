# Flight Directions

> [!WARNING]
> **Verification Sandbox:** This repository currently contains unverified, AI-generated baseline code (created via Google AI Studio). It is explicitly published in this raw state to serve as a foundational sandbox for my active studies in software verification, CI/CD automation, and agentic workflows. 

## Verification Roadmap (In Progress)
- [ ] **Sandboxed Environment:** Provision a GitHub Codespace for secure, reproducible execution.
- [x] **Build & Execution:** Reverse-engineer the generated configuration to successfully compile and run the application outside of the AI Studio preview environment.
- [ ] **Agentic Unit Testing:** Deploy a terminal-based AI agent to write automated tests (Vitest) mathematically proving the core `geomagnetism` and `turf` routing logic.
- [x] **CI/CD Pipeline:** Configure GitHub Actions to automatically enforce tests on every commit.
- [ ] **Production Deployment:** Establish an automated release pipeline to deploy the verified, compiled application to a public cloud provider.

## Development

Requires Node.js 22.12+ and npm 10.9+ (enforced on install; pnpm, yarn and Bun are not supported).

```bash
npm ci               # install exact dependencies from package-lock.json
npm run dev          # dev server on http://localhost:3000
npm test             # run tests (Vitest)
npm run lint         # lint + format check (Biome); fix with: npm run format
npm run typecheck    # TypeScript check
npm run build        # production build to dist/
npm run secrets      # secret scan (gitleaks, downloaded to .tools/ on first run)
```

---

## Baseline Application Details

> **Note:** The domain-specific aviation mathematics in this application (such as azimuth calculations, great-circle distance, and the World Magnetic Model) were generated entirely by the AI, reinforcing the strict necessity of automated testing to mathematically verify this black-box logic.

A minimalist magnetic heading and distance calculator designed for Microsoft Flight Simulator 2024 (`MSFS 2024`) aircraft autopilot (`HDG`) systems.

### Features
- **Flexible Input Formats**: Accepts 4-letter ICAO airport codes (e.g., `KJFK`), 3-letter IATA airport codes (e.g., `JFK`), decimal coordinates (e.g., `40.6413, -73.7781`).
- **Magnetic Heading (`HDG`)**: Initial great-circle true bearing corrected by the magnetic variation at the origin (World Magnetic Model 2025), shown as three digits (`001`–`360`) for the autopilot `HDG`.
- **Route Telemetry**: Displays great-circle distance in nautical miles (`NM`) and kilometers (`km`), true bearing (`TRUE`), and magnetic variation at the origin (`VAR`).
- **Safety Rules**: Invalid coordinates are rejected; no magnetic heading is shown for identical, too-close (< 1 NM) or antipodal points, or in the blackout zone near a magnetic pole. Details: [`docs/spec.md`](docs/spec.md).
- **Global Airport Lookup**: The prompt included a restriction to not hardcode airports and use free open sources instead. The airport database ([mwgg/Airports](https://github.com/mwgg/Airports)) is fetched at runtime, pinned to a fixed commit.