/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import bearing from '@turf/bearing';
import distance from '@turf/distance';
import geomagnetism from 'geomagnetism';
import { ArrowLeftRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface AirportEntry {
  icao: string;
  iata?: string;
  name: string;
  lat: number;
  lon: number;
}

interface Coordinates {
  lat: number;
  lon: number;
}

interface ResolutionResult {
  point: Coordinates | null;
  status: string;
}

interface FlightCalculation {
  autopilotHdg: string;
  trueBearing: string;
  declination: string;
  distanceNm: string;
  distanceKm: string;
}

interface LocationFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  status: string;
  onChange: (value: string) => void;
}

const AIRPORTS_CDN_URLS = [
  'https://cdn.jsdelivr.net/gh/mwgg/Airports@master/airports.json',
  'https://raw.githubusercontent.com/mwgg/Airports/master/airports.json',
] as const;

const DECIMAL_COORD_REGEX =
  /^([+-]?\d+(?:\.\d+)?)\s*°?\s*([NSns])?[\s,;]+([+-]?\d+(?:\.\d+)?)\s*°?\s*([EWew])?$/;

const DMS_COORD_REGEX =
  /^(\d{1,2})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*["″]?\s*([NSns])[\s,;]+(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*["″]?\s*([EWew])$/;

const AIRPORT_CODE_REGEX = /^[A-Z0-9]{3,4}$/;

const wmmModel = geomagnetism.model();

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

function parseCoordinates(raw: string): Coordinates | null {
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

function resolveLocation(
  raw: string,
  airportIndex: Map<string, AirportEntry> | null,
  hasDbError: boolean,
): ResolutionResult {
  const trimmed = raw.trim();
  if (!trimmed) return { point: null, status: '' };

  const coords = parseCoordinates(trimmed);
  if (coords) {
    return {
      point: coords,
      status: `${coords.lat.toFixed(4)}°, ${coords.lon.toFixed(4)}°`,
    };
  }

  const code = trimmed.toUpperCase();
  if (AIRPORT_CODE_REGEX.test(code)) {
    if (!airportIndex) {
      return {
        point: null,
        status: hasDbError
          ? 'Airport database offline'
          : 'Loading airport database...',
      };
    }

    const airport = airportIndex.get(code);
    if (airport) {
      const codeDisplay = airport.iata
        ? `${airport.icao} / ${airport.iata}`
        : airport.icao;
      return {
        point: { lat: airport.lat, lon: airport.lon },
        status: `${codeDisplay} · ${airport.name}`,
      };
    }

    return { point: null, status: 'Airport code not found' };
  }

  return { point: null, status: 'Enter ICAO, IATA, or lat, lon' };
}

function calculateFlightData(
  from: Coordinates,
  to: Coordinates,
): FlightCalculation | null {
  if (from.lat === to.lat && from.lon === to.lon) {
    return null;
  }

  const fromPt: [number, number] = [from.lon, from.lat];
  const toPt: [number, number] = [to.lon, to.lat];

  const trueBearing = (bearing(fromPt, toPt) + 360) % 360;
  const distNm = distance(fromPt, toPt, { units: 'nauticalmiles' });
  const distKm = distance(fromPt, toPt, { units: 'kilometers' });

  const { decl: declination } = wmmModel.point([from.lat, from.lon]);
  const rawMagHeading = (trueBearing - declination + 360) % 360;
  const roundedMag = Math.round(rawMagHeading);
  const autopilotHdg = roundedMag === 0 ? 360 : roundedMag;

  return {
    autopilotHdg: String(autopilotHdg).padStart(3, '0'),
    trueBearing: trueBearing.toFixed(1).padStart(5, '0'),
    declination: `${Math.abs(declination).toFixed(1)}° ${declination >= 0 ? 'E' : 'W'}`,
    distanceNm: Math.round(distNm).toLocaleString('en-US'),
    distanceKm: Math.round(distKm).toLocaleString('en-US'),
  };
}

function LocationField({
  id,
  label,
  placeholder,
  value,
  status,
  onChange,
}: LocationFieldProps) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="block h-4 leading-4 text-xs font-mono text-slate-400 mb-2 whitespace-nowrap truncate"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="w-full h-11 px-3.5 bg-[#07090E] border border-[#1E293B] rounded text-sm font-mono tabular-nums text-slate-100 placeholder:text-slate-600 focus:outline-none focus-visible:border-sky-400 transition-colors"
      />
      <p
        className="mt-1.5 h-4 leading-4 text-xs font-mono text-slate-400 truncate"
        title={status}
      >
        {status}
      </p>
    </div>
  );
}

