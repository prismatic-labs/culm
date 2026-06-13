import { describe, expect, it } from 'vitest';
import { concentrationMap } from '../data/concentration-map';
import { analyzeCascade } from './cascade';
import { buildCascadeSteps, buildShockImpactBrief, cascadeChainLabel, shockImpactSummary } from './shock-cascade';

describe('buildCascadeSteps', () => {
  const layers = concentrationMap.layers;

  it('marks EUV as source and assigns downstream depths', () => {
    const impact = analyzeCascade(layers, { kind: 'layer', id: 'euv-litho' });
    expect(impact).not.toBeNull();

    const steps = impact!.steps;
    const euv = steps.find((step) => step.layer.id === 'euv-litho');
    const fab = steps.find((step) => step.layer.id === 'leading-edge-fab');
    const cloud = steps.find((step) => step.layer.id === 'compute-cloud');

    expect(euv?.role).toBe('source');
    expect(euv?.depth).toBe(0);
    expect(fab?.role).toBe('downstream');
    expect(fab?.depth).toBeGreaterThan(0);
    expect(cloud?.role).toBe('downstream');
    expect(cloud!.depth).toBeGreaterThan(fab!.depth);
  });

  it('builds a readable chain label', () => {
    const impact = analyzeCascade(layers, { kind: 'layer', id: 'euv-litho' });
    expect(impact?.chainLabel).toContain('EUV Lithography');
    expect(impact?.chainLabel).toContain('→');
    expect(cascadeChainLabel(impact!.steps)).toBe(impact!.chainLabel);
  });

  it('summarizes remove → stall headline', () => {
    const impact = analyzeCascade(layers, { kind: 'layer', id: 'euv-litho' });
    const summary = shockImpactSummary(impact!.steps, layers.length);
    expect(summary.headline).toMatch(/^Remove EUV Lithography and \d+ downstream layers stall, through/);
  });

  it('builds an impact brief with concrete consequences', () => {
    const impact = analyzeCascade(layers, { kind: 'layer', id: 'euv-litho' });
    const brief = buildShockImpactBrief(
      impact!.sourceLayers,
      impact!.steps,
      layers,
      layers.length,
      impact!.label,
      impact!.affectedComputeShare,
      impact!.computeImpactMethod,
    );

    expect(brief.downstreamCount).toBeGreaterThan(0);
    expect(brief.headline).toContain('EUV Lithography');
    expect(brief.bottomLine.length).toBeGreaterThan(20);
    expect(brief.countries.length).toBeGreaterThan(1);
    expect(brief.unaffectedLayers.length).toBeGreaterThan(0);
  });
});
