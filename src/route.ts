import bearing from '@turf/bearing';
import distance from '@turf/distance';
import geomagnetism, { type GeomagnetismModel } from 'geomagnetism';
import type { Coordinates } from './coordinates.ts';

let cachedModel: { time: number; model: GeomagnetismModel } | null = null;

function magneticModelAt(date: Date): GeomagnetismModel {
  const time = date.getTime();
  if (cachedModel?.time !== time) {
    cachedModel = { time, model: geomagnetism.model(date) };
  }
  return cachedModel.model;
}

/** Route values in degrees, nautical miles and kilometres. */
export interface Route {
  /** Whole degrees, 1–360. */
  magneticHeading: number;
  /** Degrees, 0 ≤ x < 360. */
  trueBearing: number;
  /** Degrees, east positive. */
  magneticVariation: number;
  distanceNm: number;
  distanceKm: number;
}

/** Display-ready route values. */
export interface FormattedRoute {
  magneticHeading: string;
  trueBearing: string;
  magneticVariation: string;
  distanceNm: string;
  distanceKm: string;
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

/**
 * Calculates the route from origin to destination on a spherical earth.
 * `date` selects the point in time for the magnetic model.
 */
export function calculateRoute(
  origin: Coordinates,
  destination: Coordinates,
  date: Date,
): Route | null {
  if (origin.lat === destination.lat && origin.lon === destination.lon) {
    return null;
  }

  const originPt: [number, number] = [origin.lon, origin.lat];
  const destinationPt: [number, number] = [destination.lon, destination.lat];

  const trueBearing = (bearing(originPt, destinationPt) + 360) % 360;
  const { decl: magneticVariation } = magneticModelAt(date).point([
    origin.lat,
    origin.lon,
  ]);

  return {
    magneticHeading: magneticHeadingFrom(trueBearing, magneticVariation),
    trueBearing,
    magneticVariation,
    distanceNm: distance(originPt, destinationPt, { units: 'nauticalmiles' }),
    distanceKm: distance(originPt, destinationPt, { units: 'kilometers' }),
  };
}

export function formatRoute(route: Route): FormattedRoute {
  const variation = route.magneticVariation;
  return {
    magneticHeading: String(route.magneticHeading).padStart(3, '0'),
    trueBearing: route.trueBearing.toFixed(1).padStart(5, '0'),
    magneticVariation: `${Math.abs(variation).toFixed(1)}° ${variation >= 0 ? 'E' : 'W'}`,
    distanceNm: Math.round(route.distanceNm).toLocaleString('en-US'),
    distanceKm: Math.round(route.distanceKm).toLocaleString('en-US'),
  };
}
