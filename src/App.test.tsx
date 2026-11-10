// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
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
    expect(await screen.findByText('Airport database offline')).toBeTruthy();
  });

  it('shows not found for an unknown airport code', async () => {
    const { user } = renderApp();
    await screen.findByLabelText('ORIGIN');
    await user.type(originInput(), 'ZZZZ');
    expect(await screen.findByText('Airport code not found')).toBeTruthy();
  });

  it('shows the input hint for unrecognised location input', async () => {
    const { user } = renderApp();
    await user.type(originInput(), 'hello world');
    expect(statusOf(originInput())).toBe('Enter ICAO, IATA, or lat, lon');
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
  });
});
