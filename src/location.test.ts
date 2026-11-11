import { describe, expect, it } from 'vitest';
import { buildAirportDatabase } from './airportDatabase.ts';
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

describe('resolveLocation: status and severity', () => {
  it.each([
    ['', null, false, '', 'none'],
    ['   ', null, false, '', 'none'],
    ['48.2, 14', null, false, '48.2000°, 14.0000°', 'none'],
    [
      'KJFK',
      database,
      false,
      'KJFK / JFK · John F Kennedy International Airport',
      'none',
    ],
    ['KJFK', null, false, 'Loading airport database...', 'none'],
    ['KJFK', null, true, 'Airport database offline', 'warning'],
    ['ZZZZ', database, false, 'Airport code not found', 'error'],
    ['3f8jg9f8j', database, false, 'Enter ICAO, IATA, or lat, lon', 'error'],
    [
      '-48.2 N, 14.0',
      database,
      false,
      'Sign contradicts hemisphere letter',
      'error',
    ],
    [
      `48°61'00"N 14°00'00"E`,
      database,
      false,
      'Minutes and seconds must be below 60',
      'error',
    ],
    [
      '91, 0',
      database,
      false,
      'Latitude must be between 90° S and 90° N',
      'error',
    ],
    [
      '0, 181',
      database,
      false,
      'Longitude must be between 180° W and 180° E',
      'error',
    ],
  ] as const)('%j → %j (%s)', (raw, db, failed, status, severity) => {
    const result = resolveLocation(raw, db, failed);
    expect(result.status).toBe(status);
    expect(result.severity).toBe(severity);
  });

  it('names a coordinate problem even while the airport database is offline', () => {
    expect(resolveLocation('91, 0', null, true)).toEqual({
      point: null,
      status: 'Latitude must be between 90° S and 90° N',
      severity: 'error',
    });
  });
});
