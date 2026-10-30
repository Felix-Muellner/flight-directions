import bearing from '@turf/bearing';
import { describe, expect, it } from 'vitest';

describe('test runner', () => {
  it('runs and resolves project dependencies', () => {
    expect(bearing([0, 0], [0, 10])).toBeCloseTo(0);
  });
});