export default function App() {
  const [originInput, setOriginInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [airportIndex, setAirportIndex] = useState<Map<
    string,
    AirportEntry
  > | null>(null);
  const [hasDbError, setHasDbError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAirports() {
      for (const url of AIRPORTS_CDN_URLS) {
        try {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) continue;

          const data: Record<string, AirportEntry> = await response.json();
          const map = new Map<string, AirportEntry>();

          for (const entry of Object.values(data)) {
            if (
              entry &&
              typeof entry.lat === 'number' &&
              typeof entry.lon === 'number'
            ) {
              if (entry.icao) {
                map.set(entry.icao.toUpperCase(), entry);
              }
              if (entry.iata && entry.iata.length === 3) {
                map.set(entry.iata.toUpperCase(), entry);
              }
            }
          }

          setAirportIndex(map);
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            return;
          }
        }
      }

      setHasDbError(true);
    }

    loadAirports();
    return () => controller.abort();
  }, []);

  const originResolved = useMemo(
    () => resolveLocation(originInput, airportIndex, hasDbError),
    [originInput, airportIndex, hasDbError],
  );

  const destinationResolved = useMemo(
    () => resolveLocation(destinationInput, airportIndex, hasDbError),
    [destinationInput, airportIndex, hasDbError],
  );

  const calculation = useMemo(() => {
    if (!originResolved.point || !destinationResolved.point) return null;
    return calculateFlightData(originResolved.point, destinationResolved.point);
  }, [originResolved.point, destinationResolved.point]);

  const handleSwap = useCallback(() => {
    setOriginInput(destinationInput);
    setDestinationInput(originInput);
  }, [originInput, destinationInput]);

  return (
    <main className="min-h-screen bg-[#07090E] text-slate-100 flex items-center justify-center p-6">
      <section
        aria-label="Magnetic Heading Calculator"
        className="w-full max-w-xl bg-[#111827] border border-[#1E293B] rounded-lg p-6 sm:p-8"
      >
        <header className="mb-6 pb-4 border-b border-[#1E293B] flex items-baseline justify-between gap-4">
          <h1 className="text-lg font-semibold tracking-tight text-slate-100 whitespace-nowrap">
            Flight Directions
          </h1>
          <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
            ICAO · IATA · COORDS
          </span>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-start gap-4 mb-8">
          <LocationField
            id="origin-input"
            label="ORIGIN"
            placeholder="KJFK or 40.6413, -73.7781"
            value={originInput}
            status={originResolved.status}
            onChange={setOriginInput}
          />

          <div className="flex sm:mt-6 justify-center">
            <button
              type="button"
              onClick={handleSwap}
              aria-label="Swap origin and destination"
              title="Swap origin and destination"
              className="h-11 px-3 bg-[#07090E] border border-[#1E293B] hover:border-slate-600 focus:outline-none focus-visible:border-sky-400 rounded text-slate-300 hover:text-slate-100 transition-colors flex items-center justify-center gap-1.5 text-xs font-mono whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span className="sm:hidden">Swap</span>
            </button>
          </div>

          <LocationField
            id="destination-input"
            label="DESTINATION"
            placeholder="EGLL or 51.4706, -0.4619"
            value={destinationInput}
            status={destinationResolved.status}
            onChange={setDestinationInput}
          />
        </div>

        <div className="pt-6 border-t border-[#1E293B] flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="text-xs font-mono text-slate-400 mb-1 whitespace-nowrap">
              MAGNETIC HEADING (HDG)
            </div>
            <div
              aria-live="polite"
              className="text-5xl leading-none font-mono font-bold tabular-nums tracking-tight text-sky-400"
            >
              {calculation ? `${calculation.autopilotHdg}°` : '---°'}
            </div>
          </div>

          <dl className="grid grid-cols-[2.75rem_1fr] gap-x-4 gap-y-1 text-xs font-mono tabular-nums sm:min-w-[13.5rem]">
            <dt className="text-slate-500">DIST</dt>
            <dd className="text-right text-slate-300 whitespace-nowrap">
              {calculation
                ? `${calculation.distanceNm} NM · ${calculation.distanceKm} km`
                : '--- NM · --- km'}
            </dd>
            <dt className="text-slate-500">TRUE</dt>
            <dd className="text-right text-slate-300 whitespace-nowrap">
              {calculation ? `${calculation.trueBearing}°` : '---.-°'}
            </dd>
            <dt className="text-slate-500">VAR</dt>
            <dd className="text-right text-slate-300 whitespace-nowrap">
              {calculation ? calculation.declination : '--.-°'}
            </dd>
          </dl>
        </div>
      </section>
    </main>
  );
}
