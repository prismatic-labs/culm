import type { Feature, FeatureCollection } from 'geojson';
import type { Layer, SourcedValue } from '../types';
import { atlasNamesFor } from './country-aliases';

export interface CountryAggregate {
  country: string;
  layers: Layer[];
  chokepointCount: number;
  maxCr1: number;
  /** Highest dominant-country share for this geography across held layers. */
  maxCountryShare: number;
  caveats: string[];
  hasUnverified: boolean;
}

function isUnverified(sourced: SourcedValue<unknown>): boolean {
  return sourced.sources.length === 0;
}

function layerHasUnverified(layer: Layer): boolean {
  const fields = [
    layer.metrics.cr1,
    layer.metrics.cr3,
    layer.metrics.hhi,
    layer.metrics.topCountryShare,
    layer.metrics.substitutability,
    ...layer.metrics.dominantCountries.map((entry) => entry.share),
  ];
  return fields.some(isUnverified) || layer.actors.some((a) => isUnverified(a.share));
}

export function aggregateByCountry(layers: Layer[]): CountryAggregate[] {
  const map = new Map<string, CountryAggregate>();

  for (const layer of layers) {
    for (const dominant of layer.metrics.dominantCountries) {
      const country = dominant.country;
      let agg = map.get(country);
      if (!agg) {
        agg = {
          country,
          layers: [],
          chokepointCount: 0,
          maxCr1: 0,
          maxCountryShare: 0,
          caveats: [],
          hasUnverified: false,
        };
        map.set(country, agg);
      }

      if (!agg.layers.some((existing) => existing.id === layer.id)) {
        agg.layers.push(layer);
        if (layer.isCriticalChokepoint) agg.chokepointCount += 1;
        agg.maxCr1 = Math.max(agg.maxCr1, layer.metrics.cr1.value);
      }

      agg.maxCountryShare = Math.max(agg.maxCountryShare, dominant.share.value);

      if (dominant.share.note) {
        agg.caveats.push(dominant.share.note);
      }
      if (layer.metrics.topCountryShare.note && dominant.country === layer.metrics.topCountry) {
        agg.caveats.push(layer.metrics.topCountryShare.note);
      }
      if (layerHasUnverified(layer)) agg.hasUnverified = true;
    }
  }

  for (const agg of map.values()) {
    agg.layers.sort((a, b) => a.stackOrder - b.stackOrder);
    agg.caveats = [...new Set(agg.caveats)];
  }

  return [...map.values()].sort(
    (a, b) =>
      b.chokepointCount - a.chokepointCount ||
      b.maxCr1 - a.maxCr1 ||
      a.country.localeCompare(b.country),
  );
}

/**
 * Map color intensity: how strong this country's role is on critical chokepoint layers.
 * Uses CR1 / top-country share when it leads the layer; otherwise that country's share in the layer.
 */
export function countryChokeIntensity(aggregate: CountryAggregate): number {
  let best = 0;

  for (const layer of aggregate.layers) {
    if (!layer.isCriticalChokepoint) continue;

    const entry = layer.metrics.dominantCountries.find((e) => e.country === aggregate.country);
    const countryShare = entry?.share.value ?? 0;

    if (layer.metrics.topCountry === aggregate.country) {
      best = Math.max(best, layer.metrics.cr1.value, layer.metrics.topCountryShare.value);
    } else if (countryShare > 0) {
      best = Math.max(best, countryShare);
    }
  }

  if (best > 0) return best;

  // Non-chokepoint presence only: keep markers visually quieter.
  return aggregate.maxCr1 * 0.45;
}

export interface ResolvedCountry {
  aggregate: CountryAggregate;
  feature: Feature;
  atlasName: string;
}

export function resolveCountryFeatures(
  aggregates: CountryAggregate[],
  world: FeatureCollection,
): { resolved: ResolvedCountry[]; unmatched: string[] } {
  const resolved: ResolvedCountry[] = [];
  const unmatched: string[] = [];

  for (const aggregate of aggregates) {
    const candidates = atlasNamesFor(aggregate.country);
    let feature: Feature | undefined;
    let atlasName = '';

    for (const name of candidates) {
      feature = world.features.find((f) => f.properties?.name === name);
      if (feature) {
        atlasName = name;
        break;
      }
    }

    if (!feature) {
      unmatched.push(aggregate.country);
      continue;
    }

    resolved.push({ aggregate, feature, atlasName });
  }

  return { resolved, unmatched };
}
