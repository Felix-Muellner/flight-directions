import { describe, expect, it } from 'vitest';
import {
  type AirportDatabaseState,
  buildAirportDatabase,
} from './airportDatabase.ts';
import { resolveLocation } from './location.ts';

const database = buildAirportDatabase({
  KJFK: {
    icao: 'KJFK',
    iata: 'JFK',
    name: 'John F Kennedy International Airport',
    lat: 40.639801,
    lon: -73.7789,
  },
});

const LOADING: AirportDatabaseState = { kind: 'loading' };
const FAILED: AirportDatabaseState = { kind: 'failed' };
const LOADED: AirportDatabaseState = { kind: 'loaded', database };

describe('resolveLocation: status and severity', () => {
  it.each([
    ['', LOADING, '', 'none'],
    ['   ', LOADING, '', 'none'],
    ['48.2, 14', LOADING, '48.2000°, 14.0000°', 'none'],
    [
      'KJFK',
      LOADED,
      'KJFK / JFK · John F Kennedy International Airport',
      'none',
    ],
    ['KJFK', LOADING, 'Loading airport database...', 'none'],
    ['KJFK', FAILED, 'Airport database offline', 'warning'],
    ['ZZZZ', LOADED, 'Airport code not found', 'error'],
    ['3f8jg9f8j', LOADED, 'Enter ICAO, IATA, or lat, lon', 'error'],
    ['-48.2 N, 14.0', LOADED, 'Sign contradicts hemisphere letter', 'error'],
    [
      `48°61'00"N 14°00'00"E`,
      LOADED,
      'Minutes and seconds must be below 60',
      'error',
    ],
    ['91, 0', LOADED, 'Latitude must be between 90° S and 90° N', 'error'],
    ['0, 181', LOADED, 'Longitude must be between 180° W and 180° E', 'error'],
  ] as const)('%j → %j (%s)', (raw, state, status, severity) => {
    const result = resolveLocation(raw, state);
    expect(result.status).toBe(status);
    expect(result.severity).toBe(severity);
  });

  it('names a coordinate problem even while the airport database is offline', () => {
    expect(resolveLocation('91, 0', FAILED)).toEqual({
      point: null,
      status: 'Latitude must be between 90° S and 90° N',
      severity: 'error',
    });
  });
});
