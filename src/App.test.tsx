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

  describe('invalid location input', () => {
    const statusElement = (input: HTMLInputElement) =>
      document.getElementById(
        input.getAttribute('aria-describedby') ?? '',
      ) as HTMLElement;

    it.each([
      ['-48.2 N, 14.0', 'Sign contradicts hemisphere letter'],
      [`48°61'00"N 14°00'00"E`, 'Minutes and seconds must be below 60'],
      ['91, 0', 'Latitude must be between 90° S and 90° N'],
      ['3f8jg9f8j', 'Enter ICAO, IATA, or lat, lon'],
    ])(
      'names the problem for %s and marks it after leaving the field',
      async (raw, message) => {
        const { user } = renderApp();
        await user.type(originInput(), raw);
        expect(statusOf(originInput())).toBe(message);
        expect(originInput().getAttribute('aria-invalid')).not.toBe('true');
        expect(statusElement(originInput()).dataset.style).toBe('neutral');

        await user.tab();
        expect(originInput().getAttribute('aria-invalid')).toBe('true');
        expect(statusElement(originInput()).dataset.style).toBe('error');
        expect(originInput().className).toContain('border-red-500');
      },
    );

    it('shows not found as an error after leaving the field', async () => {
      const { user } = renderApp();
      await screen.findByLabelText('ORIGIN');
      await user.type(originInput(), 'ZZZZ');
      await screen.findByText('Airport code not found');
      await user.tab();
      expect(originInput().getAttribute('aria-invalid')).toBe('true');
    });

    it('removes the error style while the field has focus', async () => {
      const { user } = renderApp();
      await user.type(originInput(), '91, 0');
      await user.tab();
      expect(originInput().getAttribute('aria-invalid')).toBe('true');

      await user.click(originInput());
      expect(statusOf(originInput())).toBe(
        'Latitude must be between 90° S and 90° N',
      );
      expect(originInput().getAttribute('aria-invalid')).not.toBe('true');
      expect(statusElement(originInput()).dataset.style).toBe('neutral');
    });

    it('shows the error style again when the field is left still invalid', async () => {
      const { user } = renderApp();
      await user.type(originInput(), '91, 0');
      await user.tab();
      await user.click(originInput());
      await user.type(originInput(), '0');
      await user.tab();
      expect(originInput().getAttribute('aria-invalid')).toBe('true');
      expect(statusElement(originInput()).dataset.style).toBe('error');
    });

    it('does not mark input that became valid before leaving the field', async () => {
      const { user } = renderApp();
      await user.type(originInput(), '91, 0');
      await user.tab();
      await user.click(originInput());
      await user.clear(originInput());
      await user.type(originInput(), '48, 14');
      await user.tab();
      expect(statusOf(originInput())).toBe('48.0000°, 14.0000°');
      expect(originInput().getAttribute('aria-invalid')).not.toBe('true');
      expect(statusElement(originInput()).dataset.style).toBe('neutral');
    });

    it('moves the error style with the input when the fields are swapped', async () => {
      const { user } = renderApp();
      await user.type(originInput(), '48, 14');
      await user.type(destinationInput(), '91, 0');
      await user.click(
        screen.getByRole('button', { name: 'Swap origin and destination' }),
      );
      expect(originInput().getAttribute('aria-invalid')).toBe('true');
      expect(destinationInput().getAttribute('aria-invalid')).not.toBe('true');
      expect(statusElement(destinationInput()).dataset.style).toBe('neutral');
    });

    it('removes the error style when the field is emptied', async () => {
      const { user } = renderApp();
      await user.type(originInput(), '91, 0');
      await user.tab();
      await user.clear(originInput());
      await user.tab();
      expect(originInput().getAttribute('aria-invalid')).not.toBe('true');
      expect(statusElement(originInput()).dataset.style).toBe('neutral');
    });

    it('marks not found as an error when the airport database arrives after leaving the field', async () => {
      let resolveDatabase: (database: AirportDatabase) => void = () => {};
      const { user } = renderApp(
        () =>
          new Promise<AirportDatabase>((resolve) => {
            resolveDatabase = resolve;
          }),
      );
      await user.type(originInput(), 'ZZZZ');
      expect(statusOf(originInput())).toBe('Loading airport database...');
      await user.tab();
      expect(originInput().getAttribute('aria-invalid')).not.toBe('true');

      resolveDatabase(fixtureDatabase);
      await screen.findByText('Airport code not found');
      expect(originInput().getAttribute('aria-invalid')).toBe('true');
      expect(statusElement(originInput()).dataset.style).toBe('error');
    });

    it('does not mark a loading airport code that is found after leaving the field', async () => {
      let resolveDatabase: (database: AirportDatabase) => void = () => {};
      const { user } = renderApp(
        () =>
          new Promise<AirportDatabase>((resolve) => {
            resolveDatabase = resolve;
          }),
      );
      await user.type(originInput(), 'KJFK');
      await user.tab();
      resolveDatabase(fixtureDatabase);
      await screen.findByText(/John F Kennedy/);
      expect(originInput().getAttribute('aria-invalid')).not.toBe('true');
      expect(statusElement(originInput()).dataset.style).toBe('neutral');
    });

    it('shows the offline airport database as a warning, not an error', async () => {
      const { user } = renderApp(failsToLoad);
      await user.type(originInput(), 'KJFK');
      await screen.findByText('Airport database offline');
      await user.tab();
      expect(originInput().getAttribute('aria-invalid')).not.toBe('true');
      expect(statusElement(originInput()).dataset.style).toBe('warning');
    });

    it('does not mark a valid input after leaving the field', async () => {
      const { user } = renderApp();
      await user.type(originInput(), '48.2, 14');
      await user.tab();
      expect(originInput().getAttribute('aria-invalid')).not.toBe('true');
      expect(statusElement(originInput()).dataset.style).toBe('neutral');
    });

    it('does not mark an error while typing after leaving a valid field', async () => {
      const { user } = renderApp();
      await user.type(originInput(), '48.2, 14');
      await user.tab();
      await user.click(originInput());
      await user.type(originInput(), 'x');
      expect(statusOf(originInput())).toBe('Enter ICAO, IATA, or lat, lon');
      expect(originInput().getAttribute('aria-invalid')).not.toBe('true');
      expect(statusElement(originInput()).dataset.style).toBe('neutral');
    });

    it('does not mark an error while typing after leaving an empty field', async () => {
      const { user } = renderApp();
      await user.click(originInput());
      await user.tab();
      await user.click(originInput());
      await user.type(originInput(), 'K');
      expect(originInput().getAttribute('aria-invalid')).not.toBe('true');
      expect(statusElement(originInput()).dataset.style).toBe('neutral');
    });

    it('removes the error style when an error is edited straight into valid input', async () => {
      const { user } = renderApp();
      await user.type(originInput(), '48.2, 14x');
      await user.tab();
      expect(originInput().getAttribute('aria-invalid')).toBe('true');
      await user.click(originInput());
      await user.keyboard('{Backspace}');
      expect(statusOf(originInput())).toBe('48.2000°, 14.0000°');
      expect(originInput().getAttribute('aria-invalid')).not.toBe('true');
      expect(statusElement(originInput()).dataset.style).toBe('neutral');
    });
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
