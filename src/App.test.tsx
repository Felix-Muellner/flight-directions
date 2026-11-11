// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App.tsx';
import {
  type AirportDatabase,
  buildAirportDatabase,
} from './airportDatabase.ts';

const FIXED_DATE = new Date('2026-06-01T00:00:00Z');

const fixtureDatabase = buildAirportDatabase({
  KJFK: {
    icao: 'KJFK',
    iata: 'JFK',
    name: 'John F Kennedy International Airport',
    lat: 40.639801,
    lon: -73.7789,
  },
  EGLL: {
    icao: 'EGLL',
    iata: 'LHR',
    name: 'London Heathrow Airport',
    lat: 51.4706,
    lon: -0.461941,
  },
});

const loaded = () => Promise.resolve(fixtureDatabase);
const neverLoads = () => new Promise<AirportDatabase>(() => {});
const failsToLoad = () => Promise.reject(new Error('offline'));

function renderApp(
  loadAirportDatabase: () => Promise<AirportDatabase> = loaded,
) {
  const user = userEvent.setup();
  render(
    <App loadAirportDatabase={loadAirportDatabase} now={() => FIXED_DATE} />,
  );
  return { user };
}

const originInput = () => screen.getByLabelText('ORIGIN') as HTMLInputElement;
const destinationInput = () =>
  screen.getByLabelText('DESTINATION') as HTMLInputElement;

function statusOf(input: HTMLInputElement): string {
  const id = input.getAttribute('aria-describedby');
  const status = id ? document.getElementById(id) : null;
  if (!status) throw new Error(`no status element for ${input.id}`);
  return status.textContent ?? '';
}

const magneticHeading = () =>
  screen.getByText('MAGNETIC HEADING (HDG)').nextElementSibling?.textContent;
const valueFor = (term: string) =>
  screen.getByText(term).nextElementSibling?.textContent;

afterEach(cleanup);

