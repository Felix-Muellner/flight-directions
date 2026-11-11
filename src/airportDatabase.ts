export interface AirportEntry {
  icao: string;
  iata?: string;
  name: string;
  lat: number;
  lon: number;
}

/** Airport entries keyed by upper-case ICAO and IATA code. */
export type AirportDatabase = ReadonlyMap<string, AirportEntry>;

export type AirportDatabaseLoader = (
  signal: AbortSignal,
) => Promise<AirportDatabase>;

/** mwgg/Airports commit the airport database is pinned to. */
export const AIRPORT_DATABASE_COMMIT =
  'a89e4e0dda9d9878337e2da190ebe1ef1d6af705';

const AIRPORT_DATABASE_URLS = [
  `https://cdn.jsdelivr.net/gh/mwgg/Airports@${AIRPORT_DATABASE_COMMIT}/airports.json`,
  `https://raw.githubusercontent.com/mwgg/Airports/${AIRPORT_DATABASE_COMMIT}/airports.json`,
] as const;

const ICAO_PATTERN = /^[A-Za-z0-9]{4}$/;
const IATA_PATTERN = /^[A-Za-z0-9]{3}$/;

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
 * Fetches the airport database, trying each URL in turn.
 * Rejects if every URL fails or the signal aborts.
 */
export async function loadAirportDatabase(
  signal: AbortSignal,
  fetchFn: typeof fetch = fetch,
): Promise<AirportDatabase> {
  for (const url of AIRPORT_DATABASE_URLS) {
    try {
      const response = await fetchFn(url, { signal });
      if (!response.ok) continue;
      const data: unknown = await response.json();
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        continue;
      }
      return buildAirportDatabase(data as Record<string, unknown>);
    } catch (err) {
      if (signal.aborted) throw err;
    }
  }

  throw new Error('Airport database unavailable from all sources');
}
