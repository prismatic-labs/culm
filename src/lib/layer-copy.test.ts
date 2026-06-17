import { describe, expect, it } from 'vitest';
import { concentrationMap } from '../data/concentration-map';
import { humanChokepointPanelCopy, layerHeroMetric, layerThesisHeadline } from './layer-copy';

describe('layer-copy', () => {
  it('uses whyItMatters for thesis headline', () => {
    const euv = concentrationMap.layers.find((l) => l.id === 'euv-litho')!;
    expect(layerThesisHeadline(euv)).toContain('sole commercial supplier');
    expect(layerThesisHeadline(euv)).not.toContain('Eight layers');
  });

  it('uses plain language for critical chokepoint panel copy', () => {
    const euv = concentrationMap.layers.find((l) => l.id === 'euv-litho')!;
    const copy = humanChokepointPanelCopy(euv);
    expect(copy).not.toMatch(/CR1|substitutability is/i);
    expect(copy.length).toBeGreaterThan(20);
  });

  it('leads with the geographic stat when a country holds more than the top firm', () => {
    const hbm = concentrationMap.layers.find((l) => l.id === 'hbm')!;
    expect(layerHeroMetric(hbm)).toBe('geographic');
  });

  it('leads with the firm stat for a single-supplier layer', () => {
    const euv = concentrationMap.layers.find((l) => l.id === 'euv-litho')!;
    expect(layerHeroMetric(euv)).toBe('firm');
  });

  it('uses stallEffect when present on layers', () => {
    const withStall = concentrationMap.layers.filter((l) => l.stallEffect);
    expect(withStall.length).toBe(8);
  });
});
