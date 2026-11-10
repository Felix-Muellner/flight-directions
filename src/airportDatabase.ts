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

/**
 * Indexes airports by upper-case ICAO and IATA code.
 * Entries without numeric lat/lon are skipped. ICAO codes take precedence
 * over IATA codes; an IATA code shared by several airports is left out.
 */
export function buildAirportDatabase(
  data: Record<string, AirportEntry>,
): AirportDatabase {
  const entries = Object.values(data).filter(
    (entry) =>
      entry && typeof entry.lat === 'number' && typeof entry.lon === 'number',
  );

  const database = new Map<string, AirportEntry>();
  for (const entry of entries) {
    if (entry.icao) database.set(entry.icao.toUpperCase(), entry);
  }

  const byIata = new Map<string, AirportEntry[]>();
  for (const entry of entries) {
    if (entry.iata?.length !== 3) continue;
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
      const data: Record<string, AirportEntry> = await response.json();
      return buildAirportDatabase(data);
    } catch (err) {
      if (signal.aborted) throw err;
    }
  }

  throw new Error('Airport database unavailable from all sources');
}
