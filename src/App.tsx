/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { ArrowLeftRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type AirportDatabase,
  type AirportDatabaseLoader,
  loadAirportDatabase as defaultLoadAirportDatabase,
} from './airportDatabase.ts';
import { resolveLocation } from './location.ts';
import { calculateRoute, formatRoute } from './route.ts';

interface LocationFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  status: string;
  onChange: (value: string) => void;
}

interface AppProps {
  loadAirportDatabase?: AirportDatabaseLoader;
  now?: () => Date;
}

const currentDate = () => new Date();

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
        aria-describedby={`${id}-status`}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="w-full h-11 px-3.5 bg-[#07090E] border border-[#1E293B] rounded text-sm font-mono tabular-nums text-slate-100 placeholder:text-slate-600 focus:outline-none focus-visible:border-sky-400 transition-colors"
      />
      <p
        id={`${id}-status`}
        className="mt-1.5 h-4 leading-4 text-xs font-mono text-slate-400 truncate"
        title={status}
      >
        {status}
      </p>
    </div>
  );
}

export default function App({
  loadAirportDatabase = defaultLoadAirportDatabase,
  now = currentDate,
}: AppProps = {}) {
  const [originInput, setOriginInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [airportDatabase, setAirportDatabase] =
    useState<AirportDatabase | null>(null);
  const [hasAirportDatabaseError, setHasAirportDatabaseError] = useState(false);
  const date = useMemo(() => now(), [now]);

  useEffect(() => {
    const controller = new AbortController();

    loadAirportDatabase(controller.signal).then(
      (database) => {
        if (!controller.signal.aborted) setAirportDatabase(database);
      },
      () => {
        if (!controller.signal.aborted) setHasAirportDatabaseError(true);
      },
    );

    return () => controller.abort();
  }, [loadAirportDatabase]);

  const origin = useMemo(
    () =>
      resolveLocation(originInput, airportDatabase, hasAirportDatabaseError),
    [originInput, airportDatabase, hasAirportDatabaseError],
  );

  const destination = useMemo(
    () =>
      resolveLocation(
        destinationInput,
        airportDatabase,
        hasAirportDatabaseError,
      ),
    [destinationInput, airportDatabase, hasAirportDatabaseError],
  );

  const route = useMemo(() => {
    if (!origin.point || !destination.point) return null;
    return formatRoute(calculateRoute(origin.point, destination.point, date));
  }, [origin.point, destination.point, date]);

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
            status={origin.status}
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
            status={destination.status}
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
              {route ? `${route.magneticHeading}°` : '---°'}
            </div>
          </div>

          <dl className="grid grid-cols-[2.75rem_1fr] gap-x-4 gap-y-1 text-xs font-mono tabular-nums sm:min-w-[13.5rem]">
            <dt className="text-slate-500">DIST</dt>
            <dd className="text-right text-slate-300 whitespace-nowrap">
              {route
                ? `${route.distanceNm} NM · ${route.distanceKm} km`
                : '--- NM · --- km'}
            </dd>
            <dt className="text-slate-500">TRUE</dt>
            <dd className="text-right text-slate-300 whitespace-nowrap">
              {route ? `${route.trueBearing}°` : '---.-°'}
            </dd>
            <dt className="text-slate-500">VAR</dt>
            <dd className="text-right text-slate-300 whitespace-nowrap">
              {route ? route.magneticVariation : '--.-°'}
            </dd>
          </dl>
        </div>

        <p
          role="status"
          className="mt-4 min-h-4 leading-4 text-xs font-mono text-amber-400"
        >
          {route?.notice}
        </p>
      </section>
    </main>
  );
}
