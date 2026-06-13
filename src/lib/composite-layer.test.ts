import { describe, expect, it } from 'vitest';
import { concentrationMap } from '../data/concentration-map';
import { compositeGeoSummary, isCompositeLayer, renderCompositeNoticeHtml } from './composite-layer';

describe('composite layer helpers', () => {
  const materials = concentrationMap.layers.find((l) => l.id === 'critical-materials')!;
  const euv = concentrationMap.layers.find((l) => l.id === 'euv-litho')!;

  it('flags critical materials as composite', () => {
    expect(isCompositeLayer(materials)).toBe(true);
    expect(isCompositeLayer(euv)).toBe(false);
  });

  it('summarizes both dominant geographies', () => {
    expect(compositeGeoSummary(materials)).toContain('China 99%');
    expect(compositeGeoSummary(materials)).toContain('Japan 90%');
  });

  it('explains headline CR1 in the panel notice', () => {
    const html = renderCompositeNoticeHtml(materials);
    expect(html).toContain('Composite layer');
    expect(html).toContain('gallium');
  });
});
