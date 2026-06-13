import { describe, expect, it } from 'vitest';
import { isEastAsiaCountry } from './map-inset';

describe('isEastAsiaCountry', () => {
  it('recognises East Asia cluster members', () => {
    expect(isEastAsiaCountry('Japan')).toBe(true);
    expect(isEastAsiaCountry('Netherlands')).toBe(false);
  });
});
