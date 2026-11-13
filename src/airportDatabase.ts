export interface AirportEntry {
  icao: string;
  iata?: string;
  name: string;
  lat: number;
  lon: number;
}

/** Airport entries keyed by upper-case ICAO and IATA code. */
export type AirportDatabase = ReadonlyMap<string, AirportEntry>;

/** Where loading the airport database stands. */
export type AirportDatabaseState =
  | { kind: 'loading' }
  | { kind: 'loaded'; database: AirportDatabase }
  | { kind: 'failed' };

export type AirportDatabaseLoader = (
  signal: AbortSignal,
) => Promise<AirportDatabase>;

/** Commit date of the mwgg/Airports commit the bundled snapshot comes from. */
export const BUNDLED_SNAPSHOT_DATE = '2026-10-01';

/** The bundled snapshot, served from the same site as the app. */
const BUNDLED_SNAPSHOT_URL = `${import.meta.env.BASE_URL}airports.json`;

export const ICAO_PATTERN = /^[A-Za-z0-9]{4}$/;
export const IATA_PATTERN = /^[A-Za-z0-9]{3}$/;

function isInRange(value: unknown, limit: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= -limit &&
    value <= limit
  );
}

/**
 * Checks one airport database entry against the validation rules in the spec
 * (codes, coordinate ranges, name).
 */
export function isValidAirportEntry(entry: unknown): entry is AirportEntry {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return false;
  }
  const { icao, iata, name, lat, lon } = entry as Record<string, unknown>;
  return (
    typeof icao === 'string' &&
    ICAO_PATTERN.test(icao) &&
    (iata === undefined ||
      iata === '' ||
      (typeof iata === 'string' && IATA_PATTERN.test(iata))) &&
    typeof name === 'string' &&
    isInRange(lat, 90) &&
    isInRange(lon, 180)
  );
}

/**
 * Indexes valid airports by upper-case ICAO and IATA code; invalid entries
 * are skipped. ICAO codes take precedence over IATA codes; an IATA code
 * shared by several airports is left out.
 */
export function buildAirportDatabase(
  data: Record<string, unknown>,
): AirportDatabase {
  const entries = Object.values(data).filter(isValidAirportEntry);

  const database = new Map<string, AirportEntry>();
  for (const entry of entries) {
    database.set(entry.icao.toUpperCase(), entry);
  }

  const byIata = new Map<string, AirportEntry[]>();
  for (const entry of entries) {
    if (!entry.iata) continue;
    const iata = entry.iata.toUpperCase();
    byIata.set(iata, [...(byIata.get(iata) ?? []), entry]);
  }
  for (const [iata, airports] of byIata) {
    if (airports.length === 1 && !database.has(iata)) {
      database.set(iata, airports[0]);
    }
  }

  return database;
}

/**
 * Loads the bundled snapshot and builds the airport database from it.
 * Rejects on network or HTTP errors, on JSON that is not an object, or if
 * the signal aborts.
 */
export async function loadAirportDatabase(
  signal: AbortSignal,
  fetchFn: typeof fetch = fetch,
): Promise<AirportDatabase> {
  const response = await fetchFn(BUNDLED_SNAPSHOT_URL, { signal });
  if (!response.ok) {
    throw new Error(`Bundled snapshot unavailable: HTTP ${response.status}`);
  }
  const data: unknown = await response.json();
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('Bundled snapshot is not a JSON object');
  }
  return buildAirportDatabase(data as Record<string, unknown>);
}
