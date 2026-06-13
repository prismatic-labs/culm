import { describe, expect, it } from 'vitest';
import { concentrationMap } from '../data/concentration-map';
import {
  dominantCountriesFromActors,
  distinctMapCountries,
  layerHeldInCountry,
} from './layer-countries';
import { sv } from '../data/layers';

describe('layerHeldInCountry', () => {
  const materials = concentrationMap.layers.find((l) => l.id === 'critical-materials')!;

  it('includes Japan for critical-materials via dominantCountries', () => {
    expect(layerHeldInCountry(materials, 'Japan')).toBe(true);
    expect(layerHeldInCountry(materials, 'China')).toBe(true);
    expect(layerHeldInCountry(materials, 'Netherlands')).toBe(false);
  });
});

describe('distinctMapCountries', () => {
  it('includes Japan from multi-country layers', () => {
    const countries = distinctMapCountries(concentrationMap.layers);
    expect(countries).toContain('Japan');
    expect(countries.length).toBeGreaterThanOrEqual(6);
  });
});

describe('dominantCountriesFromActors', () => {
  it('includes countries above the dominance threshold', () => {
    const actors = [
      {
        name: 'A',
        country: 'United States',
        share: sv(0.61, { confidence: 'medium', asOf: '2024', sources: ['https://example.com'] }),
      },
      {
        name: 'B',
        country: 'Germany',
        share: sv(0.13, { confidence: 'medium', asOf: '2024', sources: ['https://example.com'] }),
      },
    ];
    const dominant = dominantCountriesFromActors(
      actors,
      'United States',
      sv(0.61, { confidence: 'medium', asOf: '2024', sources: ['https://example.com'] }),
    );
    expect(dominant.map((entry) => entry.country)).toEqual(['United States']);
  });
});
