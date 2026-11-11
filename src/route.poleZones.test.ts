import { describe, expect, it } from 'vitest';
import type { Coordinates } from './coordinates.ts';
import { calculateRoute, formatRoute, poleZoneFor } from './route.ts';

const DATE = new Date('2026-06-01T00:00:00Z');
const route = (origin: Coordinates, destination: Coordinates) =>
  calculateRoute(origin, destination, DATE);

describe('poleZoneFor (NOAA WMM horizontal field strength H, nT)', () => {
  it.each([
    [0, 'blackout'],
    [1999.9, 'blackout'],
    [2000, 'caution'],
    [5999.9, 'caution'],
    [6000, null],
    [39677.9, null],
  ] as const)('H = %f → %s', (h, zone) => {
    expect(poleZoneFor(h)).toBe(zone);
  });
});

describe('magnetic pole zones at the origin', () => {
  const FAR: Coordinates = { lat: 0, lon: 0 };

  it.each([
    { lat: 86, lon: 140 },
    { lat: -64, lon: 137 },
  ])('blackout zone at $lat, $lon withholds the magnetic heading', (origin) => {
    const result = route(origin, FAR);
    expect(result.notice).toBe('blackout');
    expect(result.magneticHeading).toBeNull();
    expect(result.trueBearing).not.toBeNull();
    expect(result.distanceNm).toBeGreaterThan(1000);
  });

  it.each([
    { lat: 75, lon: -100 },
    { lat: 84, lon: 0 },
  ])('caution zone at $lat, $lon keeps the magnetic heading', (origin) => {
    const result = route(origin, FAR);
    expect(result.notice).toBe('caution');
    expect(result.magneticHeading).not.toBeNull();
    expect(result.trueBearing).not.toBeNull();
  });

  it('is judged at the origin, not the destination', () => {
    expect(route(FAR, { lat: 86, lon: 140 }).notice).toBeNull();
  });

  it('NOAA test point 80°N 0° (H 6523.2 nT, 2025.0) is outside both zones', () => {
    const result = calculateRoute(
      { lat: 80, lon: 0 },
      FAR,
      new Date('2025-01-01T00:00:00Z'),
    );
    expect(result.notice).toBeNull();
  });

  it('a degenerate route takes precedence over a pole zone', () => {
    const origin = { lat: 86, lon: 140 };
    expect(route(origin, { ...origin }).notice).toBe('same-point');
  });
});

describe('formatRoute for pole zones', () => {
  const base = {
    trueBearing: 180.2,
    magneticVariation: -159.1,
    distanceNm: 5160,
    distanceKm: 9556,
  };

  it('blackout zone shows no heading and explains why', () => {
    const formatted = formatRoute({
      ...base,
      magneticHeading: null,
      notice: 'blackout',
    });
    expect(formatted.magneticHeading).toBe('---');
    expect(formatted.trueBearing).toBe('180.2');
    expect(formatted.magneticVariation).toBe('159.1° W');
    expect(formatted.distanceNm).toBe('5,160');
    expect(formatted.notice).toBe(
      'Magnetic heading unreliable near magnetic pole',
    );
  });

  it('caution zone shows the heading with a note', () => {
    const formatted = formatRoute({
      ...base,
      magneticHeading: 339,
      notice: 'caution',
    });
    expect(formatted.magneticHeading).toBe('339');
    expect(formatted.notice).toBe('Near magnetic pole');
  });
});
