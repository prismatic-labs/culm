import type { Layer } from '../types';
import { isCompositeLayer } from './composite-layer';
import { pct100 } from './ui';

const SUBSTITUTABILITY_PLAIN: Record<string, string> = {
  'years-to-decades': 'years to decades',
  years: 'years',
  months: 'months',
  fungible: 'months or less',
};

function layerShortName(layer: Layer): string {
  return layer.name.split('(')[0].trim();
}

function dominantEntry(layer: Layer, country: string) {
  return layer.metrics.dominantCountries.find((entry) => entry.country === country);
}

export function maxCountryShare(layers: Layer[], country: string): number {
  return Math.max(
    ...layers.map((layer) => dominantEntry(layer, country)?.share.value ?? 0),
    0,
  );
}

/** Plain-language reason a layer is (or is not) a critical chokepoint for this country. */
export function explainChokepointForCountry(layer: Layer, country: string): string {
  const entry = dominantEntry(layer, country);
  const name = layerShortName(layer);
  const subst =
    SUBSTITUTABILITY_PLAIN[layer.metrics.substitutability.value] ??
    layer.metrics.substitutability.value;

  if (!layer.isCriticalChokepoint) {
    if (entry) {
      return `${name} is not a critical chokepoint for ${country}: ${layer.chokepointRationale}`;
    }
    return `${name} is not a critical chokepoint. ${layer.chokepointRationale}`;
  }

  if (entry && entry.share.value >= 0.8) {
    const pct = pct100(entry.share.value);
    const detail = entry.share.note
      ? entry.share.note.replace(/\.$/, '')
      : `${pct}% of ${name} sits in ${country}`;
    return `${detail}. There is no ready backup at scale. Rerouting would take ${subst}.`;
  }

  return `${layer.chokepointRationale.replace(/\.$/, '')}. Alternatives would take ${subst} to reach production scale.`;
}

export interface CountryThesisCopy {
  sub: string;
  why: string;
  statNum: string;
  statCap: string;
  /** Primary stack layer, shown under the country name in the thesis banner. */
  layerLead?: string;
  layerLeadMeta?: string;
}

function formatLayerMeta(layer: Layer): string {
  const parts = [`Stack layer ${String(layer.stackOrder).padStart(2, '0')}`];
  if (layer.isCriticalChokepoint) parts.push('Critical chokepoint');
  return parts.join(' · ');
}

export function countryThesisCopy(
  country: string,
  layers: Layer[],
  stackLayerCount: number,
): CountryThesisCopy {
  const n = layers.length;
  const chokepointLayers = layers.filter((layer) => layer.isCriticalChokepoint);
  const topShare = maxCountryShare(layers, country);
  const statNum = `${pct100(topShare)}%`;

  let statCap: string;
  let layerLead: string | undefined;
  let layerLeadMeta: string | undefined;

  if (n === 1) {
    statCap = `${country} share in this layer`;
  } else {
    statCap = `${n} layers · top ${country} share`;
  }

  let sub: string;
  let why: string;

  if (n === 1) {
    const layer = layers[0]!;
    layerLead = layerShortName(layer);
    layerLeadMeta = formatLayerMeta(layer);
    sub = isCompositeLayer(layer)
      ? `${country} dominates one input in this composite layer.`
      : `${pct100(topShare)}% of ${layerShortName(layer)} sits in ${country}.`;
    why = explainChokepointForCountry(layer, country);
  } else if (chokepointLayers.length === 0) {
    sub = `${n} of ${stackLayerCount} stack layers touch ${country}. None are critical chokepoints.`;
    why = 'These layers touch this country, but none combine extreme concentration with a slow-to-replace supply. Either share stays below 80%, or alternatives could scale within months.';
  } else if (chokepointLayers.length === 1) {
    const layer = chokepointLayers[0]!;
    layerLead = layerShortName(layer);
    layerLeadMeta = formatLayerMeta(layer);
    sub = `${n} of ${stackLayerCount} stack layers touch ${country}. One is a critical chokepoint.`;
    why = explainChokepointForCountry(layer, country);
  } else if (chokepointLayers.length === n) {
    layerLead = chokepointLayers.map((layer) => layerShortName(layer)).join(' · ');
    layerLeadMeta = `${chokepointLayers.length} critical chokepoints`;
    sub = `${n} of ${stackLayerCount} stack layers touch ${country}. All ${n} are critical chokepoints.`;
    why = chokepointLayers
      .map((layer) => explainChokepointForCountry(layer, country))
      .join(' ');
  } else {
    layerLead = chokepointLayers.map((layer) => layerShortName(layer)).join(' · ');
    layerLeadMeta = `${chokepointLayers.length} of ${n} layers are critical chokepoints`;
    sub = `${n} of ${stackLayerCount} stack layers touch ${country}. ${chokepointLayers.length} critical chokepoints.`;
    why = chokepointLayers
      .map((layer) => explainChokepointForCountry(layer, country))
      .join(' ');
  }

  return { sub, why, statNum, statCap, layerLead, layerLeadMeta };
}
