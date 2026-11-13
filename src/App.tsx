import { ArrowLeftRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type AirportDatabaseLoader,
  type AirportDatabaseState,
  BUNDLED_SNAPSHOT_DATE,
  loadAirportDatabase as defaultLoadAirportDatabase,
} from './airportDatabase.ts';
import { resolveLocation, type StatusSeverity } from './location.ts';
import { calculateRoute, formatRoute } from './route.ts';

interface LocationFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  status: string;
  severity: StatusSeverity;
  onChange: (value: string) => void;
}

interface AppProps {
  loadAirportDatabase?: AirportDatabaseLoader;
  now?: () => Date;
}

const currentDate = () => new Date();

const STATUS_TEXT = {
  neutral: 'text-slate-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
} as const;

type FieldStyle = keyof typeof STATUS_TEXT;

function fieldStyleFor(severity: StatusSeverity, focused: boolean): FieldStyle {
  if (severity === 'error') return focused ? 'neutral' : 'error';
  if (severity === 'warning') return 'warning';
  return 'neutral';
}

function LocationField({
  id,
  label,
  placeholder,
  value,
  status,
  severity,
  onChange,
}: LocationFieldProps) {
  // The error style shows only while the field is not focused, so a
  // half-typed input does not flash red. It depends on nothing but the
  // current input and focus, so a swap or a late airport database needs no
  // extra handling.
  const [focused, setFocused] = useState(false);
  const style = fieldStyleFor(severity, focused);

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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-describedby={`${id}-status`}
        aria-invalid={style === 'error' ? true : undefined}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={`w-full h-11 px-3.5 bg-canvas border ${style === 'error' ? 'border-red-500' : 'border-line'} rounded text-sm font-mono tabular-nums text-slate-100 placeholder:text-slate-600 focus:outline-none focus-visible:border-sky-400 transition-colors`}
      />
      <p
        id={`${id}-status`}
        data-style={style}
        className={`mt-1.5 h-4 leading-4 text-xs font-mono ${STATUS_TEXT[style]} truncate`}
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
  const [airportDatabase, setAirportDatabase] = useState<AirportDatabaseState>({
    kind: 'loading',
  });

  useEffect(() => {
    const controller = new AbortController();

    loadAirportDatabase(controller.signal).then(
      (database) => {
        if (!controller.signal.aborted) {
          setAirportDatabase({ kind: 'loaded', database });
        }
      },
      () => {
        if (!controller.signal.aborted) setAirportDatabase({ kind: 'failed' });
      },
    );

    return () => controller.abort();
  }, [loadAirportDatabase]);

  const origin = useMemo(
    () => resolveLocation(originInput, airportDatabase),
    [originInput, airportDatabase],
  );

  const destination = useMemo(
    () => resolveLocation(destinationInput, airportDatabase),
    [destinationInput, airportDatabase],
  );

  const route = useMemo(() => {
    if (!origin.point || !destination.point) return null;
    return formatRoute(calculateRoute(origin.point, destination.point, now()));
  }, [origin.point, destination.point, now]);

  const handleSwap = useCallback(() => {
    setOriginInput(destinationInput);
    setDestinationInput(originInput);
  }, [originInput, destinationInput]);

  return (
    <div className="min-h-screen bg-canvas text-slate-100 flex flex-col items-center justify-center gap-4 p-6">
      <main className="w-full max-w-xl">
        <section
          aria-label="Magnetic Heading Calculator"
          className="w-full max-w-xl bg-[#111827] border border-line rounded-lg p-6 sm:p-8"
        >
          <header className="mb-6 pb-4 border-b border-line flex items-baseline justify-between gap-4">
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
              severity={origin.severity}
              onChange={setOriginInput}
            />

            <div className="flex sm:mt-6 justify-center">
              <button
                type="button"
                onClick={handleSwap}
                aria-label="Swap origin and destination"
                title="Swap origin and destination"
                className="h-11 px-3 bg-canvas border border-line hover:border-slate-600 focus:outline-none focus-visible:border-sky-400 rounded text-slate-300 hover:text-slate-100 transition-colors flex items-center justify-center gap-1.5 text-xs font-mono whitespace-nowrap shrink-0 cursor-pointer"
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
              severity={destination.severity}
              onChange={setDestinationInput}
            />
          </div>

          <div className="pt-6 border-t border-line flex flex-col sm:flex-row sm:items-end justify-between gap-6">
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

      <footer className="w-full max-w-xl px-1 text-xs font-mono text-slate-500">
        Airport data:{' '}
        <a
          href="https://github.com/mwgg/Airports"
          className="underline hover:text-slate-300"
        >
          mwgg/Airports
        </a>{' '}
        (
        <a
          href={`${import.meta.env.BASE_URL}LICENSE-mwgg-Airports`}
          className="underline hover:text-slate-300"
        >
          MIT
        </a>
        ) <span className="whitespace-nowrap">· {BUNDLED_SNAPSHOT_DATE}</span>
      </footer>
    </div>
  );
}
