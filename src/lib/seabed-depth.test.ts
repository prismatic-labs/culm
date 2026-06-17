import { describe, expect, it } from 'vitest';
import { formatDepthRange, formatDepthRangeShort } from './seabed-depth';

describe('seabed depth helpers', () => {
  it('formats depth ranges', () => {
    expect(formatDepthRange({ min: 1500, max: 1700 })).toBe('1,500–1,700 m');
    expect(formatDepthRange({ min: 4000, max: 4000 })).toBe('4,000 m');
  });

  it('formats short depth ranges in km', () => {
    expect(formatDepthRangeShort({ min: 1500, max: 1700 })).toBe('1.5 km–1.7 km');
    expect(formatDepthRangeShort({ min: 4000, max: 5500 })).toBe('4 km–5.5 km');
  });
});
