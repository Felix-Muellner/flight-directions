# Flight Directions

> [!WARNING]
> **Verification Sandbox:** This repository currently contains unverified, AI-generated baseline code (created via Google AI Studio). It is explicitly published in this raw state to serve as a foundational sandbox for my active studies in software verification, CI/CD automation, and agentic workflows. 

## Verification Roadmap (In Progress)
- [ ] **Sandboxed Environment:** Provision a GitHub Codespace for secure, reproducible execution.
- [ ] **Build & Execution:** Reverse-engineer the generated configuration to successfully compile and run the application outside of the AI Studio preview environment.
- [ ] **Agentic Unit Testing:** Deploy a terminal-based AI agent to write automated tests (Vitest) mathematically proving the core `geomagnetism` and `turf` routing logic.
- [ ] **CI/CD Pipeline:** Configure GitHub Actions to automatically enforce tests on every commit.
- [ ] **Production Deployment:** Establish an automated release pipeline to deploy the verified, compiled application to a public cloud provider.

---

## Baseline Application Details

> **Note:** The domain-specific aviation mathematics in this application (such as azimuth calculations, great-circle distance, and the World Magnetic Model) were generated entirely by the AI, reinforcing the strict necessity of automated testing to mathematically verify this black-box logic.

A minimalist magnetic heading and distance calculator designed for Microsoft Flight Simulator 2024 (`MSFS 2024`) aircraft autopilot (`HDG`) systems.

### Features
- **Flexible Input Formats**: Accepts 4-letter ICAO airport codes (e.g., `KJFK`), 3-letter IATA airport codes (e.g., `JFK`), decimal coordinates (e.g., `40.6413, -73.7781`).
- **Initial Magnetic Heading (`HDG`)**: Calculates the initial forward azimuth and adjusts for local magnetic variation at the departure point using the World Magnetic Model, outputting a standard 3-digit autopilot heading.
- **Route Telemetry**: Displays great-circle distance in nautical miles (`NM`) and kilometers (`km`), true initial bearing (`TRUE`), and local magnetic declination (`VAR`).
- **Global Airport Lookup**: The prompt included a restriction to not hardcode an airport list and use free open sources instead.