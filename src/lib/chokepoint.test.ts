import { describe, expect, it } from 'vitest';
import { concentrationMap } from '../data/concentration-map';
import { DATA_ENDPOINTS } from './data-sources';
import { CHOKEPOINT_RULE, evaluateChokepoint, getDownstreamLayerIds } from './chokepoint';

describe('evaluateChokepoint', () => {
  it('matches the documented rule for EUV', () => {
    const layer = concentrationMap.layers.find((l) => l.id === 'euv-litho')!;
    const result = evaluateChokepoint(layer);
    expect(result.isCriticalChokepoint).toBe(true);
    expect(layer.isCriticalChokepoint).toBe(true);
  });

  it('does not flag compute when substitutability is months despite high country share', () => {
    const layer = concentrationMap.layers.find((l) => l.id === 'compute-cloud')!;
    const result = evaluateChokepoint(layer);
    expect(result.isCriticalChokepoint).toBe(false);
    expect(layer.isCriticalChokepoint).toBe(false);
  });
});

describe('getDownstreamLayerIds', () => {
  it('greys out the full stack above EUV', () => {
    const downstream = getDownstreamLayerIds(concentrationMap.layers, 'euv-litho');
    expect(downstream.has('leading-edge-fab')).toBe(true);
    expect(downstream.has('ai-accelerators')).toBe(true);
    expect(downstream.has('compute-cloud')).toBe(true);
    expect(downstream.has('critical-materials')).toBe(false);
  });
});

describe('sourcing', () => {
  it('states the chokepoint rule in methodology', () => {
    expect(concentrationMap.methodology).toContain(CHOKEPOINT_RULE);
  });

  it('has source URLs on every layer metric block', () => {
    for (const layer of concentrationMap.layers) {
      expect(layer.metrics.cr1.sources.length, layer.id).toBeGreaterThan(0);
      expect(layer.metrics.substitutability.sources.length, layer.id).toBeGreaterThan(0);
    }
  });

  it('documents Epoch AI as a fetchable endpoint', () => {
    const epoch = DATA_ENDPOINTS.find((e) => e.id === 'epoch-ai-chip-sales');
    expect(epoch?.url).toContain('epoch.ai');
  });
});
