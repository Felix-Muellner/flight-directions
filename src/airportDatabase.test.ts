import { describe, expect, it, vi } from 'vitest';
import * as airportDatabaseModule from './airportDatabase.ts';
import {
  type AirportEntry,
  BUNDLED_SNAPSHOT_DATE,
  buildAirportDatabase,
  isValidAirportEntry,
  loadAirportDatabase,
} from './airportDatabase.ts';
import fixture from './fixtures/airports.json';
import { resolveLocation } from './location.ts';

const raw = fixture as unknown as Record<string, AirportEntry>;
const database = buildAirportDatabase(raw);

const resolve = (input: string) => resolveLocation(input, database, false);

describe('buildAirportDatabase', () => {
  it('finds airports by ICAO and IATA code', () => {
    expect(database.get('KJFK')?.name).toBe(
      'John F Kennedy International Airport',
    );
    expect(database.get('LHR')?.icao).toBe('EGLL');
  });

  it('finds an airport without an IATA code by ICAO only', () => {
    expect(database.get('EDAB')?.name).toBe('Bautzen Airport');
    expect(database.has('')).toBe(false);
  });

  it('ignores entries without numeric lat/lon', () => {
    expect(database.has('XBAD')).toBe(false);
    expect(database.has('BAD')).toBe(false);
  });

  // A 3-character ICAO code is invalid (spec: airport database validation),
  // so XIC is only the IATA code of XIA1.
  it('skips an entry whose ICAO code is not 4 characters', () => {
    expect(database.get('XIC')?.name).toBe(
      'Synthetic IATA Equal To Other ICAO',
    );
  });

  it('skips a 3-character ICAO entry regardless of entry order', () => {
    const reversed = buildAirportDatabase({
      XIA1: raw.XIA1,
      XIC: raw.XIC,
    });
    expect(reversed.get('XIC')?.name).toBe(
      'Synthetic IATA Equal To Other ICAO',
    );
  });

  it('resolves an IATA code shared by two airports to no airport', () => {
    expect(database.has('DUP')).toBe(false);
    expect(database.get('XDA1')?.name).toBe('Synthetic Duplicate IATA One');
    expect(database.get('XDA2')?.name).toBe('Synthetic Duplicate IATA Two');
  });

  it('stores codes upper-case', () => {
    expect(database.get('XLOW')?.name).toBe('Synthetic Lower-Case Codes');
    expect(database.get('LWR')?.name).toBe('Synthetic Lower-Case Codes');
  });
});

