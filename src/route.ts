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

/** Display-ready route values. */
export interface Route {
  magneticHeading: string;
  trueBearing: string;
  magneticVariation: string;
  distanceNm: string;
  distanceKm: string;
}

/**
 * Calculates the route from origin to destination.
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
  const distNm = distance(originPt, destinationPt, { units: 'nauticalmiles' });
  const distKm = distance(originPt, destinationPt, { units: 'kilometers' });

  const { decl: magneticVariation } = magneticModelAt(date).point([
    origin.lat,
    origin.lon,
  ]);
  const rawMagneticHeading = (trueBearing - magneticVariation + 360) % 360;
  const rounded = Math.round(rawMagneticHeading);
  const magneticHeading = rounded === 0 ? 360 : rounded;

  return {
    magneticHeading: String(magneticHeading).padStart(3, '0'),
    trueBearing: trueBearing.toFixed(1).padStart(5, '0'),
    magneticVariation: `${Math.abs(magneticVariation).toFixed(1)}° ${magneticVariation >= 0 ? 'E' : 'W'}`,
    distanceNm: Math.round(distNm).toLocaleString('en-US'),
    distanceKm: Math.round(distKm).toLocaleString('en-US'),
  };
}
