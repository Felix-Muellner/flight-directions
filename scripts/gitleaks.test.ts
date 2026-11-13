/// <reference types="node" />
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = join(import.meta.dirname, 'gitleaks.sh');

// The script resolves its project root from its own location, so a copy in a
// temporary directory installs into that directory's .tools/, never ours.
// A fake `curl` on PATH serves an archive that is not the pinned release.
describe('scripts/gitleaks.sh', () => {
  let root: string;
  let fakeBin: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'gitleaks-test-'));
    mkdirSync(join(root, 'scripts'));
    copyFileSync(SCRIPT, join(root, 'scripts', 'gitleaks.sh'));

    // A tampered archive: a valid tar.gz holding a "gitleaks" that would
    // report success if it were ever run.
    const payload = join(root, 'payload');
    mkdirSync(payload);
    writeFileSync(join(payload, 'gitleaks'), '#!/bin/sh\necho RAN\nexit 0\n');
    chmodSync(join(payload, 'gitleaks'), 0o755);
    const tar = spawnSync('tar', [
      '-czf',
      join(root, 'tampered.tar.gz'),
      '-C',
      payload,
      'gitleaks',
    ]);
    expect(tar.status).toBe(0);

    fakeBin = join(root, 'bin');
    mkdirSync(fakeBin);
    writeFileSync(
      join(fakeBin, 'curl'),
      `#!/bin/sh\n# Ignores its arguments except -o and serves the tampered archive.\nout=""\nwhile [ $# -gt 0 ]; do\n  if [ "$1" = "-o" ]; then out="$2"; shift; fi\n  shift\ndone\nif [ -n "$out" ]; then cat "${join(root, 'tampered.tar.gz')}" > "$out"; else cat "${join(root, 'tampered.tar.gz')}"; fi\n`,
    );
    chmodSync(join(fakeBin, 'curl'), 0o755);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('stops with an error and runs nothing when the archive does not match the pinned SHA-256', () => {
    const result = spawnSync('bash', [join(root, 'scripts', 'gitleaks.sh')], {
      cwd: root,
      env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}` },
      encoding: 'utf8',
    });

    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain('RAN');
    expect(result.stderr).toMatch(/SHA-256 mismatch/);
    // Nothing unverified is left behind to be run on the next call.
    const version = /^VERSION="([^"]+)"/m.exec(
      readFileSync(SCRIPT, 'utf8'),
    )?.[1];
    expect(version).toBeDefined();
    expect(existsSync(join(root, '.tools', `gitleaks-${version}`))).toBe(false);
  });

  it('pins a SHA-256 for every supported platform', () => {
    const script = readFileSync(SCRIPT, 'utf8');
    for (const platform of [
      'linux_x64',
      'linux_arm64',
      'darwin_x64',
      'darwin_arm64',
    ]) {
      expect(script).toMatch(
        new RegExp(`${platform}\\)\\s*sha256="[0-9a-f]{64}"`),
      );
    }
  });
});
