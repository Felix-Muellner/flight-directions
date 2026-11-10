import { describe, expect, it } from 'vitest';
import type { Coordinates } from './coordinates.ts';
import {
  calculateRoute,
  formatRoute,
  MIN_ROUTE_DISTANCE_NM,
  type Route,
} from './route.ts';

const DATE = new Date('2026-06-01T00:00:00Z');

function route(origin: Coordinates, target: Coordinates): Route {
  const result = calculateRoute(origin, target, DATE);
  if (!result) throw new Error('expected a route');
  return result;
}

const EARTH_RADIUS_NM = 6371.0088 / 1.852;
const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/**
 * Point `nm` nautical miles from `from` on the given true bearing
 * (spherical destination-point formula, movable-type.co.uk).
 */
function offset(from: Coordinates, nm: number, bearing = 45): Coordinates {
  const d = nm / EARTH_RADIUS_NM;
  const lat1 = rad(from.lat);
  const b = rad(bearing);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b),
  );
  const lon2 =
    rad(from.lon) +
    Math.atan2(
      Math.sin(b) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: deg(lat2), lon: ((deg(lon2) + 540) % 360) - 180 };
}

const ORIGIN: Coordinates = { lat: 40.6398, lon: -73.7789 };
const ANTIPODE: Coordinates = { lat: -40.6398, lon: 106.2211 };

describe('MIN_ROUTE_DISTANCE_NM', () => {
  it('is 1 NM', () => {
    expect(MIN_ROUTE_DISTANCE_NM).toBe(1);
  });
});

describe('degenerate routes', () => {
  it('identical coordinates are the same point', () => {
    const result = route(ORIGIN, { ...ORIGIN });
    expect(result.notice).toBe('same-point');
    expect(result.trueBearing).toBeNull();
    expect(result.magneticHeading).toBeNull();
    expect(result.distanceNm).toBe(0);
  });

  it.each([0.1, 0.5, 0.99])('%f NM apart is too close', (nm) => {
    const result = route(ORIGIN, offset(ORIGIN, nm));
    expect(result.notice).toBe('too-close');
    expect(result.trueBearing).toBeNull();
    expect(result.magneticHeading).toBeNull();
    expect(result.distanceNm).toBeCloseTo(nm, 3);
  });

  it('1.01 NM apart is a normal route', () => {
    const result = route(ORIGIN, offset(ORIGIN, 1.01));
    expect(result.notice).toBeNull();
    expect(result.trueBearing).not.toBeNull();
    expect(result.magneticHeading).not.toBeNull();
  });

  it('exactly antipodal points have no route direction', () => {
    const result = route(ORIGIN, ANTIPODE);
    expect(result.notice).toBe('antipodal');
    expect(result.trueBearing).toBeNull();
    expect(result.magneticHeading).toBeNull();
    expect(result.distanceNm).toBeCloseTo((Math.PI * 6371.0088) / 1.852, 3);
  });

  it.each([0.1, 0.99])('%f NM from antipodal has no route direction', (nm) => {
    const result = route(ORIGIN, offset(ANTIPODE, nm, 200));
    expect(result.notice).toBe('antipodal');
    expect(result.trueBearing).toBeNull();
  });

  it('antipodal across the poles is detected', () => {
    const result = route({ lat: 0, lon: 0 }, { lat: 0, lon: 180 });
    expect(result.notice).toBe('antipodal');
  });

  it('1.01 NM from antipodal is a normal route', () => {
    const result = route(ORIGIN, offset(ANTIPODE, 1.01, 200));
    expect(result.notice).toBeNull();
    expect(result.trueBearing).not.toBeNull();
  });

  it('keeps magnetic variation at the origin', () => {
    const result = route(ORIGIN, { ...ORIGIN });
    expect(result.magneticVariation).toBeLessThan(-5);
  });
});

describe('formatRoute for degenerate routes', () => {
  it.each([
    ['same-point', 'Origin and destination are the same point'],
    ['too-close', 'Origin and destination too close (< 1 NM)'],
    ['antipodal', 'Route direction undefined (antipodal points)'],
  ] as const)('%s', (notice, message) => {
    const formatted = formatRoute({
      magneticHeading: null,
      trueBearing: null,
      magneticVariation: -12.34,
      distanceNm: 0.4,
      distanceKm: 0.74,
      notice,
    });
    expect(formatted.magneticHeading).toBe('---');
    expect(formatted.trueBearing).toBe('---.-');
    expect(formatted.magneticVariation).toBe('12.3° W');
    expect(formatted.distanceNm).toBe('0');
    expect(formatted.notice).toBe(message);
  });

  it('has no notice for a normal route', () => {
    const formatted = formatRoute({
      magneticHeading: 51,
      trueBearing: 51.3,
      magneticVariation: -12.3,
      distanceNm: 2991,
      distanceKm: 5539,
      notice: null,
    });
    expect(formatted.notice).toBe('');
  });
});
