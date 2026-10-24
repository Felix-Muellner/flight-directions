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

  export function model(date?: Date): GeomagnetismModel;

  const geomagnetism: {
    model: typeof model;
  };

  export default geomagnetism;
}
