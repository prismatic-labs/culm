import type { Layer } from '../types';
import { isSlowSubstitutability } from './chokepoint';
import { escapeHtml } from './escape-html';
import { pct100, SUBSTITUTABILITY_LABEL } from './ui';

/** Layer spans multiple dominant geographies (e.g. gallium in China, photoresists in Japan). */
export function isCompositeLayer(layer: Layer): boolean {
  return layer.metrics.dominantCountries.length > 1;
}

export function compositeGeoSummary(layer: Layer): string {
  return layer.metrics.dominantCountries
    .map((entry) => `${entry.country} ${pct100(entry.share.value)}%`)
    .join(' · ');
}

export function renderCompositeNoticeHtml(layer: Layer): string {
  if (!isCompositeLayer(layer)) return '';

  return `
    <div class="blk composite-notice">
      <h3>Composite layer</h3>
      <p>
        This stack step bundles several distinct inputs. Each input has its own dominant country.
        Headline ${escapeHtml('CR1')} (${pct100(layer.metrics.cr1.value)}%) uses
        ${escapeHtml(layer.metrics.cr1.note?.replace(/\.$/, '') ?? 'the tightest supplier concentration in this layer')}.
      </p>
    </div>
  `;
}

export function renderCompositeChokepointsHtml(layer: Layer): string {
  if (!isCompositeLayer(layer)) return '';

  const subst = layer.metrics.substitutability.value;
  const slow = isSlowSubstitutability(subst);

  const rows = layer.metrics.dominantCountries
    .map((entry) => {
      const share = pct100(entry.share.value);
      const meets = entry.share.value >= 0.8 && slow;
      const status = meets
        ? `No ready backup · ${SUBSTITUTABILITY_LABEL[subst] ?? subst} to substitute`
        : 'Below 80% concentration for this input';
      const detail = entry.share.note?.replace(/\.$/, '') ?? `${share}% of this input sits in ${entry.country}`;
      const actor = layer.actors.find((a) => a.country === entry.country);
      const inputLabel = actor
        ? escapeHtml(actor.name.split('(')[0]!.trim())
        : escapeHtml(entry.country);

      return `
        <li class="composite-choke-row${meets ? ' composite-choke-row--hot' : ''}">
          <div class="composite-choke-head">
            <strong>${inputLabel}</strong>
            <span class="composite-choke-geo">${escapeHtml(entry.country)} · ${share}%</span>
          </div>
          <p class="composite-choke-status">${escapeHtml(status)}</p>
          <p class="composite-choke-detail">${escapeHtml(detail)}</p>
        </li>
      `;
    })
    .join('');

  return `
    <div class="choke choke--composite">
      <div class="lbl">Critical chokepoints by input</div>
      <ul class="composite-choke-list">${rows}</ul>
    </div>
  `;
}
