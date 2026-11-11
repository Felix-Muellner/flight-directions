export interface Coordinates {
  lat: number;
  lon: number;
}

const DECIMAL_COORD_REGEX =
  /^([+-]?)(\d+(?:\.\d+)?)\s*°?\s*([NSns])?[\s,;]+([+-]?)(\d+(?:\.\d+)?)\s*°?\s*([EWew])?$/;

const DMS_COORD_REGEX =
  /^(\d{1,2})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*["″]?\s*([NSns])[\s,;]+(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*["″]?\s*([EWew])$/;

/**
 * Applies a hemisphere letter to a signed value.
 * Returns null if an explicit sign contradicts the letter (e.g. `-40 N`).
 */
function applyHemisphere(
  sign: string,
  value: number,
  hemisphere?: string,
): number | null {
  const signed = sign === '-' ? -value : value;
  if (!hemisphere) return signed;
  const negative = 'SW'.includes(hemisphere.toUpperCase());
  if (sign === (negative ? '+' : '-')) return null;
  return negative ? -value : value;
}

function dmsToDegrees(degrees: string, minutes: string, seconds: string) {
  const min = parseInt(minutes, 10);
  const sec = parseFloat(seconds);
  if (min >= 60 || sec >= 60) return null;
  return parseInt(degrees, 10) + min / 60 + sec / 3600;
}

export type CoordinateProblem =
  | 'sign-contradicts-hemisphere'
  | 'minutes-or-seconds-too-large'
  | 'latitude-out-of-range'
  | 'longitude-out-of-range';

export type CoordinateCheck =
  | { kind: 'valid'; point: Coordinates }
  | { kind: 'invalid'; problem: CoordinateProblem }
  | { kind: 'not-coordinates' };

const invalid = (problem: CoordinateProblem): CoordinateCheck => ({
  kind: 'invalid',
  problem,
});

function checkRange(lat: number, lon: number): CoordinateCheck {
  if (!(Number.isFinite(lat) && lat >= -90 && lat <= 90)) {
    return invalid('latitude-out-of-range');
  }
  if (!(Number.isFinite(lon) && lon >= -180 && lon <= 180)) {
    return invalid('longitude-out-of-range');
  }
  return { kind: 'valid', point: { lat, lon } };
}

/**
 * Checks whether a location input is coordinates and, if it looks like
 * coordinates but is invalid, names the first problem in spec order.
 */
export function checkCoordinates(raw: string): CoordinateCheck {
  // Collapsing whitespace runs keeps the overlapping whitespace quantifiers
  // in the patterns from backtracking catastrophically on long input.
  const input = raw.replace(/\s+/g, ' ');

  const dec = input.match(DECIMAL_COORD_REGEX);
  if (dec) {
    const lat = applyHemisphere(dec[1], parseFloat(dec[2]), dec[3]);
    const lon = applyHemisphere(dec[4], parseFloat(dec[5]), dec[6]);
    if (lat === null || lon === null) {
      return invalid('sign-contradicts-hemisphere');
    }
    return checkRange(lat, lon);
  }

  const dms = input.match(DMS_COORD_REGEX);
  if (dms) {
    const latDegrees = dmsToDegrees(dms[1], dms[2], dms[3]);
    const lonDegrees = dmsToDegrees(dms[5], dms[6], dms[7]);
    if (latDegrees === null || lonDegrees === null) {
      return invalid('minutes-or-seconds-too-large');
    }
    const lat = applyHemisphere('', latDegrees, dms[4]);
    const lon = applyHemisphere('', lonDegrees, dms[8]);
    if (lat === null || lon === null) {
      return invalid('sign-contradicts-hemisphere');
    }
    return checkRange(lat, lon);
  }

  return { kind: 'not-coordinates' };
}

export function parseCoordinates(raw: string): Coordinates | null {
  const result = checkCoordinates(raw);
  return result.kind === 'valid' ? result.point : null;
}
