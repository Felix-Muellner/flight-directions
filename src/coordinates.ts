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

function validateCoordinates(lat: number, lon: number): Coordinates | null {
  if (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  ) {
    return { lat, lon };
  }
  return null;
}

export function parseCoordinates(raw: string): Coordinates | null {
  // Collapsing whitespace runs keeps the overlapping whitespace quantifiers
  // in the patterns from backtracking catastrophically on long input.
  const input = raw.replace(/\s+/g, ' ');

  const dec = input.match(DECIMAL_COORD_REGEX);
  if (dec) {
    const lat = applyHemisphere(dec[1], parseFloat(dec[2]), dec[3]);
    const lon = applyHemisphere(dec[4], parseFloat(dec[5]), dec[6]);
    if (lat === null || lon === null) return null;
    return validateCoordinates(lat, lon);
  }

  const dms = input.match(DMS_COORD_REGEX);
  if (dms) {
    const latDegrees = dmsToDegrees(dms[1], dms[2], dms[3]);
    const lonDegrees = dmsToDegrees(dms[5], dms[6], dms[7]);
    if (latDegrees === null || lonDegrees === null) return null;
    const lat = applyHemisphere('', latDegrees, dms[4]);
    const lon = applyHemisphere('', lonDegrees, dms[8]);
    if (lat === null || lon === null) return null;
    return validateCoordinates(lat, lon);
  }

  return null;
}
