import { describe, expect, it } from 'vitest';
import { concentrationMap } from '../data/concentration-map';
import { analyzeCascade } from './cascade';

describe('analyzeCascade', () => {
  const layers = concentrationMap.layers;

  it('includes the shocked layer and downstream dependents', () => {
    const impact = analyzeCascade(layers, { kind: 'layer', id: 'euv-litho' });

    expect(impact?.sourceLayers.map((layer) => layer.id)).toEqual(['euv-litho']);
    expect(impact?.impactedLayerIds.has('euv-litho')).toBe(true);
    expect(impact?.impactedLayerIds.has('leading-edge-fab')).toBe(true);
    expect(impact?.impactedLayerIds.has('compute-cloud')).toBe(true);
  });

  it('uses country-held layers as country shock sources', () => {
    const impact = analyzeCascade(layers, { kind: 'country', name: 'Taiwan' });

    expect(impact?.sourceLayers.map((layer) => layer.id)).toEqual([
      'leading-edge-fab',
      'advanced-packaging',
    ]);
    expect(impact?.impactedLayerIds.has('ai-accelerators')).toBe(true);
  });

  it('estimates frontier compute as accelerator CR1 × compute geography when both hit', () => {
    const impact = analyzeCascade(layers, { kind: 'layer', id: 'critical-materials' });
    const accel = layers.find((layer) => layer.id === 'ai-accelerators')!;
    const compute = layers.find((layer) => layer.id === 'compute-cloud')!;

    expect(impact?.affectedComputeShare).toBeCloseTo(
      accel.metrics.cr1.value * compute.metrics.topCountryShare.value,
      3,
    );
    expect(impact?.computeImpactMethod).toContain('Proxy');
  });
});
