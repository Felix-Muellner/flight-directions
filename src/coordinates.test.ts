import { describe, expect, it } from 'vitest';
import { parseCoordinates } from './coordinates.ts';
import { resolveLocation } from './location.ts';

function expectPoint(raw: string, lat: number, lon: number) {
  const point = parseCoordinates(raw);
  expect(point, raw).not.toBeNull();
  expect(point?.lat).toBeCloseTo(lat, 6);
  expect(point?.lon).toBeCloseTo(lon, 6);
}

describe('parseCoordinates: decimal degrees', () => {
  it.each([
    ['40.6413, -73.7781', 40.6413, -73.7781],
    ['40.6413 -73.7781', 40.6413, -73.7781],
    ['40.6413;-73.7781', 40.6413, -73.7781],
    ['+40.6413, +73.7781', 40.6413, 73.7781],
    ['40.6413 N 73.7781 W', 40.6413, -73.7781],
    ['40.6413n, 73.7781w', 40.6413, -73.7781],
    ['40.6413° N, 73.7781° W', 40.6413, -73.7781],
    ['33.9425 S, 151.1751 E', -33.9425, 151.1751],
    ['40, -73', 40, -73],
  ])('parses %s', (raw, lat, lon) => {
    expectPoint(raw, lat, lon);
  });

  it('accepts a redundant sign that matches the hemisphere letter', () => {
    expectPoint('-33.9425 S, -73.7781 W', -33.9425, -73.7781);
  });

  it.each([
    '-40.5 N, 73.7 W',
    '40.5 N, -73.7 E',
    '+40.5 S, 73.7 W',
    '40.5 N, +73.7 W',
  ])('rejects a sign that contradicts the hemisphere letter: %s', (raw) => {
    expect(parseCoordinates(raw)).toBeNull();
  });
});

describe('parseCoordinates: DMS', () => {
  it('parses degrees, minutes and seconds with hemisphere letters', () => {
    expectPoint(
      `40°38'28.7"N 73°46'41.2"W`,
      40 + 38 / 60 + 28.7 / 3600,
      -(73 + 46 / 60 + 41.2 / 3600),
    );
  });

  it('parses prime symbols and lower-case hemisphere letters', () => {
    expectPoint(
      '33°56′33″s, 151°10′30″e',
      -(33 + 56 / 60 + 33 / 3600),
      151 + 10 / 60 + 30 / 3600,
    );
  });

  it('accepts seconds just below 60', () => {
    expectPoint(`0°59'59.99"N 0°0'0"E`, 59 / 60 + 59.99 / 3600, 0);
  });

  it.each([
    `40°60'00"N 73°46'41"W`,
    `40°38'60"N 73°46'41"W`,
    `40°38'28"N 73°75'41"W`,
    `40°38'28"N 73°46'99.5"W`,
  ])('rejects minutes or seconds of 60 or more: %s', (raw) => {
    expect(parseCoordinates(raw)).toBeNull();
  });
});

describe('parseCoordinates: range', () => {
  it.each([
    ['90, 180', 90, 180],
    ['-90, -180', -90, -180],
    [`89°59'59.9"N 180°00'00"W`, 89 + 59 / 60 + 59.9 / 3600, -180],
  ])('accepts the boundary %s', (raw, lat, lon) => {
    expectPoint(raw, lat, lon);
  });

  it.each([
    '90.0001, 0',
    '-90.0001, 0',
    '0, 180.5',
    '0, -180.5',
    '91 N, 0 E',
    `90°00'01"N 0°0'0"E`,
    `0°0'0"N 180°00'01"E`,
    `0°0'0"N 181°00'00"E`,
  ])('rejects out-of-range %s', (raw) => {
    expect(parseCoordinates(raw)).toBeNull();
  });
});

describe('parseCoordinates: not coordinates', () => {
  it.each(['40.6413', 'KJFK', '', 'N 40.6, W 73.7'])(
    'returns null for %j',
    (raw) => {
      expect(parseCoordinates(raw)).toBeNull();
    },
  );
});

describe('resolveLocation with invalid coordinates', () => {
  it.each(['-40.5 N, 73.7 W', `40°60'00"N 73°46'41"W`, '90.0001, 0'])(
    'shows the input hint for %s',
    (raw) => {
      expect(resolveLocation(raw, null, false)).toEqual({
        point: null,
        status: 'Enter ICAO, IATA, or lat, lon',
      });
    },
  );
});

describe('parseCoordinates: performance', () => {
  it.each([
    ['decimal', `1${' '.repeat(5000)}1${' '.repeat(5000)}x`],
    ['decimal with degree signs', `1°${' '.repeat(5000)}°x`],
    ['DMS', `1°1'1${' '.repeat(5000)}"${' '.repeat(5000)}x`],
    ['separators', `1${', '.repeat(5000)}x`],
  ])('rejects long whitespace input (%s) quickly', (_, raw) => {
    const start = performance.now();
    expect(parseCoordinates(raw)).toBeNull();
    expect(performance.now() - start).toBeLessThan(100);
  });
});
