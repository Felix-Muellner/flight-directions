/// <reference types="node" />
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..');
const WORKFLOW = join(ROOT, '.github', 'workflows', 'deploy.yml');
const PAGES_BASE = '/flight-directions/';

describe('build under the GitHub Pages base path', () => {
  const outDir = join(tmpdir(), `flight-directions-pages-${process.pid}`);
  let previous: string | undefined;

  beforeAll(async () => {
    // The deploy workflow passes the Pages base path to the build this way.
    previous = process.env.BASE_PATH;
    process.env.BASE_PATH = PAGES_BASE;
    await build({ root: ROOT, logLevel: 'silent', build: { outDir } });
  }, 120_000);

  afterAll(() => {
    if (previous === undefined) delete process.env.BASE_PATH;
    else process.env.BASE_PATH = previous;
    rmSync(outDir, { recursive: true, force: true });
  });

  it('loads its scripts and styles from under the base path', () => {
    const html = readFileSync(join(outDir, 'index.html'), 'utf8');
    const local = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((url) => !url.startsWith('https://'));
    expect(local.length).toBeGreaterThan(0);
    for (const url of local) expect(url.startsWith(PAGES_BASE)).toBe(true);
  });

  const stylesheets = () => {
    const assets = join(outDir, 'assets');
    return readdirSync(assets)
      .filter((name) => name.endsWith('.css'))
      .map((name) => readFileSync(join(assets, name), 'utf8'))
      .join('\n');
  };

  it('loads no resources from third-party hosts', () => {
    const html = readFileSync(join(outDir, 'index.html'), 'utf8');
    const htmlUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(
      (match) => match[1],
    );
    const cssUrls = [...stylesheets().matchAll(/url\(([^)]+)\)/g)].map(
      (match) => match[1].replace(/^["']|["']$/g, ''),
    );
    expect(htmlUrls.length).toBeGreaterThan(0);
    for (const url of [...htmlUrls, ...cssUrls]) {
      expect(url, url).not.toMatch(/^(?:https?:)?\/\//);
    }
  });

  it.each([
    ['JetBrains Mono', 400],
    ['JetBrains Mono', 600],
    ['JetBrains Mono', 700],
    ['Plus Jakarta Sans', 400],
    ['Plus Jakarta Sans', 600],
  ])('bundles %s %i under the base path', (family, weight) => {
    const faces = [...stylesheets().matchAll(/@font-face\{([^}]*)\}/g)]
      .map((match) => match[1])
      .filter(
        (face) =>
          face.includes(`font-family:${family}`) &&
          face.includes(`font-weight:${weight}`),
      );
    expect(faces.length).toBeGreaterThan(0);
    for (const face of faces) {
      for (const [, url] of face.matchAll(/url\(([^)]+)\)/g)) {
        // Vite inlines small files; those come from the site itself.
        if (url.startsWith('data:font/')) continue;
        expect(url.startsWith(`${PAGES_BASE}assets/`), url).toBe(true);
        const file = url.slice(PAGES_BASE.length);
        expect(existsSync(join(outDir, file)), file).toBe(true);
      }
    }
  });

  it('loads the bundled snapshot and links the licence under the base path', () => {
    const assets = join(outDir, 'assets');
    const scripts = readdirSync(assets)
      .filter((name) => name.endsWith('.js'))
      .map((name) => readFileSync(join(assets, name), 'utf8'))
      .join('\n');
    // The exact URLs: the test build embeds absolute source paths, which may
    // contain /flight-directions/ on their own.
    expect(scripts).toContain(`${PAGES_BASE}airports.json`);
    expect(scripts).toContain(`${PAGES_BASE}LICENSE-mwgg-Airports`);
    expect(existsSync(join(outDir, 'airports.json'))).toBe(true);
    expect(existsSync(join(outDir, 'LICENSE-mwgg-Airports'))).toBe(true);
  });
});

describe('deploy workflow', () => {
  const workflow = existsSync(WORKFLOW) ? readFileSync(WORKFLOW, 'utf8') : '';
  const job = (name: string) => {
    const start = workflow.indexOf(`\n  ${name}:\n`);
    if (start < 0) return '';
    const next = workflow.slice(start + 1).search(/\n {2}[a-z-]+:\n/);
    return next < 0
      ? workflow.slice(start)
      : workflow.slice(start, start + 1 + next);
  };

  it('starts only manually', () => {
    const on = /\non:\n((?: {2}.*\n|\n)+)/.exec(workflow)?.[1] ?? '';
    expect(on.trim()).toBe('workflow_dispatch:');
  });

  it('deploys only from main', () => {
    expect(job('build')).toMatch(/if: github\.ref == 'refs\/heads\/main'/);
  });

  it('runs every check before building the site', () => {
    const steps = job('build');
    const order = [
      'npm ci',
      'npm run lint',
      'npm run typecheck',
      'npm test',
      'npm run secrets',
      'npm run build',
      'actions/upload-pages-artifact',
    ].map((step) => steps.indexOf(step));
    for (const index of order) expect(index).toBeGreaterThan(-1);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('builds with the Pages base path', () => {
    expect(job('build')).toMatch(
      /BASE_PATH: \$\{\{ steps\.pages\.outputs\.base_path \}\}\//,
    );
  });

  it('deploys only after the build job succeeds', () => {
    const deploy = job('deploy');
    expect(deploy).toMatch(/needs: build/);
    expect(deploy).toContain('actions/deploy-pages');
  });
});
