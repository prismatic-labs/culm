import { describe, expect, it } from 'vitest';
import { criticalMaterials } from '../data/layers';

describe('critical materials subcomponents', () => {
  it('includes quantified germanium alongside gallium', () => {
    const germanium = criticalMaterials.subcomponents?.find((s) => s.id === 'germanium');
    expect(germanium).toBeDefined();
    expect(germanium!.country).toBe('China');
    expect(germanium!.share.value).toBeGreaterThan(0);
    expect(germanium!.share.sources.length).toBeGreaterThan(0);
  });
});
