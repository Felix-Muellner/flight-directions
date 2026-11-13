declare module 'geomagnetism' {
  export interface GeomagnetismPoint {
    decl: number;
    incl: number;
    f: number;
    h: number;
    x: number;
    y: number;
    z: number;
  }

  export interface GeomagnetismModel {
    point(coords: [latitude: number, longitude: number]): GeomagnetismPoint;
  }

  export interface ModelOptions {
    /** Extrapolate with the latest model instead of throwing outside its validity range. */
    allowOutOfBoundsModel?: boolean;
  }

  export function model(date?: Date, options?: ModelOptions): GeomagnetismModel;

  const geomagnetism: {
    model: typeof model;
  };

  export default geomagnetism;
}
