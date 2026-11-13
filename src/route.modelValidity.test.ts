import geomagnetism from 'geomagnetism';
import { describe, expect, it } from 'vitest';
import type { Coordinates } from './coordinates.ts';
import {
  calculateRoute,
  formatRoute,
  isMagneticModelExpired,
  poleZoneFor,
} from './route.ts';

const LINZ: Coordinates = { lat: 48.2, lon: 14.0 };
const VIENNA: Coordinates = { lat: 48.11, lon: 16.57 };
const EXPIRED_MESSAGE =
  'Magnetic model expired (WMM2025) – variation may be inaccurate';

describe('isMagneticModelExpired (WMM2025 valid 2025-01-01 to 2029-12-31)', () => {
  it.each([
    ['2024-12-31T23:59:59.999Z', true],
    ['2025-01-01T00:00:00.000Z', false],
    ['2027-07-02T12:00:00.000Z', false],
    ['2029-12-31T23:59:59.999Z', false],
    ['2030-01-01T00:00:00.000Z', true],
  ])('%s → %s', (date, expired) => {
    expect(isMagneticModelExpired(new Date(date))).toBe(expired);
  });
});

describe('route outside the magnetic model validity range', () => {
  it.each([
    '2024-12-31T23:59:59Z',
    '2030-01-01T00:00:00Z',
    '2035-06-01T00:00:00Z',
  ])('keeps all values and shows the expired notice on %s', (date) => {
    const result = calculateRoute(LINZ, VIENNA, new Date(date));
    expect(result.notice).toBe('model-expired');
    expect(result.magneticHeading).not.toBeNull();
    expect(result.trueBearing).not.toBeNull();
    expect(Number.isFinite(result.magneticVariation)).toBe(true);
    expect(formatRoute(result).notice).toBe(EXPIRED_MESSAGE);
  });

  it.each([
    '2025-01-01T00:00:00Z',
    '2029-11-14T00:00:00Z',
    '2029-12-31T23:59:59Z',
  ])('shows no notice inside the range on %s', (date) => {
    const result = calculateRoute(LINZ, VIENNA, new Date(date));
    expect(result.notice).toBeNull();
    expect(result.magneticHeading).not.toBeNull();
  });
});

describe('route notice precedence: degenerate > blackout > expired > caution', () => {
  const EXPIRED = new Date('2031-01-01T00:00:00Z');
  const FAR: Coordinates = { lat: 0, lon: 0 };

  it('a degenerate route wins over an expired model', () => {
    expect(calculateRoute(LINZ, { ...LINZ }, EXPIRED).notice).toBe(
      'same-point',
    );
  });

  // Pole zones at the expired date, from the same extrapolated model the
  // route uses, so the precedence tests cannot pass by accident.
  const poleZoneAt = (point: Coordinates) =>
    poleZoneFor(
      geomagnetism
        .model(EXPIRED, { allowOutOfBoundsModel: true })
        .point([point.lat, point.lon]).h,
    );
  const IN_BLACKOUT: Coordinates = { lat: 86, lon: 140 };
  const IN_CAUTION: Coordinates = { lat: 75, lon: -100 };

  it('test points lie in the intended pole zones at the expired date', () => {
    expect(poleZoneAt(IN_BLACKOUT)).toBe('blackout');
    expect(poleZoneAt(IN_CAUTION)).toBe('caution');
  });

  it('the blackout zone wins over an expired model', () => {
    const result = calculateRoute(IN_BLACKOUT, FAR, EXPIRED);
    expect(result.notice).toBe('blackout');
    expect(result.magneticHeading).toBeNull();
  });

  it('an expired model wins over the caution zone', () => {
    const result = calculateRoute(IN_CAUTION, FAR, EXPIRED);
    expect(result.notice).toBe('model-expired');
    expect(result.magneticHeading).not.toBeNull();
  });
});
