import { describe, expect, it } from 'vitest';
import {
  ACCELERATOR_DESIGNERS,
  COMPUTE_CONCENTRATION,
  POWER_FACTS,
} from '../data/compute';

describe('compute & power data integrity', () => {
  it('accelerator designers are sorted descending and roughly sum to 1', () => {
    for (let i = 1; i < ACCELERATOR_DESIGNERS.length; i += 1) {
      expect(ACCELERATOR_DESIGNERS[i - 1].share).toBeGreaterThanOrEqual(
        ACCELERATOR_DESIGNERS[i].share,
      );
    }
    const total = ACCELERATOR_DESIGNERS.reduce((sum, d) => sum + d.share, 0);
    expect(total).toBeGreaterThan(0.9);
    expect(total).toBeLessThan(1.1);
  });

  it('concentration metrics are fractions in range', () => {
    expect(COMPUTE_CONCENTRATION.nvidiaShare).toBeGreaterThan(0.5);
    expect(COMPUTE_CONCENTRATION.nvidiaShare).toBeLessThanOrEqual(1);
    expect(COMPUTE_CONCENTRATION.usClusterShare).toBeGreaterThan(0.5);
    expect(COMPUTE_CONCENTRATION.usClusterShare).toBeLessThanOrEqual(1);
    expect(COMPUTE_CONCENTRATION.acceleratorHhi).toBeGreaterThan(2500);
  });

  it('every power fact carries sources and a valid confidence', () => {
    expect(POWER_FACTS.length).toBeGreaterThan(0);
    for (const f of POWER_FACTS) {
      expect(f.sources.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(f.confidence);
      for (const s of f.sources) {
        expect(s.url.startsWith('https://')).toBe(true);
        expect(s.org.length).toBeGreaterThan(0);
      }
    }
  });
});
