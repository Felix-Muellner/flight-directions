import type { AirportDatabase } from './airportDatabase.ts';
import {
  type CoordinateProblem,
  type Coordinates,
  checkCoordinates,
} from './coordinates.ts';

/** How the status line is styled: an input error, a warning, or neither. */
export type StatusSeverity = 'none' | 'warning' | 'error';

export interface ResolvedLocation {
  point: Coordinates | null;
  status: string;
  severity: StatusSeverity;
}

const COORDINATE_PROBLEM_MESSAGES: Record<CoordinateProblem, string> = {
  'sign-contradicts-hemisphere': 'Sign contradicts hemisphere letter',
  'minutes-or-seconds-too-large': 'Minutes and seconds must be below 60',
  'latitude-out-of-range': 'Latitude must be between 90° S and 90° N',
  'longitude-out-of-range': 'Longitude must be between 180° W and 180° E',
};

const AIRPORT_CODE_REGEX = /^[A-Z0-9]{3,4}$/;

/** Resolves a location input to coordinates and a status line. */
export function resolveLocation(
  raw: string,
  airportDatabase: AirportDatabase | null,
  hasAirportDatabaseError: boolean,
): ResolvedLocation {
  const trimmed = raw.trim();
  if (!trimmed) return { point: null, status: '', severity: 'none' };

  const coordinates = checkCoordinates(trimmed);
  if (coordinates.kind === 'valid') {
    const { lat, lon } = coordinates.point;
    return {
      point: coordinates.point,
      status: `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
      severity: 'none',
    };
  }
  if (coordinates.kind === 'invalid') {
    return {
      point: null,
      status: COORDINATE_PROBLEM_MESSAGES[coordinates.problem],
      severity: 'error',
    };
  }

  const code = trimmed.toUpperCase();
  if (AIRPORT_CODE_REGEX.test(code)) {
    if (!airportDatabase) {
      return hasAirportDatabaseError
        ? {
            point: null,
            status: 'Airport database offline',
            severity: 'warning',
          }
        : {
            point: null,
            status: 'Loading airport database...',
            severity: 'none',
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
        severity: 'none',
      };
    }

    return { point: null, status: 'Airport code not found', severity: 'error' };
  }

  return {
    point: null,
    status: 'Enter ICAO, IATA, or lat, lon',
    severity: 'error',
  };
}
