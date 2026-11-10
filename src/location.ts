import type { AirportDatabase } from './airportDatabase.ts';
import { type Coordinates, parseCoordinates } from './coordinates.ts';

export interface ResolvedLocation {
  point: Coordinates | null;
  status: string;
}

const AIRPORT_CODE_REGEX = /^[A-Z0-9]{3,4}$/;

/** Resolves a location input to coordinates and a status line. */
export function resolveLocation(
  raw: string,
  airportDatabase: AirportDatabase | null,
  hasAirportDatabaseError: boolean,
): ResolvedLocation {
  const trimmed = raw.trim();
  if (!trimmed) return { point: null, status: '' };

  const coords = parseCoordinates(trimmed);
  if (coords) {
    return {
      point: coords,
      status: `${coords.lat.toFixed(4)}°, ${coords.lon.toFixed(4)}°`,
    };
  }

  const code = trimmed.toUpperCase();
  if (AIRPORT_CODE_REGEX.test(code)) {
    if (!airportDatabase) {
      return {
        point: null,
        status: hasAirportDatabaseError
          ? 'Airport database offline'
          : 'Loading airport database...',
      };
    }

    const airport = airportDatabase.get(code);
    if (airport) {
      const codeDisplay = airport.iata
        ? `${airport.icao} / ${airport.iata}`
        : airport.icao;
      return {
        point: { lat: airport.lat, lon: airport.lon },
        status: `${codeDisplay} · ${airport.name}`,
      };
    }

    return { point: null, status: 'Airport code not found' };
  }

  return { point: null, status: 'Enter ICAO, IATA, or lat, lon' };
}
