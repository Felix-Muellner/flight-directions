import { describe, expect, it } from 'vitest';
import type { Coordinates } from './coordinates.ts';
import {
  calculateRoute,
  formatRoute,
  magneticHeadingFrom,
  type Route,
} from './route.ts';

const KJFK: Coordinates = { lat: 40.63980103, lon: -73.77890015 };
const EGLL: Coordinates = { lat: 51.4706001282, lon: -0.4619410038 };
const YSSY: Coordinates = { lat: -33.9460983276, lon: 151.1770019531 };

function within(actual: number, expected: number, tolerance: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

function route(
  origin: Coordinates,
  destination: Coordinates,
  date = new Date('2026-06-01T00:00:00Z'),
): Route {
  return calculateRoute(origin, destination, date);
}

/**
 * NOAA/NCEI "Test Values for WMM2025", height 0 km rows.
 * https://www.ncei.noaa.gov/sites/default/files/2025-02/WMM2025testvalues.pdf
 * Decimal year 2027.5 = 2027-07-02T12:00Z. Longitude 240° = -120°.
 * Published to 0.01°; checked to 0.01° (stricter than the spec's 0.1°).
 */
const NOAA_WMM2025 = [
  { date: '2025-01-01T00:00:00Z', lat: 80, lon: 0, variation: 1.28 },
  { date: '2025-01-01T00:00:00Z', lat: 0, lon: 120, variation: -0.16 },
  { date: '2025-01-01T00:00:00Z', lat: -80, lon: -120, variation: 68.78 },
  { date: '2027-07-02T12:00:00Z', lat: 80, lon: 0, variation: 2.59 },
  { date: '2027-07-02T12:00:00Z', lat: 0, lon: 120, variation: -0.24 },
  { date: '2027-07-02T12:00:00Z', lat: -80, lon: -120, variation: 68.49 },
];

describe('magnetic variation at the origin', () => {
  it.each(NOAA_WMM2025)(
    'matches NOAA WMM2025 at $lat, $lon on $date',
    ({ date, lat, lon, variation }) => {
      const result = route({ lat, lon }, { lat: 0, lon: 0 }, new Date(date));
      within(result.magneticVariation, variation, 0.01);
    },
  );

  it('uses the origin, not the destination', () => {
    const date = new Date('2025-01-01T00:00:00Z');
    const result = route({ lat: -80, lon: -120 }, { lat: 80, lon: 0 }, date);
    within(result.magneticVariation, 68.78, 0.01);
  });
});

/**
 * Spherical earth, mean radius 6371.0088 km (IUGG), 1 NM = 1.852 km.
 * Distance by haversine and spherical law of cosines (agree to 0.001 km),
 * initial bearing by the standard forward-azimuth formula
 * (as on movable-type.co.uk/scripts/latlong.html), computed independently.
 */
const REFERENCE_ROUTES: {
  name: string;
  origin: Coordinates;
  destination: Coordinates;
  km: number;
  nm: number;
  bearing: number;
}[] = [
  {
    name: 'KJFK→EGLL',
    origin: KJFK,
    destination: EGLL,
    km: 5539.652,
    nm: 2991.173,
    bearing: 51.353,
  },
  {
    name: 'EGLL→KJFK',
    origin: EGLL,
    destination: KJFK,
    km: 5539.652,
    nm: 2991.173,
    bearing: 287.937,
  },
  {
    name: 'EGLL→YSSY',
    origin: EGLL,
    destination: YSSY,
    km: 17020.677,
    nm: 9190.431,
    bearing: 60.47,
  },
  {
    name: 'YSSY→KJFK',
    origin: YSSY,
    destination: KJFK,
    km: 16013.566,
    nm: 8646.634,
    bearing: 65.846,
  },
  {
    name: 'due east on the equator',
    origin: { lat: 0, lon: 0 },
    destination: { lat: 0, lon: 10 },
    km: 1111.951,
    nm: 600.405,
    bearing: 90,
  },
  {
    name: 'due north',
    origin: { lat: 0, lon: 0 },
    destination: { lat: 10, lon: 0 },
    km: 1111.951,
    nm: 600.405,
    bearing: 0,
  },
  {
    name: 'due south',
    origin: { lat: 0, lon: 0 },
    destination: { lat: -10, lon: 0 },
    km: 1111.951,
    nm: 600.405,
    bearing: 180,
  },
  {
    name: 'due west',
    origin: { lat: 0, lon: 10 },
    destination: { lat: 0, lon: 0 },
    km: 1111.951,
    nm: 600.405,
    bearing: 270,
  },
  {
    name: 'across the antimeridian',
    origin: { lat: 50, lon: -179 },
    destination: { lat: 50, lon: 179 },
    km: 142.945,
    nm: 77.184,
    bearing: 270.766,
  },
];

describe('true bearing and distance', () => {
  it.each(REFERENCE_ROUTES)(
    '$name',
    ({ origin, destination, km, nm, bearing }) => {
      const result = route(origin, destination);
      expect(result.notice).toBeNull();
      const trueBearing = result.trueBearing ?? Number.NaN;
      within(result.distanceNm, nm, 1);
      within(result.distanceKm, km, 1.852);
      const bearingError = Math.abs(
        ((trueBearing - bearing + 540) % 360) - 180,
      );
      expect(bearingError).toBeLessThanOrEqual(0.1);
      expect(result.trueBearing).toBeGreaterThanOrEqual(0);
      expect(result.trueBearing).toBeLessThan(360);
    },
  );
});

describe('magneticHeadingFrom', () => {
  it.each([
    [100, 10, 90, 'east variation is subtracted'],
    [100, -10, 110, 'west variation is added'],
    [5, 10, 355, 'wraps below north'],
    [355, -10, 5, 'wraps past north'],
    [0.4, 0, 360, 'rounds to 0 and shows 360'],
    [359.6, 0, 360, 'rounds up to 360'],
    [0.2, 0.5, 360, 'small negative result shows 360'],
    [180.5, 0, 181, 'rounds half up'],
    [180.49, 0, 180, 'rounds down below half'],
    [1, 0, 1, 'keeps 001'],
  ])(
    '%f° true, %f° variation → %i (%s)',
    (trueBearing, variation, expected) => {
      expect(magneticHeadingFrom(trueBearing, variation)).toBe(expected);
    },
  );
});

describe('formatRoute', () => {
  const base: Route = {
    magneticHeading: 51,
    trueBearing: 51.353,
    magneticVariation: -13.2,
    distanceNm: 2991.173,
    distanceKm: 5539.652,
    notice: null,
  };

  it('formats the magnetic heading as three digits', () => {
    expect(formatRoute({ ...base, magneticHeading: 5 }).magneticHeading).toBe(
      '005',
    );
    expect(formatRoute({ ...base, magneticHeading: 51 }).magneticHeading).toBe(
      '051',
    );
    expect(formatRoute({ ...base, magneticHeading: 360 }).magneticHeading).toBe(
      '360',
    );
  });

  it('formats the true bearing zero-padded with one decimal', () => {
    expect(formatRoute(base).trueBearing).toBe('051.4');
    expect(formatRoute({ ...base, trueBearing: 5.04 }).trueBearing).toBe(
      '005.0',
    );
    expect(formatRoute({ ...base, trueBearing: 287.937 }).trueBearing).toBe(
      '287.9',
    );
  });

  it('formats magnetic variation as x.x° E/W', () => {
    expect(
      formatRoute({ ...base, magneticVariation: 1.28 }).magneticVariation,
    ).toBe('1.3° E');
    expect(
      formatRoute({ ...base, magneticVariation: -0.16 }).magneticVariation,
    ).toBe('0.2° W');
    expect(
      formatRoute({ ...base, magneticVariation: 68.78 }).magneticVariation,
    ).toBe('68.8° E');
    expect(
      formatRoute({ ...base, magneticVariation: -13.2 }).magneticVariation,
    ).toBe('13.2° W');
  });

  it('formats distances as whole units with thousands separators', () => {
    const formatted = formatRoute({
      ...base,
      distanceNm: 9190.431,
      distanceKm: 17020.677,
    });
    expect(formatted.distanceNm).toBe('9,190');
    expect(formatted.distanceKm).toBe('17,021');
    expect(
      formatRoute({ ...base, distanceNm: 77.5, distanceKm: 142.4 }).distanceNm,
    ).toBe('78');
  });
});

describe('calculateRoute', () => {
  it('combines true bearing and magnetic variation into the magnetic heading', () => {
    const result = route(KJFK, EGLL);
    expect(result.magneticHeading).toBe(
      magneticHeadingFrom(
        result.trueBearing ?? Number.NaN,
        result.magneticVariation,
      ),
    );
  });
});