describe('App', () => {
  it('shows empty status and placeholders before any location input', () => {
    renderApp();
    expect(statusOf(originInput())).toBe('');
    expect(statusOf(destinationInput())).toBe('');
    expect(magneticHeading()).toBe('---°');
    expect(valueFor('DIST')).toBe('--- NM · --- km');
    expect(valueFor('TRUE')).toBe('---.-°');
    expect(valueFor('VAR')).toBe('--.-°');
  });

  it('shows resolved coordinates', async () => {
    const { user } = renderApp();
    await user.type(originInput(), '40.6413, -73.7781');
    expect(statusOf(originInput())).toBe('40.6413°, -73.7781°');
  });

  it('shows the airport found in the airport database', async () => {
    const { user } = renderApp();
    await user.type(originInput(), 'kjfk');
    expect(await screen.findByText(/John F Kennedy/)).toBeTruthy();
    expect(statusOf(originInput())).toBe(
      'KJFK / JFK · John F Kennedy International Airport',
    );
  });

  it('shows loading while the airport database is loading', async () => {
    const { user } = renderApp(neverLoads);
    await user.type(originInput(), 'KJFK');
    expect(statusOf(originInput())).toBe('Loading airport database...');
  });

  it('shows offline when the airport database fails to load', async () => {
    const { user } = renderApp(failsToLoad);
    await user.type(originInput(), 'KJFK');
    await screen.findByText('Airport database offline');
    expect(statusOf(originInput())).toBe('Airport database offline');
  });

  it('shows not found for an unknown airport code', async () => {
    const { user } = renderApp();
    await screen.findByLabelText('ORIGIN');
    await user.type(originInput(), 'ZZZZ');
    await screen.findByText('Airport code not found');
    expect(statusOf(originInput())).toBe('Airport code not found');
  });

  it('shows the input hint for unrecognised location input', async () => {
    const { user } = renderApp();
    await user.type(originInput(), 'hello world');
    expect(statusOf(originInput())).toBe('Enter ICAO, IATA, or lat, lon');
  });

  it('reads the current date for every route calculation', async () => {
    const now = vi.fn(() => FIXED_DATE);
    const user = userEvent.setup();
    render(<App loadAirportDatabase={loaded} now={now} />);
    await user.type(originInput(), '48.2, 14');
    await user.type(destinationInput(), '48.11, 16.5');
    expect(screen.getByRole('status').textContent).toBe('');

    now.mockReturnValue(new Date('2030-01-01T00:00:00Z'));
    await user.type(destinationInput(), '7');
    expect(screen.getByRole('status').textContent).toBe(
      'Magnetic model expired (WMM2025) – variation may be inaccurate',
    );
    expect(magneticHeading()).toMatch(/^\d{3}°$/);
  });

  it('shows route values once origin and destination resolve', async () => {
    const { user } = renderApp();
    await user.type(originInput(), 'KJFK');
    await user.type(destinationInput(), 'EGLL');
    await screen.findByText(/London Heathrow/);
    expect(magneticHeading()).toMatch(/^\d{3}°$/);
    expect(valueFor('DIST')).toMatch(/^[\d,]+ NM · [\d,]+ km$/);
    expect(valueFor('TRUE')).toMatch(/^\d{3}\.\d°$/);
    expect(valueFor('VAR')).toMatch(/^\d+\.\d° [EW]$/);
  });

  it('swaps origin and destination', async () => {
    const { user } = renderApp();
    await user.type(originInput(), 'KJFK');
    await user.type(destinationInput(), 'EGLL');
    await user.click(
      screen.getByRole('button', { name: 'Swap origin and destination' }),
    );
    expect(originInput().value).toBe('EGLL');
    expect(destinationInput().value).toBe('KJFK');
    expect(statusOf(originInput())).toBe(
      'EGLL / LHR · London Heathrow Airport',
    );
  });

  it.each([
    ['10, 20', '10, 20', 'Origin and destination are the same point'],
    ['10, 20', '10.005, 20', 'Origin and destination too close (< 1 NM)'],
    ['10, 20', '-10, -160', 'Route direction undefined (antipodal points)'],
  ])('shows %s → %s as a degenerate route', async (from, to, message) => {
    const { user } = renderApp();
    await user.type(originInput(), from);
    await user.type(destinationInput(), to);
    expect(screen.getByText(message)).toBeTruthy();
    expect(magneticHeading()).toBe('---°');
    expect(valueFor('TRUE')).toBe('---.-°');
    expect(valueFor('DIST')).toMatch(/^[\d,]+ NM · [\d,]+ km$/);
    expect(valueFor('VAR')).toMatch(/^\d+\.\d° [EW]$/);
  });

  it('shows no route message for a normal route', async () => {
    const { user } = renderApp();
    await user.type(originInput(), '10, 20');
    await user.type(destinationInput(), '20, 30');
    expect(
      screen.queryByText(/Origin and destination|Route direction/),
    ).toBeNull();
  });

  it('withholds the magnetic heading in the blackout zone', async () => {
    const { user } = renderApp();
    await user.type(originInput(), '86, 140');
    await user.type(destinationInput(), '0, 0');
    expect(
      screen.getByText('Magnetic heading unreliable near magnetic pole'),
    ).toBeTruthy();
    expect(magneticHeading()).toBe('---°');
    expect(valueFor('TRUE')).toMatch(/^\d{3}\.\d°$/);
    expect(valueFor('VAR')).toMatch(/^\d+\.\d° [EW]$/);
    expect(valueFor('DIST')).toMatch(/^[\d,]+ NM · [\d,]+ km$/);
  });

  it('shows the magnetic heading with a note in the caution zone', async () => {
    const { user } = renderApp();
    await user.type(originInput(), '75, -100');
    await user.type(destinationInput(), '0, 0');
    expect(screen.getByText('Near magnetic pole')).toBeTruthy();
    expect(magneticHeading()).toMatch(/^\d{3}°$/);
    expect(valueFor('TRUE')).toMatch(/^\d{3}\.\d°$/);
    expect(valueFor('VAR')).toMatch(/^\d+\.\d° [EW]$/);
    expect(valueFor('DIST')).toMatch(/^[\d,]+ NM · [\d,]+ km$/);
  });
});