describe('airport entry validation', () => {
  const valid = {
    icao: 'ZZZZ',
    iata: 'ZZZ',
    name: 'Synthetic Valid',
    lat: 10,
    lon: 20,
  };

  it('accepts a valid entry', () => {
    expect(isValidAirportEntry(valid)).toBe(true);
  });

  it.each([
    ['empty iata', { ...valid, iata: '' }],
    ['missing iata', { ...valid, iata: undefined }],
    ['lower-case codes', { ...valid, icao: 'zzzz', iata: 'zzz' }],
    ['digits in codes', { ...valid, icao: 'K1A2', iata: '1A2' }],
    ['boundary coordinates', { ...valid, lat: -90, lon: 180 }],
    ['other boundary coordinates', { ...valid, lat: 90, lon: -180 }],
  ])('accepts %s', (_, entry) => {
    expect(isValidAirportEntry(entry)).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'KJFK'],
    ['an array', [valid]],
    ['non-string icao', { ...valid, icao: 1234 }],
    ['missing icao', { ...valid, icao: undefined }],
    ['3-character icao', { ...valid, icao: 'ZZZ' }],
    ['5-character icao', { ...valid, icao: 'ZZZZZ' }],
    ['icao with underscore', { ...valid, icao: 'EK_2' }],
    ['non-string iata', { ...valid, iata: 123 }],
    ['2-character iata', { ...valid, iata: 'ZZ' }],
    ['4-character iata', { ...valid, iata: 'ZZZZ' }],
    ['iata with symbol', { ...valid, iata: 'Z-Z' }],
    ['only lat', { ...valid, lon: undefined }],
    ['only lon', { ...valid, lat: undefined }],
    ['string lat', { ...valid, lat: '10' }],
    ['NaN lon', { ...valid, lon: Number.NaN }],
    ['lat above 90', { ...valid, lat: 90.0001 }],
    ['lat below -90', { ...valid, lat: -90.0001 }],
    ['lon above 180', { ...valid, lon: 180.0001 }],
    ['lon below -180', { ...valid, lon: -180.0001 }],
    ['non-string name', { ...valid, name: 42 }],
    ['missing name', { ...valid, name: undefined }],
  ])('rejects %s', (_, entry) => {
    expect(isValidAirportEntry(entry)).toBe(false);
  });

  it('keeps the rest of the database usable when entries are malformed', () => {
    const mixed = buildAirportDatabase({
      KJFK: raw.KJFK,
      NUM1: { ...valid, icao: 1234 },
      NUM2: { ...valid, icao: 'ZZZY', iata: 99 },
      NUL: null,
      RNG: { ...valid, icao: 'ZZZX', iata: 'ZZX', lat: 91 },
      BADI: { ...valid, icao: 'ZZZW', iata: 'ZW' },
    });
    expect(mixed.get('KJFK')?.name).toBe(
      'John F Kennedy International Airport',
    );
    expect([...mixed.keys()].sort()).toEqual(['JFK', 'KJFK']);
  });
});

describe('resolveLocation with the airport database', () => {
  it.each(['KJFK', 'kjfk', 'JFK', 'jfk', ' jFk '])(
    'is case-insensitive: %j',
    (input) => {
      expect(resolve(input).status).toBe(
        'KJFK / JFK · John F Kennedy International Airport',
      );
    },
  );

  it('shows only the ICAO code when the airport has no IATA code', () => {
    expect(resolve('EDAB')).toEqual({
      point: { lat: 51.193611145, lon: 14.5197219849 },
      status: 'EDAB · Bautzen Airport',
      severity: 'none',
    });
  });

  it('shows not found for a shared IATA code', () => {
    expect(resolve('DUP')).toEqual({
      point: null,
      status: 'Airport code not found',
      severity: 'error',
    });
  });
});

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: () => Promise.resolve(body) } as Response;
}

describe('loadAirportDatabase', () => {
  const signal = new AbortController().signal;
  const SNAPSHOT_URL = `${import.meta.env.BASE_URL}airports.json`;

  it('keeps the commit date of the bundled snapshot, not the commit', () => {
    expect(BUNDLED_SNAPSHOT_DATE).toBe('2026-10-01');
    expect(Object.keys(airportDatabaseModule)).not.toContain(
      'AIRPORT_DATABASE_COMMIT',
    );
  });

  it('loads the bundled snapshot from the same site only', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(raw));
    const loaded = await loadAirportDatabase(signal, fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBe(SNAPSHOT_URL);
    expect(SNAPSHOT_URL).not.toMatch(/jsdelivr|github/i);
    expect(loaded.get('KJFK')?.icao).toBe('KJFK');
  });

  it('still validates entries in the browser', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(raw));
    const loaded = await loadAirportDatabase(signal, fetchFn);
    expect(loaded.has('XBAD')).toBe(false);
    expect(loaded.get('LHR')?.icao).toBe('EGLL');
  });

  it('rejects on an HTTP error such as 404', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(null, false));
    await expect(loadAirportDatabase(signal, fetchFn)).rejects.toThrow();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('rejects when the request fails', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('network'));
    await expect(loadAirportDatabase(signal, fetchFn)).rejects.toThrow();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('rejects JSON that is not an object', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse([raw.KJFK]));
    await expect(loadAirportDatabase(signal, fetchFn)).rejects.toThrow();
  });
});
