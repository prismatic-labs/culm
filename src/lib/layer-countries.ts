import type { Actor, DominantCountry, Layer } from '../types';

const DOMINANCE_THRESHOLD = 0.5;

export function layerHeldInCountry(layer: Layer, country: string): boolean {
  return layer.metrics.dominantCountries.some((entry) => entry.country === country);
}

export function dominantCountryNames(layer: Layer): string[] {
  return layer.metrics.dominantCountries.map((entry) => entry.country);
}

export function flowOriginCountry(
  mode: 'layer' | 'country',
  selectedCountry: string | null,
  source: Layer,
): string {
  if (mode === 'country' && selectedCountry && layerHeldInCountry(source, selectedCountry)) {
    return selectedCountry;
  }
  return source.metrics.topCountry;
}

export function dominantCountriesFromActors(
  actors: Actor[],
  topCountry: string,
  topCountryShare: DominantCountry['share'],
): DominantCountry[] {
  const summed = new Map<string, number>();
  for (const actor of actors) {
    summed.set(actor.country, (summed.get(actor.country) ?? 0) + actor.share.value);
  }

  const entries: DominantCountry[] = [];
  for (const [country, share] of summed) {
    if (share >= DOMINANCE_THRESHOLD || country === topCountry) {
      entries.push({
        country,
        share:
          country === topCountry
            ? topCountryShare
            : {
                ...actors.find((a) => a.country === country)!.share,
                value: share,
              },
      });
    }
  }

  if (!entries.some((entry) => entry.country === topCountry)) {
    entries.unshift({ country: topCountry, share: topCountryShare });
  }

  return entries.sort(
    (a, b) => b.share.value - a.share.value || a.country.localeCompare(b.country),
  );
}

export function distinctMapCountries(layers: Layer[]): string[] {
  return [...new Set(layers.flatMap((layer) => dominantCountryNames(layer)))].sort((a, b) =>
    a.localeCompare(b),
  );
}
