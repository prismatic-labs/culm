import { describe, expect, it } from 'vitest';
import { CONTROLS_SUMMARY, LEVERAGE_MEASURES } from '../data/controls';
import { concentrationMap } from '../data/concentration-map';

const layerById = new Map(concentrationMap.layers.map((l) => [l.id, l]));

describe('controls (leverage) data integrity', () => {
  it('every measure maps to a real stack layer with matching stack order', () => {
    for (const m of LEVERAGE_MEASURES) {
      const layer = layerById.get(m.layerId);
      expect(layer, `unknown layerId: ${m.layerId}`).toBeDefined();
      expect(m.stackOrder).toBe(layer!.stackOrder);
      expect(m.layerName).toBe(layer!.name);
    }
  });

  it('every measure has a controller, target, sources, and valid confidence', () => {
    for (const m of LEVERAGE_MEASURES) {
      expect(m.controller.length).toBeGreaterThan(0);
      expect(m.target.length).toBeGreaterThan(0);
      expect(m.sources.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(m.confidence);
      for (const s of m.sources) {
        expect(s.url.startsWith('https://')).toBe(true);
        expect(s.org.length).toBeGreaterThan(0);
      }
    }
  });

  it('captures leverage running in both directions', () => {
    const dirs = new Set(LEVERAGE_MEASURES.map((m) => m.direction));
    expect(dirs.has('west-to-china')).toBe(true);
    expect(dirs.has('china-to-west')).toBe(true);
  });

  it('summary controlledLayers matches the distinct layers under control', () => {
    const distinct = new Set(LEVERAGE_MEASURES.map((m) => m.layerId));
    expect(CONTROLS_SUMMARY.controlledLayers).toBe(distinct.size);
    expect(CONTROLS_SUMMARY.totalLayers).toBe(concentrationMap.layers.length);
  });
});
