import { describe, expect, it } from 'vitest';
import { concentrationMap } from '../data/concentration-map';
import { aggregateByCountry, countryChokeIntensity, resolveCountryFeatures } from './country-aggregate';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { FeatureCollection } from 'geojson';
import countries110m from 'world-atlas/countries-110m.json';

describe('aggregateByCountry', () => {
  it('groups layers by dominant countries', () => {
    const aggregates = aggregateByCountry(concentrationMap.layers);
    const taiwan = aggregates.find((a) => a.country === 'Taiwan');
    expect(taiwan).toBeDefined();
    expect(taiwan!.layers.length).toBe(2);
    expect(taiwan!.chokepointCount).toBe(2);

    const japan = aggregates.find((a) => a.country === 'Japan');
    expect(japan).toBeDefined();
    expect(japan!.layers.some((layer) => layer.id === 'critical-materials')).toBe(true);
    expect(japan!.maxCountryShare).toBeCloseTo(0.9, 1);
    expect(japan!.maxCr1).toBeCloseTo(0.99, 2);
    expect(countryChokeIntensity(japan!)).toBeCloseTo(0.9, 1);
    expect(countryChokeIntensity(taiwan!)).toBeGreaterThan(0.85);
  });

  it('resolves all layer countries to world-atlas features including Taiwan and Japan', () => {
    const topology = countries110m as unknown as Topology;
    const world = feature(topology, topology.objects.countries) as FeatureCollection;
    const aggregates = aggregateByCountry(concentrationMap.layers);
    const { resolved, unmatched } = resolveCountryFeatures(aggregates, world);

    expect(unmatched).toEqual([]);
    expect(resolved.some((r) => r.atlasName === 'Taiwan')).toBe(true);
    expect(resolved.some((r) => r.aggregate.country === 'Japan')).toBe(true);
    expect(resolved.some((r) => r.aggregate.country === 'Netherlands')).toBe(true);
  });
});
