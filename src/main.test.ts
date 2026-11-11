// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  document.body.innerHTML = '';
  vi.resetModules();
});

describe('main', () => {
  it('fails with a clear error if the root element is missing', async () => {
    await expect(import('./main.tsx')).rejects.toThrow(
      'Root element #root not found',
    );
  });
});
