import { describe, expect, it } from 'vitest';
import { concentrationMap } from '../data/concentration-map';
import { countryThesisCopy, explainChokepointForCountry, maxCountryShare } from './country-thesis';
import { isCompositeLayer } from './composite-layer';

describe('countryThesisCopy', () => {
  const layers = concentrationMap.layers;

  it('explains why Japan is a critical chokepoint with Japan share, not layer CR1', () => {
    const japanLayers = layers.filter((layer) =>
      layer.metrics.dominantCountries.some((entry) => entry.country === 'Japan'),
    );
    const copy = countryThesisCopy('Japan', japanLayers, layers.length);

    expect(copy.statNum).toBe('90%');
    expect(copy.statNum).not.toBe('99%');
    expect(copy.why).toContain('90%');
    expect(copy.why).toMatch(/rerout|backup|substitut|years/i);
    expect(copy.why).not.toMatch(/meets the rule/i);
  });

  it('names the layer and rule for a single-layer country', () => {
    const japanLayers = layers.filter((layer) =>
      layer.metrics.dominantCountries.some((entry) => entry.country === 'Japan'),
    );
    const copy = countryThesisCopy('Japan', japanLayers, layers.length);
    expect(copy.layerLead).toBe('Critical Materials & Inputs');
    expect(copy.sub).toContain('composite');
    expect(copy.statCap).toContain('Japan share');
  });

  it('surfaces the stack layer for a single-layer chokepoint country', () => {
    const nlLayers = layers.filter((layer) =>
      layer.metrics.dominantCountries.some((entry) => entry.country === 'Netherlands'),
    );
    const copy = countryThesisCopy('Netherlands', nlLayers, layers.length);
    expect(copy.layerLead).toBe('EUV Lithography');
    expect(copy.layerLeadMeta).toContain('Critical chokepoint');
    expect(copy.sub).toContain('EUV Lithography');
  });
});

describe('explainChokepointForCountry', () => {
  it('uses dominant-country share for composite layers', () => {
    const materials = concentrationMap.layers.find((l) => l.id === 'critical-materials')!;
    const why = explainChokepointForCountry(materials, 'Japan');
    expect(why).toContain('90%');
    expect(why).toMatch(/rerout|backup|years/i);
    expect(why).not.toMatch(/meets the rule/i);
  });
});

describe('maxCountryShare', () => {
  it('returns the country dominant share, not layer CR1', () => {
    const materials = concentrationMap.layers.find((l) => l.id === 'critical-materials')!;
    expect(maxCountryShare([materials], 'Japan')).toBeCloseTo(0.9);
    expect(maxCountryShare([materials], 'China')).toBeCloseTo(0.99);
  });
});
