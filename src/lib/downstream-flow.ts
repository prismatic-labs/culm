import type { Layer } from '../types';
import { getDownstreamLayerIds } from './chokepoint';
import { dominantCountryNames, layerHeldInCountry } from './layer-countries';

export interface DownstreamFlowSplit {
  internal: Layer[];
  externalCountries: string[];
}

/** Layers that list `source.id` in dependsOn (one hop downstream). */
export function getDirectDownstreamLayers(source: Layer, layers: Layer[]): Layer[] {
  return layers
    .filter((layer) => layer.dependsOn.includes(source.id))
    .sort((a, b) => a.stackOrder - b.stackOrder);
}

export function directDownstreamFlow(
  source: Layer,
  layers: Layer[],
  fromCountry = source.metrics.topCountry,
): DownstreamFlowSplit {
  const internal: Layer[] = [];
  const external = new Set<string>();

  for (const layer of getDirectDownstreamLayers(source, layers)) {
    const countries = dominantCountryNames(layer);
    if (countries.length > 0 && countries.every((country) => country === fromCountry)) {
      internal.push(layer);
      continue;
    }
    for (const country of countries) {
      if (country !== fromCountry) external.add(country);
    }
  }

  return { internal, externalCountries: [...external].sort() };
}

export function layersHeldInCountry(country: string, layers: Layer[]): Layer[] {
  return layers
    .filter((layer) => layerHeldInCountry(layer, country))
    .sort((a, b) => a.stackOrder - b.stackOrder);
}

/** Merge one-hop downstream targets for every source layer (country view). */
export function aggregateDirectDownstream(
  sources: Layer[],
  layers: Layer[],
  fromCountry: string,
): DownstreamFlowSplit {
  return mergeDownstreamForOrigins(sources, layers, [fromCountry]);
}

/** Merge one-hop downstream targets across several origin countries (composite / multi-geo layers). */
export function mergeDownstreamForOrigins(
  sources: Layer[],
  layers: Layer[],
  origins: string[],
): DownstreamFlowSplit {
  const internal: Layer[] = [];
  const external = new Set<string>();
  const seenInternal = new Set<string>();

  for (const origin of origins) {
    for (const source of sources) {
      const split = directDownstreamFlow(source, layers, origin);
      for (const layer of split.internal) {
        if (seenInternal.has(layer.id)) continue;
        seenInternal.add(layer.id);
        internal.push(layer);
      }
      for (const country of split.externalCountries) external.add(country);
    }
  }

  internal.sort((a, b) => a.stackOrder - b.stackOrder);
  return { internal, externalCountries: [...external].sort() };
}

export function flowCaptionLabel(sources: Layer[]): string {
  if (sources.length === 1) return layerShortName(sources[0]!);
  return sources.map((layer) => layerShortName(layer)).join(' + ');
}

function downstreamHeldOnlyIn(fromCountry: string, layer: Layer): boolean {
  const countries = dominantCountryNames(layer);
  return countries.length > 0 && countries.every((country) => country === fromCountry);
}

export function splitDownstreamByCountry(
  source: Layer,
  layers: Layer[],
  fromCountry = source.metrics.topCountry,
): DownstreamFlowSplit {
  const internal: Layer[] = [];
  const external = new Set<string>();

  for (const id of getDownstreamLayerIds(layers, source.id)) {
    const layer = layers.find((l) => l.id === id);
    if (!layer) continue;

    if (downstreamHeldOnlyIn(fromCountry, layer)) {
      internal.push(layer);
      continue;
    }

    for (const country of dominantCountryNames(layer)) {
      if (country !== fromCountry) external.add(country);
    }
  }

  internal.sort((a, b) => a.stackOrder - b.stackOrder);
  return { internal, externalCountries: [...external] };
}

export function layerShortName(layer: Layer): string {
  return layer.name.split('(')[0].trim();
}
