import { describe, expect, it } from 'vitest';
import { EAST_ASIA_CLUSTER } from './map-layout';
import { eastAsiaGatewayPoint, planFlowRoutes, shouldShowEastAsiaLabel } from './flow-routes';

describe('planFlowRoutes', () => {
  const markers = new Map([
    ['Netherlands', { x: 100, y: 100, radius: 8, country: 'Netherlands' }],
    ['Taiwan', { x: 500, y: 200, radius: 8, country: 'Taiwan' }],
    ['South Korea', { x: 510, y: 190, radius: 8, country: 'South Korea' }],
    ['United States', { x: 200, y: 120, radius: 8, country: 'United States' }],
  ]);

  it('bundles multiple East Asia targets when the source is outside the cluster', () => {
    const plan = planFlowRoutes(
      'Netherlands',
      ['Taiwan', 'South Korea', 'United States'],
      false,
      markers,
    );
    expect(plan.directTargets).toEqual(['United States']);
    expect(plan.bundledEastAsia).toEqual(['Taiwan', 'South Korea']);
  });

  it('draws individual East Asia routes when the source is inside the cluster', () => {
    const plan = planFlowRoutes('Taiwan', ['South Korea', 'United States'], true, markers);
    expect(plan.directTargets).toEqual(['South Korea', 'United States']);
    expect(plan.bundledEastAsia).toEqual([]);
    expect(plan.showInternalLoop).toBe(true);
  });

  it('uses a single direct arrow for one East Asia target', () => {
    const plan = planFlowRoutes('Netherlands', ['Taiwan', 'United States'], false, markers);
    expect(plan.directTargets).toEqual(['United States', 'Taiwan']);
    expect(plan.bundledEastAsia).toEqual([]);
  });
});

describe('eastAsiaGatewayPoint', () => {
  it('returns the centroid of cluster markers', () => {
    const gateway = eastAsiaGatewayPoint(
      new Map([
        ['Taiwan', { x: 500, y: 200, radius: 8, country: 'Taiwan' }],
        ['South Korea', { x: 520, y: 220, radius: 10, country: 'South Korea' }],
      ]),
    );
    expect(gateway!.x).toBe(510);
    expect(gateway!.y).toBe(210);
  });
});

describe('shouldShowEastAsiaLabel', () => {
  it('always shows East Asia labels', () => {
    expect(shouldShowEastAsiaLabel('Japan', null, null, EAST_ASIA_CLUSTER)).toBe(true);
    expect(shouldShowEastAsiaLabel('Taiwan', null, null, EAST_ASIA_CLUSTER)).toBe(true);
    expect(shouldShowEastAsiaLabel('Netherlands', null, null, EAST_ASIA_CLUSTER)).toBe(true);
  });
});
