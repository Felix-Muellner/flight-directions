export interface Coordinates {
  lat: number;
  lon: number;
}

const DECIMAL_COORD_REGEX =
  /^([+-]?\d+(?:\.\d+)?)\s*°?\s*([NSns])?[\s,;]+([+-]?\d+(?:\.\d+)?)\s*°?\s*([EWew])?$/;

const DMS_COORD_REGEX =
  /^(\d{1,2})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*["″]?\s*([NSns])[\s,;]+(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*["″]?\s*([EWew])$/;

function applyHemisphere(value: number, hemisphere?: string): number {
  if (!hemisphere) return value;
  const upper = hemisphere.toUpperCase();
  if (upper === 'S' || upper === 'W') return -Math.abs(value);
  if (upper === 'N' || upper === 'E') return Math.abs(value);
  return value;
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
  const decMatch = raw.match(DECIMAL_COORD_REGEX);
  if (decMatch) {
    const lat = applyHemisphere(parseFloat(decMatch[1]), decMatch[2]);
    const lon = applyHemisphere(parseFloat(decMatch[3]), decMatch[4]);
    return validateCoordinates(lat, lon);
  }

  const dmsMatch = raw.match(DMS_COORD_REGEX);
  if (dmsMatch) {
    const rawLat =
      parseInt(dmsMatch[1], 10) +
      parseInt(dmsMatch[2], 10) / 60 +
      parseFloat(dmsMatch[3]) / 3600;
    const rawLon =
      parseInt(dmsMatch[5], 10) +
      parseInt(dmsMatch[6], 10) / 60 +
      parseFloat(dmsMatch[7]) / 3600;

    const lat = applyHemisphere(rawLat, dmsMatch[4]);
    const lon = applyHemisphere(rawLon, dmsMatch[8]);
    return validateCoordinates(lat, lon);
  }

  return null;
}
