import { describe, expect, it } from 'vitest';
import { concentrationMap } from '../data/concentration-map';
import { sortedLayers } from './chokepoint';
import { directDownstreamFlow, aggregateDirectDownstream, getDirectDownstreamLayers, layersHeldInCountry, mergeDownstreamForOrigins } from './downstream-flow';

describe('getDirectDownstreamLayers', () => {
  const layers = sortedLayers(concentrationMap.layers);

  it('returns only one-hop dependents', () => {
    const euv = layers.find((l) => l.id === 'euv-litho')!;
    const direct = getDirectDownstreamLayers(euv, layers);
    expect(direct.map((l) => l.id)).toContain('leading-edge-fab');
    expect(direct.map((l) => l.id)).not.toContain('compute-cloud');
  });
});

describe('directDownstreamFlow', () => {
  const layers = sortedLayers(concentrationMap.layers);

  it('lists external countries for direct downstream only', () => {
    const euv = layers.find((l) => l.id === 'euv-litho')!;
    const flow = directDownstreamFlow(euv, layers, 'Netherlands');
    expect(flow.externalCountries).toContain('Taiwan');
    expect(flow.externalCountries.length).toBeGreaterThan(0);
  });
});

describe('aggregateDirectDownstream', () => {
  const layers = sortedLayers(concentrationMap.layers);

  it('merges downstream targets for every layer held in a country', () => {
    const held = layersHeldInCountry('Taiwan', layers);
    expect(held.length).toBeGreaterThan(1);

    const flow = aggregateDirectDownstream(held, layers, 'Taiwan');
    expect(flow.externalCountries).toContain('South Korea');
    expect(flow.externalCountries).toContain('United States');
    expect(flow.internal.some((layer) => layer.id === 'advanced-packaging')).toBe(true);
  });

  it('merges downstream targets across composite origins', () => {
    const materials = layers.find((l) => l.id === 'critical-materials')!;
    const flow = mergeDownstreamForOrigins([materials], layers, ['China', 'Japan']);
    expect(flow.externalCountries.length).toBeGreaterThan(0);
    expect(flow.externalCountries).toContain('United States');
  });
});
