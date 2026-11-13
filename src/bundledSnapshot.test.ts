/// <reference types="node" />
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isValidAirportEntry } from './airportDatabase.ts';

const ROOT = join(import.meta.dirname, '..');
const SNAPSHOT = join(ROOT, 'data', 'airports.json');
const LICENCE = join(ROOT, 'data', 'LICENSE-mwgg-Airports');

describe('bundled snapshot in data/', () => {
  // The file is the original, untrimmed airports.json of mwgg/Airports: all
  // airports with all their fields, in the source's own formatting.
  it('stores the original airports.json of mwgg/Airports', () => {
    const text = readFileSync(SNAPSHOT, 'utf8');
    const data = JSON.parse(text) as Record<string, Record<string, unknown>>;
    const entries = Object.values(data);

    expect(entries.length).toBeGreaterThan(25_000);
    expect(data.KJFK).toMatchObject({
      icao: 'KJFK',
      iata: 'JFK',
      name: 'John F Kennedy International Airport',
    });
    for (const field of [
      'city',
      'state',
      'country',
      'elevation',
      'lat',
      'lon',
      'tz',
    ]) {
      expect(data.KJFK).toHaveProperty(field);
    }
    expect(entries.filter(isValidAirportEntry).length).toBeGreaterThan(25_000);
    // Untouched formatting: not re-serialised compactly.
    expect(text).not.toBe(JSON.stringify(data));
  });

  it('stores the mwgg/Airports MIT licence next to it', () => {
    const licence = readFileSync(LICENCE, 'utf8');
    expect(licence).toMatch(/^The MIT License/);
    expect(licence).toMatch(/Copyright \(c\)/);
    expect(licence).toContain(
      'The above copyright notice and this permission notice shall be included in all',
    );
  });
});

describe('production build', () => {
  const outDir = join(tmpdir(), `flight-directions-build-${process.pid}`);

  beforeAll(async () => {
    await build({ root: ROOT, logLevel: 'silent', build: { outDir } });
  }, 120_000);

  afterAll(() => rmSync(outDir, { recursive: true, force: true }));

  it('ships airports.json unchanged as a separate static asset', () => {
    // Buffer.equals: toEqual walks a 9 MB buffer byte by byte.
    const shipped = readFileSync(join(outDir, 'airports.json'));
    expect(shipped.equals(readFileSync(SNAPSHOT))).toBe(true);
  });

  it('ships the licence unchanged next to the bundled snapshot', () => {
    const shipped = readFileSync(join(outDir, 'LICENSE-mwgg-Airports'));
    expect(shipped.equals(readFileSync(LICENCE))).toBe(true);
  });

  it('neither inlines the airport data nor points at jsDelivr or GitHub', () => {
    const assets = join(outDir, 'assets');
    const scripts = readdirSync(assets)
      .filter((name) => name.endsWith('.js'))
      .map((name) => readFileSync(join(assets, name), 'utf8'))
      .join('\n');
    expect(scripts).not.toContain('John F Kennedy International Airport');
    expect(scripts).not.toMatch(/jsdelivr|raw\.githubusercontent/);
  });
});

describe('README', () => {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');

  it('names mwgg/Airports as the airport data source and links its licence', () => {
    expect(readme).toContain('https://github.com/mwgg/Airports');
    expect(readme).toContain('(data/LICENSE-mwgg-Airports)');
  });

  it('repeats the time zone credit of mwgg/Airports exactly', () => {
    expect(readme.replace(/\s+/g, ' ')).toContain(
      'Per mwgg/Airports, its time zones were initially sourced from TimeZoneDB and updated using TimeAPI.',
    );
  });
});
