import type { Layer } from '../types';
import { getDownstreamLayerIds } from './chokepoint';
import { layerHeldInCountry } from './layer-countries';
import {
  buildCascadeSteps,
  cascadeChainLabel,
  sourceLayerIds,
  type CascadeStep,
} from './shock-cascade';
import { pct100 } from './ui';

export type CascadeSource =
  | { kind: 'layer'; id: string }
  | { kind: 'country'; name: string };

export interface CascadeImpact {
  sourceLayers: Layer[];
  sourceLayerIds: Set<string>;
  impactedLayers: Layer[];
  impactedLayerIds: Set<string>;
  downstreamLayers: Layer[];
  steps: CascadeStep[];
  chainLabel: string;
  criticalImpactedCount: number;
  /** Estimated frontier compute capacity at risk (0 to 1), when methodology applies. */
  affectedComputeShare: number | null;
  /** Plain-language description of how affectedComputeShare was derived. */
  computeImpactMethod: string | null;
  label: string;
}

function uniqueById(layers: Layer[]): Layer[] {
  const seen = new Set<string>();
  return layers.filter((layer) => {
    if (seen.has(layer.id)) return false;
    seen.add(layer.id);
    return true;
  });
}

/**
 * Transparent proxy for "frontier compute capacity affected".
 * Multiplies accelerator designer concentration and compute geography share when both
 * sit in the impacted cascade; otherwise uses the strongest single relevant share.
 */
export function estimateFrontierComputeImpact(
  layers: Layer[],
  impactedLayerIds: Set<string>,
): { value: number | null; method: string | null } {
  const accel = layers.find((layer) => layer.id === 'ai-accelerators');
  const compute = layers.find((layer) => layer.id === 'compute-cloud');
  const fab = layers.find((layer) => layer.id === 'leading-edge-fab');

  const accelHit = accel && impactedLayerIds.has(accel.id);
  const computeHit = compute && impactedLayerIds.has(compute.id);
  const fabHit = fab && impactedLayerIds.has(fab.id);

  if (!accelHit && !computeHit && !fabHit) {
    return {
      value: null,
      method: 'No accelerator, leading-edge fab, or compute layer in this cascade.',
    };
  }

  const parts: string[] = [];
  let estimate = 1;
  let factors = 0;

  if (accelHit && accel) {
    estimate *= accel.metrics.cr1.value;
    factors += 1;
    parts.push(`accelerator CR1 ${pct100(accel.metrics.cr1.value)}%`);
  }
  if (computeHit && compute) {
    estimate *= compute.metrics.topCountryShare.value;
    factors += 1;
    parts.push(`compute geography ${pct100(compute.metrics.topCountryShare.value)}%`);
  }
  if (fabHit && fab && !accelHit) {
    estimate *= fab.metrics.cr1.value;
    factors += 1;
    parts.push(`leading-edge fab CR1 ${pct100(fab.metrics.cr1.value)}%`);
  }

  if (factors === 0) return { value: null, method: null };

  return {
    value: Math.min(1, estimate),
    method: `Proxy: ${parts.join(' × ')}. Not a blended fragility score.`,
  };
}

export function analyzeCascade(layers: Layer[], source: CascadeSource | null): CascadeImpact | null {
  if (!source) return null;

  const sourceLayers =
    source.kind === 'layer'
      ? layers.filter((layer) => layer.id === source.id)
      : layers.filter((layer) => layerHeldInCountry(layer, source.name));

  if (!sourceLayers.length) return null;

  const impactedLayerIds = new Set<string>();
  for (const layer of sourceLayers) {
    impactedLayerIds.add(layer.id);
    for (const id of getDownstreamLayerIds(layers, layer.id)) {
      impactedLayerIds.add(id);
    }
  }

  const impactedLayers = uniqueById(
    layers.filter((layer) => impactedLayerIds.has(layer.id)),
  ).sort((a, b) => a.stackOrder - b.stackOrder);

  const sources = sourceLayerIds(sourceLayers);
  const steps = buildCascadeSteps(layers, sources, impactedLayerIds);
  const downstreamLayers = steps.filter((step) => step.role === 'downstream').map((step) => step.layer);
  const compute = estimateFrontierComputeImpact(layers, impactedLayerIds);

  return {
    sourceLayers,
    sourceLayerIds: sources,
    impactedLayers,
    impactedLayerIds,
    downstreamLayers,
    steps,
    chainLabel: cascadeChainLabel(steps),
    criticalImpactedCount: impactedLayers.filter((layer) => layer.isCriticalChokepoint).length,
    affectedComputeShare: compute.value,
    computeImpactMethod: compute.method,
    label: source.kind === 'layer' ? sourceLayers[0]!.name.split('(')[0]!.trim() : source.name,
  };
}
