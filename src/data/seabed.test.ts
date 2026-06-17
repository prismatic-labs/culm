import { describe, expect, it } from 'vitest';
import {
  DEEP_SEA_MINING_PRO_CON,
  ISA_EXPLORATION_SUMMARY,
  METAL_PROFILES,
  SEABED_HOTSPOTS,
} from '../data/seabed';

describe('seabed data integrity', () => {
  it('includes required hotspot sites from brief', () => {
    const ids = SEABED_HOTSPOTS.map((h) => h.id);
    expect(ids).toContain('ccz');
    expect(ids).toContain('cio');
    expect(ids).toContain('wpac-crust');
    expect(ids).toContain('cook-islands');
  });

  it('every hotspot has sources and AI linkages', () => {
    for (const h of SEABED_HOTSPOTS) {
      expect(h.sources.length).toBeGreaterThan(0);
      expect(h.aiLinkages.length).toBeGreaterThan(0);
      for (const s of h.sources) {
        expect(s.url.startsWith('https://')).toBe(true);
        expect(s.org.length).toBeGreaterThan(0);
      }
    }
  });

  it('copper is protagonist with high-confidence AI roles', () => {
    const cu = METAL_PROFILES.find((m) => m.id === 'copper');
    expect(cu?.protagonist).toBe(true);
    expect(cu?.aiRoles.some((r) => r.confidence === 'high')).toBe(true);
    expect(cu?.dissent).toBeTruthy();
  });

  it('gallium is flagged as not seabed-sourced', () => {
    const ga = METAL_PROFILES.find((m) => m.id === 'gallium');
    expect(ga?.seabedRole).toBe('not seabed-sourced');
  });

  it('every hotspot has depth and deposit type', () => {
    for (const h of SEABED_HOTSPOTS) {
      expect(h.depthM.min).toBeGreaterThan(0);
      expect(h.depthM.max).toBeGreaterThanOrEqual(h.depthM.min);
      expect(h.depositType.length).toBeGreaterThan(0);
    }
  });

  it('PNG is the shallowest mapped site', () => {
    const png = SEABED_HOTSPOTS.find((h) => h.id === 'png');
    const shallowestMin = Math.min(...SEABED_HOTSPOTS.map((h) => h.depthM.min));
    expect(png?.depthM.max).toBeLessThan(2000);
    expect(shallowestMin).toBeGreaterThan(500);
  });

  it('lists pro and con arguments', () => {
    expect(DEEP_SEA_MINING_PRO_CON.pros.length).toBeGreaterThan(0);
    expect(DEEP_SEA_MINING_PRO_CON.cons.length).toBeGreaterThan(0);
  });

  it('CCZ has copper linkage at high confidence', () => {
    const ccz = SEABED_HOTSPOTS.find((h) => h.id === 'ccz');
    const cuLink = ccz?.aiLinkages.find((l) => l.metal === 'Cu');
    expect(cuLink?.confidence).toBe('high');
  });

  it('ISA summary matches sourced contract totals', () => {
    expect(ISA_EXPLORATION_SUMMARY.totalContracts).toBe(31);
    expect(ISA_EXPLORATION_SUMMARY.cczNoduleContracts).toBe(17);
  });
});
