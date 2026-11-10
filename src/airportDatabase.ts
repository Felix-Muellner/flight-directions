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

const AIRPORT_DATABASE_URLS = [
  'https://cdn.jsdelivr.net/gh/mwgg/Airports@master/airports.json',
  'https://raw.githubusercontent.com/mwgg/Airports/master/airports.json',
] as const;

export function buildAirportDatabase(
  data: Record<string, AirportEntry>,
): AirportDatabase {
  const database = new Map<string, AirportEntry>();

  for (const entry of Object.values(data)) {
    if (
      entry &&
      typeof entry.lat === 'number' &&
      typeof entry.lon === 'number'
    ) {
      if (entry.icao) {
        database.set(entry.icao.toUpperCase(), entry);
      }
      if (entry.iata && entry.iata.length === 3) {
        database.set(entry.iata.toUpperCase(), entry);
      }
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
