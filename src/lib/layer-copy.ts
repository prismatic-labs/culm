import type { Layer } from '../types';
import { layerShortName } from './downstream-flow';
import { SUBSTITUTABILITY_LABEL } from './ui';

function firstSentence(text: string): string {
  const end = text.indexOf('.');
  return end === -1 ? text.trim() : text.slice(0, end + 1).trim();
}

/** Inspect-mode thesis headline for the selected layer. */
export function layerThesisHeadline(layer: Layer): string {
  return firstSentence(layer.whyItMatters);
}

export type HeroMetric = 'geographic' | 'firm';

/**
 * Which dimension should lead the thesis hero stat. When one country holds more
 * of the layer than the single biggest firm, the story is geographic; otherwise
 * it is a single-firm story (e.g. ASML in EUV).
 */
export function layerHeroMetric(layer: Layer): HeroMetric {
  return layer.metrics.topCountryShare.value > layer.metrics.cr1.value ? 'geographic' : 'firm';
}

/** Inspect-mode thesis subline. The headline number lives in the hero stat, so this stays complementary. */
export function layerThesisSub(layer: Layer, directDownstream: number): string {
  const name = layerShortName(layer);
  const country = layer.metrics.topCountry;
  const parts = [`${name} · ${country}`];
  if (directDownstream > 0) {
    parts.push(
      `${directDownstream} layer${directDownstream === 1 ? '' : 's'} depend on it directly`,
    );
  }
  return parts.join(' · ');
}

/** Human-facing chokepoint copy for the layer detail panel. */
export function humanChokepointPanelCopy(layer: Layer): string {
  if (layer.isCriticalChokepoint) {
    return firstSentence(layer.whyItMatters);
  }

  const subst =
    SUBSTITUTABILITY_LABEL[layer.metrics.substitutability.value] ??
    layer.metrics.substitutability.value;

  if (
    layer.metrics.substitutability.value === 'months' ||
    layer.metrics.substitutability.value === 'fungible'
  ) {
    return `Alternatives could scale within ${subst}. Firm concentration is high, but a single-country cut would not stick for long.`;
  }

  return `High concentration, but substitutes could scale faster than a critical chokepoint. ${firstSentence(layer.whyItMatters)}`;
}
