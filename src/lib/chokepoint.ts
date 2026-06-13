import type { Layer, Substitutability } from '../types';

const SLOW_SUBSTITUTABILITY: Substitutability[] = ['years', 'years-to-decades'];

export const CHOKEPOINT_RULE =
  'A layer is a critical chokepoint if (CR1 ≥ 0.80 OR top-country share ≥ 0.80) AND substitutability ∈ {years, years-to-decades}.';

export function isSlowSubstitutability(value: Substitutability): boolean {
  return SLOW_SUBSTITUTABILITY.includes(value);
}

export function evaluateChokepoint(layer: Pick<Layer, 'metrics'>): {
  isCriticalChokepoint: boolean;
  chokepointRationale: string;
} {
  const cr1 = layer.metrics.cr1.value;
  const topCountryShare = layer.metrics.topCountryShare.value;
  const maxDominantShare = Math.max(
    ...layer.metrics.dominantCountries.map((entry) => entry.share.value),
    0,
  );
  const subst = layer.metrics.substitutability.value;
  const slow = isSlowSubstitutability(subst);
  const highConcentration = cr1 >= 0.8 || topCountryShare >= 0.8 || maxDominantShare >= 0.8;

  if (highConcentration && slow) {
    const triggers: string[] = [];
    if (cr1 >= 0.8) triggers.push(`CR1 ≈ ${(cr1 * 100).toFixed(0)}%`);
    if (topCountryShare >= 0.8) {
      triggers.push(`top-country share ≈ ${(topCountryShare * 100).toFixed(0)}%`);
    }
    if (maxDominantShare >= 0.8 && maxDominantShare !== topCountryShare) {
      triggers.push(`dominant-country share ≈ ${(maxDominantShare * 100).toFixed(0)}%`);
    }

    const composite = layer.metrics.dominantCountries.length > 1;
    const cr1Note = layer.metrics.cr1.note?.replace(/\.$/, '');

    return {
      isCriticalChokepoint: true,
      chokepointRationale: composite
        ? `Composite layer with ${layer.metrics.dominantCountries.length} map geographies. Qualifies because ${triggers.join('; ')}; substitutability is ${subst}.${cr1Note ? ` ${cr1Note}.` : ''}`
        : `${triggers.join(' and ')}; substitutability is ${subst}.`,
    };
  }

  if (highConcentration) {
    return {
      isCriticalChokepoint: false,
      chokepointRationale: `High concentration but substitutability is ${subst}. Not a critical chokepoint under the documented rule.`,
    };
  }

  return {
    isCriticalChokepoint: false,
    chokepointRationale: `Concentration below 80% threshold (CR1 ${(cr1 * 100).toFixed(0)}%, top-country ${(topCountryShare * 100).toFixed(0)}%).`,
  };
}

export function getDownstreamLayerIds(layers: Layer[], layerId: string): Set<string> {
  const downstream = new Set<string>();

  function walk(id: string) {
    for (const layer of layers) {
      if (layer.dependsOn.includes(id) && !downstream.has(layer.id)) {
        downstream.add(layer.id);
        walk(layer.id);
      }
    }
  }

  if (layers.some((layer) => layer.id === layerId)) walk(layerId);
  return downstream;
}

export function sortedLayers(layers: Layer[]): Layer[] {
  return [...layers].sort((a, b) => a.stackOrder - b.stackOrder);
}

export function computeHhiFromShares(shares: number[]): number {
  return shares.reduce((sum, s) => sum + (s * 100) ** 2, 0);
}

export function computeCr1(shares: number[]): number {
  return shares.length ? Math.max(...shares) : 0;
}

export function computeCr3(shares: number[]): number {
  const sorted = [...shares].sort((a, b) => b - a);
  return sorted.slice(0, 3).reduce((sum, s) => sum + s, 0);
}
