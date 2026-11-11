import bearing from '@turf/bearing';
import distance from '@turf/distance';
import geomagnetism, { type GeomagnetismModel } from 'geomagnetism';
import type { Coordinates } from './coordinates.ts';

let cachedModel: { time: number; model: GeomagnetismModel } | null = null;

function magneticModelAt(date: Date): GeomagnetismModel {
  const time = date.getTime();
  if (cachedModel?.time !== time) {
    // Outside its validity range the library would throw; extrapolating keeps
    // the values visible, and the route shows the model-expired notice.
    cachedModel = {
      time,
      model: geomagnetism.model(date, { allowOutOfBoundsModel: true }),
    };
  }
  return cachedModel.model;
}

/** WMM2025 validity (NOAA): from 2025-01-01 up to, not including, 2030-01-01 (UTC). */
const MAGNETIC_MODEL_VALID_FROM = Date.UTC(2025, 0, 1);
const MAGNETIC_MODEL_VALID_UNTIL = Date.UTC(2030, 0, 1);

export function isMagneticModelExpired(date: Date): boolean {
  const time = date.getTime();
  return time < MAGNETIC_MODEL_VALID_FROM || time >= MAGNETIC_MODEL_VALID_UNTIL;
}

/** Below this distance a route has no meaningful direction. */
export const MIN_ROUTE_DISTANCE_NM = 1;

/** NOAA WMM zone near a magnetic pole, judged by horizontal field strength. */
export type PoleZone = 'blackout' | 'caution';

/** Horizontal field strength (nT) below which a zone applies (NOAA WMM). */
const BLACKOUT_ZONE_MAX_H = 2000;
const CAUTION_ZONE_MAX_H = 6000;

/**
 * Why a route shows no true bearing and magnetic heading (degenerate
 * routes), no magnetic heading (blackout zone), or a magnetic heading that
 * needs care (expired magnetic model, caution zone).
 */
export type RouteNotice =
  | 'same-point'
  | 'too-close'
  | 'antipodal'
  | 'model-expired'
  | PoleZone;

const ROUTE_NOTICE_MESSAGES: Record<RouteNotice, string> = {
  'same-point': 'Origin and destination are the same point',
  'too-close': `Origin and destination too close (< ${MIN_ROUTE_DISTANCE_NM} NM)`,
  antipodal: 'Route direction undefined (antipodal points)',
  blackout: 'Magnetic heading unreliable near magnetic pole',
  'model-expired':
    'Magnetic model expired (WMM2025) – variation may be inaccurate',
  caution: 'Near magnetic pole',
};

export function poleZoneFor(horizontalIntensity: number): PoleZone | null {
  if (horizontalIntensity < BLACKOUT_ZONE_MAX_H) return 'blackout';
  if (horizontalIntensity < CAUTION_ZONE_MAX_H) return 'caution';
  return null;
}

/** Route values in degrees, nautical miles and kilometres. */
export interface Route {
  /** Whole degrees, 1–360; null without a route direction or in the blackout zone. */
  magneticHeading: number | null;
  /** Degrees, 0 ≤ x < 360; null when the route has no direction. */
  trueBearing: number | null;
  /** Degrees, east positive. */
  magneticVariation: number;
  distanceNm: number;
  distanceKm: number;
  notice: RouteNotice | null;
}

/** Display-ready route values. */
export interface FormattedRoute {
  magneticHeading: string;
  trueBearing: string;
  magneticVariation: string;
  distanceNm: string;
  distanceKm: string;
  /** Message explaining a missing heading; empty if none. */
  notice: string;
}

/**
 * Magnetic heading for the autopilot HDG: true bearing minus magnetic
 * variation, rounded to whole degrees, 0 shown as 360.
 */
export function magneticHeadingFrom(
  trueBearing: number,
  magneticVariation: number,
): number {
  const rounded = Math.round((trueBearing - magneticVariation + 360) % 360);
  return rounded === 0 || rounded === 360 ? 360 : rounded;
}

/** Antipode as [lon, lat], longitude kept within ±180. */
function antipodeOf({ lat, lon }: Coordinates): [number, number] {
  return [lon > 0 ? lon - 180 : lon + 180, -lat];
}

function noticeFor(
  origin: Coordinates,
  destination: Coordinates,
  distanceNm: number,
): RouteNotice | null {
  if (origin.lat === destination.lat && origin.lon === destination.lon) {
    return 'same-point';
  }
  if (distanceNm < MIN_ROUTE_DISTANCE_NM) return 'too-close';
  const fromAntipodeNm = distance(
    antipodeOf(origin),
    [destination.lon, destination.lat],
    { units: 'nauticalmiles' },
  );
  if (fromAntipodeNm < MIN_ROUTE_DISTANCE_NM) return 'antipodal';
  return null;
}

/**
 * Calculates the route from origin to destination on a spherical earth.
 * `date` selects the point in time for the magnetic model.
 */
export function calculateRoute(
  origin: Coordinates,
  destination: Coordinates,
  date: Date,
): Route {
  const originPt: [number, number] = [origin.lon, origin.lat];
  const destinationPt: [number, number] = [destination.lon, destination.lat];

  const distanceNm = distance(originPt, destinationPt, {
    units: 'nauticalmiles',
  });
  const distanceKm = distance(originPt, destinationPt, { units: 'kilometers' });
  const { decl: magneticVariation, h } = magneticModelAt(date).point([
    origin.lat,
    origin.lon,
  ]);
  const degenerate = noticeFor(origin, destination, distanceNm);
  const poleZone = poleZoneFor(h);
  // Precedence: degenerate route > blackout zone > model expired > caution zone.
  const notice =
    degenerate ??
    (poleZone === 'blackout'
      ? 'blackout'
      : isMagneticModelExpired(date)
        ? 'model-expired'
        : poleZone);

  const trueBearing =
    degenerate === null ? (bearing(originPt, destinationPt) + 360) % 360 : null;

  return {
    magneticHeading:
      trueBearing === null || poleZone === 'blackout'
        ? null
        : magneticHeadingFrom(trueBearing, magneticVariation),
    trueBearing,
    magneticVariation,
    distanceNm,
    distanceKm,
    notice,
  };
}

export function formatRoute(route: Route): FormattedRoute {
  const variation = route.magneticVariation;
  return {
    magneticHeading:
      route.magneticHeading === null
        ? '---'
        : String(route.magneticHeading).padStart(3, '0'),
    trueBearing:
      route.trueBearing === null
        ? '---.-'
        : route.trueBearing.toFixed(1).padStart(5, '0'),
    magneticVariation: `${Math.abs(variation).toFixed(1)}° ${variation >= 0 ? 'E' : 'W'}`,
    distanceNm: Math.round(route.distanceNm).toLocaleString('en-US'),
    distanceKm: Math.round(route.distanceKm).toLocaleString('en-US'),
    notice: route.notice ? ROUTE_NOTICE_MESSAGES[route.notice] : '',
  };
}
