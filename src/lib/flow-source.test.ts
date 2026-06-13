import { describe, expect, it } from 'vitest';
import { concentrationMap } from '../data/concentration-map';
import { flowSourceLayer } from './flow-source';

describe('flowSourceLayer', () => {
  const layers = concentrationMap.layers;

  it('uses selected layer in layer mode', () => {
    const layer = flowSourceLayer(
      {
        mode: 'layer',
        stackMode: 'inspect',
        selectedLayer: 'euv-litho',
        selectedCountry: 'Netherlands',
        shockTarget: null,
      },
      layers,
    );
    expect(layer?.id).toBe('euv-litho');
  });

  it('uses most upstream held layer in country mode', () => {
    const layer = flowSourceLayer(
      {
        mode: 'country',
        stackMode: 'inspect',
        selectedLayer: null,
        selectedCountry: 'United States',
        shockTarget: null,
      },
      layers,
    );
    expect(layer?.id).toBe('chip-design-eda');
  });

  it('finds critical-materials when Japan is selected', () => {
    const layer = flowSourceLayer(
      {
        mode: 'country',
        stackMode: 'inspect',
        selectedLayer: null,
        selectedCountry: 'Japan',
        shockTarget: null,
      },
      layers,
    );
    expect(layer?.id).toBe('critical-materials');
  });
});
