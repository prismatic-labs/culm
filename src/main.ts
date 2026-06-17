/// <reference types="vite/client" />

import { concentrationMap } from './data/concentration-map';
import { API_SUMMARY } from './lib/data-sources';
import { analyzeCascade, type CascadeImpact } from './lib/cascade';
import { getDownstreamLayerIds, sortedLayers } from './lib/chokepoint';
import { aggregateByCountry } from './lib/country-aggregate';
import {
  compositeGeoSummary,
  isCompositeLayer,
  renderCompositeChokepointsHtml,
  renderCompositeNoticeHtml,
} from './lib/composite-layer';
import { countryThesisCopy } from './lib/country-thesis';
import { layerShortName } from './lib/downstream-flow';
import {
  humanChokepointPanelCopy,
  layerHeroMetric,
  layerThesisHeadline,
  layerThesisSub,
} from './lib/layer-copy';
import { renderAboutHtml } from './lib/about';
import { renderGuideHtml, type GuideTabId } from './lib/guide';
import {
  COPY,
  interactHintWhatIfActive,
  interactHintWhatIfIdle,
  withArticle,
} from './lib/ui-copy';
import { buildDatasetSnapshot } from './lib/dataset-snapshot';
import { renderEvidenceRow } from './lib/evidence';
import {
  CONFIDENCE_DEFINITIONS,
  initConfidenceTips,
  renderConfidenceLegend,
  renderConfidenceTag,
} from './lib/confidence';
import { mountExploreNav, renderDeeperBridge } from './lib/explore-nav';
import { escapeAttr, escapeHtml } from './lib/escape-html';
import { layerHeldInCountry } from './lib/layer-countries';
import {
  hhiBand,
  metricAbbr,
  metricDef,
  metricPlain,
  metricTip,
  renderMetricsGuideHtml,
} from './lib/metric-guide';
import { renderSourceLinksHtml } from './lib/source-links';
import { updatePageMeta } from './lib/share';
import {
  buildShockImpactBrief,
  renderShockImpactHtml,
  renderShockLayerPicker,
} from './lib/shock-cascade';
import { renderSubcomponentsHtml } from './lib/subcomponents';
import { parseUrlState, replaceUrlFromState } from './lib/url-state';
import { meterBar, metricRowPlain, pct100, SUBSTITUTABILITY_LABEL } from './lib/ui';
import { createMapView } from './map';
import {
  activeShockTarget,
  clearShock,
  getState,
  patchState,
  setCountryShock,
  setLayerShock,
  setStackMode,
  subscribe,
  toggleLayer,
} from './state';
import type { Layer, SourcedValue } from './types';
import './styles.css';

const layers = sortedLayers(concentrationMap.layers);
const stackLayerCount = layers.length;
const countryAggregates = aggregateByCountry(layers);
const mapCountryCount = countryAggregates.length;

function listToProse(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

const stackFlowEl = document.querySelector<HTMLElement>('#stack-flow')!;
const railEl = document.querySelector<HTMLElement>('#rail')!;
const panelEl = document.querySelector<HTMLElement>('#panel')!;
const thesisEl = document.querySelector<HTMLElement>('#thesis')!;
const mapHostEl = document.querySelector<HTMLElement>('#map')!;
const mapTooltipEl = document.querySelector<HTMLElement>('#map-tooltip')!;
const mapCaptionEl = document.querySelector<HTMLElement>('#map-caption')!;
const mapMetaEl = document.querySelector<HTMLElement>('#map-meta')!;

function isUnverified(sourced: SourcedValue<unknown>): boolean {
  return sourced.sources.length === 0;
}

function metricTags(sourced: SourcedValue<unknown>): string {
  const verified = !isUnverified(sourced);
  return `${renderConfidenceTag(sourced.confidence)}<span class="tag ${verified ? '' : 'unverified'}">${verified ? 'sourced' : 'unverified'}</span>`;
}

function tableRow(
  key: string,
  hint: string,
  pct: number,
  max: number,
  valueText: string,
  sourced: SourcedValue<number | string>,
  showBar = true,
  plain = '',
): string {
  return `
    <tr>
      <td class="mk">${key}<span class="mk-hint">${escapeHtml(hint)}</span>${plain ? `<span class="mk-plain">${escapeHtml(plain)}</span>` : ''}</td>
      <td class="mbar">${showBar ? meterBar(pct, max) : ''}</td>
      <td class="mv">${escapeHtml(valueText)}</td>
      <td class="mtag">${metricTags(sourced)}</td>
    </tr>
  `;
}

function sourceLinks(sources: string[], asOf: string): string {
  return renderSourceLinksHtml(sources, asOf);
}

function collectSources(layer: Layer): { urls: string[]; asOf: string } {
  const urls = new Set<string>();
  let asOf = layer.metrics.cr1.asOf;
  const add = (s: SourcedValue<unknown>) => {
    s.sources.forEach((u) => urls.add(u));
    if (s.asOf) asOf = s.asOf;
  };
  add(layer.metrics.cr1);
  add(layer.metrics.cr3);
  add(layer.metrics.hhi);
  add(layer.metrics.topCountryShare);
  add(layer.metrics.substitutability);
  layer.actors.forEach((a) => add(a.share));
  return { urls: [...urls], asOf };
}

function evidenceRows(layer: Layer): string {
  const rows: Array<{ label: string; value: string; sourced: SourcedValue<number | string> }> = [
    { label: 'CR1', value: `${pct100(layer.metrics.cr1.value)}%`, sourced: layer.metrics.cr1 },
    { label: 'CR3', value: `${pct100(layer.metrics.cr3.value)}%`, sourced: layer.metrics.cr3 },
    {
      label: 'HHI',
      value: Math.round(layer.metrics.hhi.value).toLocaleString('en-US'),
      sourced: layer.metrics.hhi,
    },
    {
      label: `${layer.metrics.topCountry} share`,
      value: `${pct100(layer.metrics.topCountryShare.value)}%`,
      sourced: layer.metrics.topCountryShare,
    },
    {
      label: 'Substitutability',
      value:
        SUBSTITUTABILITY_LABEL[layer.metrics.substitutability.value] ??
        layer.metrics.substitutability.value,
      sourced: layer.metrics.substitutability,
    },
    ...layer.actors.map((actor) => ({
      label: actor.name,
      value: `${pct100(actor.share.value)}%`,
      sourced: actor.share,
    })),
  ];

  return rows.map(({ label, value, sourced }) => renderEvidenceRow(label, value, sourced)).join('');
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function concentrationCsv(): string {
  const header = [
    'layer_id',
    'layer_name',
    'category',
    'stack_order',
    'metric',
    'value',
    'confidence',
    'as_of',
    'sources',
    'raw_claim',
    'extraction',
    'caveat',
    'note',
  ];
  const rows = layers.flatMap((layer) => {
    const metrics = [
      ['cr1', layer.metrics.cr1],
      ['cr3', layer.metrics.cr3],
      ['hhi', layer.metrics.hhi],
      ['top_country_share', layer.metrics.topCountryShare],
      ['substitutability', layer.metrics.substitutability],
    ] as const;
    return metrics.map(([metric, sourced]) => [
      layer.id,
      layer.name,
      layer.category,
      layer.stackOrder,
      metric,
      sourced.value,
      sourced.confidence,
      sourced.asOf,
      sourced.sources.join(' '),
      sourced.rawClaim ?? '',
      sourced.extraction ?? '',
      sourced.caveat ?? '',
      sourced.note ?? '',
    ]);
  });
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

function downloadText(filename: string, mime: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function shockBrief(cascade: CascadeImpact) {
  return buildShockImpactBrief(
    cascade.sourceLayers,
    cascade.steps,
    layers,
    stackLayerCount,
    cascade.label,
    cascade.affectedComputeShare,
    cascade.computeImpactMethod,
  );
}

function wireShockPickers(root: ParentNode): void {
  root.querySelectorAll<HTMLButtonElement>('[data-shock-pick]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const id = button.dataset.shockPick;
      if (!id) return;
      const layer = layers.find((l) => l.id === id);
      if (!layer) return;
      setLayerShock(id, layer.metrics.topCountry);
    });
  });
}

function syncInteractHint(): void {
  const hint = document.querySelector<HTMLElement>('#interact-hint');
  if (!hint) return;
  const state = getState();
  const cascade = analyzeCascade(layers, activeShockTarget());

  if (state.stackMode === 'shock') {
    hint.hidden = false;
    hint.innerHTML = cascade
      ? interactHintWhatIfActive(cascade.label)
      : interactHintWhatIfIdle();
  } else {
    // In Inspect mode the stack-flow pills and the thesis banner already guide
    // the user, so the boxed hint is redundant friction. Keep it for What if?,
    // where it carries live simulation state.
    hint.hidden = true;
    hint.innerHTML = '';
  }
}

function syncStackLabel(): void {
  const label = document.querySelector<HTMLElement>('.col-stack .col-label span:first-child');
  if (!label) return;
  label.textContent =
    getState().stackMode === 'shock' ? COPY.stackTapRemove : COPY.stackDefault;
}

function syncMapLegend(): void {
  const legend = document.querySelector<HTMLElement>('#map-legend');
  if (!legend) return;
  const state = getState();

  if (state.stackMode === 'shock') {
    legend.innerHTML = `
      <span class="map-legend-item"><span class="map-legend-swatch map-legend-swatch--shock-source"></span> Red marker = removed source</span>
      <span class="map-legend-item"><span class="map-legend-swatch map-legend-swatch--shock-downstream"></span> Warm outline = stalled geography</span>
      <span class="map-legend-item">${legendArrowSvg('shock')} Red arrow = cascade dependency</span>
    `;
    return;
  }

  legend.innerHTML = `
    <span class="map-legend-item"><span class="map-legend-swatch map-legend-swatch--hot"></span> Green marker = stronger role on critical chokepoint layers</span>
    <span class="map-legend-item">${legendArrowSvg('flow')} Copper arrow = direct dependency (current selection)</span>
  `;
}

function legendArrowSvg(variant: 'flow' | 'shock'): string {
  return `<svg class="legend-arrow legend-arrow--${variant}" width="26" height="10" viewBox="0 0 26 10" aria-hidden="true" focusable="false"><line x1="1" y1="5" x2="17.5" y2="5" /><path d="M16 1.6 L24 5 L16 8.4 Z" /></svg>`;
}

function renderShockThesis(cascade: CascadeImpact | null): void {
  thesisEl.hidden = false;
  thesisEl.classList.remove('thesis--hidden');
  thesisEl.className = 'thesis thesis--shock';

  if (!cascade) {
    thesisEl.innerHTML = `
      <div class="thesis-words">
        <div class="big">What if a layer disappears?</div>
        <div class="sub">Simulate removing a stack layer or country to trace what stalls downstream. Full detail appears in the panel below the map.</div>
      </div>
    `;
    return;
  }

  const brief = shockBrief(cascade);
  const computeFact =
    brief.computeShare !== null
      ? `<span>${pct100(brief.computeShare)}% compute at risk (estimate)</span>`
      : '';

  thesisEl.innerHTML = `
    <div class="thesis-words">
      <p class="shock-impact-kicker">${escapeHtml(brief.sourceLabel)} removed</p>
      <div class="big thesis-focus">${escapeHtml(brief.headline)}</div>
      <div class="thesis-why">${escapeHtml(brief.bottomLine)}</div>
      <div class="shock-thesis-facts">
        <span>${brief.impactedCount}/${brief.stackLayerCount} layers affected</span>
        <span>${brief.downstreamCount} downstream blocked</span>
        ${computeFact}
      </div>
      <button type="button" class="shock-secondary thesis-reset" id="thesis-reset-sim">${COPY.resetSimulation}</button>
    </div>
  `;
  thesisEl.querySelector<HTMLButtonElement>('#thesis-reset-sim')?.addEventListener('click', clearShock);
}

function renderThesis(): void {
  const state = getState();
  const cascade = analyzeCascade(layers, activeShockTarget());

  if (state.stackMode === 'shock') {
    renderShockThesis(cascade);
    return;
  }

  thesisEl.hidden = false;
  thesisEl.classList.remove('thesis--hidden');

  if (state.mode === 'country' && state.selectedCountry) {
    const agg = countryAggregates.find((c) => c.country === state.selectedCountry);
    if (agg) {
      const copy = countryThesisCopy(agg.country, agg.layers, stackLayerCount);
      thesisEl.className = 'thesis thesis--country';
      thesisEl.innerHTML = `
        <div class="thesis-words">
          <div class="big thesis-focus">${escapeHtml(agg.country)}</div>
          ${
            copy.layerLead
              ? `<div class="thesis-layer-lead">${escapeHtml(copy.layerLead)}</div>
          <div class="thesis-layer-meta">${escapeHtml(copy.layerLeadMeta ?? '')}</div>`
              : ''
          }
          <div class="sub">${escapeHtml(copy.sub)}</div>
          <div class="thesis-why">${escapeHtml(copy.why)}</div>
        </div>
        <div class="thesis-stat">
          <div class="num">${escapeHtml(copy.statNum)}</div>
          <div class="cap">${escapeHtml(copy.statCap)}</div>
        </div>
      `;
      return;
    }
  }

  thesisEl.className = 'thesis thesis--layer';

  if (!state.selectedLayer) {
    thesisEl.className = 'thesis thesis--overview';
    const criticalLayers = layers.filter((l) => l.isCriticalChokepoint);
    const chokeCountries = [...new Set(criticalLayers.map((l) => l.metrics.topCountry))];
    const payoff =
      criticalLayers.length > 0
        ? `${criticalLayers.length} of the ${stackLayerCount} layers are critical chokepoints; ${chokeCountries.length} countries dominate them: ${listToProse(chokeCountries)}.`
        : '';
    thesisEl.innerHTML = `
      <div class="thesis-words">
        <div class="big">Where concentration is highest.</div>
        <div class="sub">Select any layer or country. EUV lithography is among the most concentrated layers. What if? simulates removing one.</div>
        ${payoff ? `<div class="thesis-payoff">${escapeHtml(payoff)}</div>` : ''}
      </div>
      <div class="thesis-stat">
        <div class="num">${criticalLayers.length || stackLayerCount}</div>
        <div class="cap">critical chokepoints of ${stackLayerCount} layers</div>
      </div>
    `;
    return;
  }

  const layer = layers.find((l) => l.id === state.selectedLayer);

  if (!layer) {
    thesisEl.innerHTML =
      '<div class="thesis-words"><div class="big">Layer not found.</div></div>';
    return;
  }

  const cr1 = pct100(layer.metrics.cr1.value);
  const country = layer.metrics.topCountry;
  const cshare = pct100(layer.metrics.topCountryShare.value);
  const directDownstream = layers.filter((l) => l.dependsOn.includes(layer.id)).length;

  let statNum: string;
  let statCap: string;
  let capPlain: string;
  if (isCompositeLayer(layer)) {
    statNum = `${cr1}%`;
    statCap = `Composite · ${escapeHtml(compositeGeoSummary(layer))}`;
    capPlain = escapeHtml(metricPlain('cr1', cr1));
  } else if (layerHeroMetric(layer) === 'geographic') {
    statNum = `${cshare}%`;
    statCap = `${escapeHtml(country)} · ${metricAbbr('top-country-share', 'geographic share')}`;
    capPlain = escapeHtml(`${cshare}% of this layer sits in ${withArticle(country)}`);
  } else {
    statNum = `${cr1}%`;
    statCap = `${metricAbbr('cr1')} · single largest supplier`;
    capPlain = escapeHtml(`${cshare}% of supply sits in ${withArticle(country)}`);
  }

  thesisEl.innerHTML = `
    <div class="thesis-words">
      <div class="big">${escapeHtml(layerThesisHeadline(layer))}</div>
      <div class="sub">${escapeHtml(layerThesisSub(layer, directDownstream))}</div>
      <div class="thesis-simulate">
        <button type="button" class="shock-action thesis-try-shock" id="try-shock-layer">${escapeHtml(COPY.simulateLayer)}</button>
        <p class="thesis-simulate-hint">${escapeHtml(COPY.simulateLayerHint)}</p>
      </div>
    </div>
    <div class="thesis-stat">
      <div class="num">${statNum}</div>
      <div class="cap">${statCap}</div>
      <div class="cap-plain">${capPlain}</div>
    </div>
  `;
  thesisEl.querySelector<HTMLButtonElement>('#try-shock-layer')?.addEventListener('click', () => {
    setLayerShock(layer.id, layer.metrics.topCountry);
  });
}

function renderStackFlow(): void {
  const state = getState();
  const shockSourceIds = analyzeCascade(layers, activeShockTarget())?.sourceLayerIds;

  stackFlowEl.innerHTML = layers
    .map((layer, index) => {
      const selected = state.mode === 'layer' && layer.id === state.selectedLayer;
      const isShockSource = shockSourceIds?.has(layer.id) ?? false;
      const classes = ['stack-flow-step'];
      if (selected) classes.push('is-selected');
      if (isShockSource) classes.push('is-shock-source');
      const choke = layer.isCriticalChokepoint
        ? '<span class="stack-flow-dot" aria-hidden="true"></span>'
        : '';
      const arrow =
        index < layers.length - 1
          ? '<span class="stack-flow-arrow" aria-hidden="true">&#8594;</span>'
          : '';
      return `
        <button
          type="button"
          class="${classes.join(' ')}"
          data-flow-layer-id="${layer.id}"
          title="${escapeAttr(layer.name)}"
          aria-pressed="${selected ? 'true' : 'false'}"
        >
          <span class="stack-flow-ord">${String(layer.stackOrder).padStart(2, '0')}</span>
          <span class="stack-flow-name">${choke}${escapeHtml(layer.category)}</span>
        </button>${arrow}`;
    })
    .join('');

  stackFlowEl.querySelectorAll<HTMLButtonElement>('[data-flow-layer-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.flowLayerId!;
      const layer = layers.find((l) => l.id === id)!;
      if (getState().stackMode === 'shock') {
        setLayerShock(id, layer.metrics.topCountry);
        return;
      }
      toggleLayer(id, layer.metrics.topCountry);
    });
  });
}

function renderRail(): void {
  const state = getState();
  const cascade = analyzeCascade(layers, activeShockTarget());
  const selectedLayerObj =
    state.mode === 'layer' && state.selectedLayer
      ? layers.find((l) => l.id === state.selectedLayer) ?? null
      : null;
  const directUpstream = new Set(selectedLayerObj?.dependsOn ?? []);

  railEl.classList.toggle('rail--shock-nav', state.stackMode === 'shock');

  railEl.innerHTML = layers
    .map((layer) => {
      const cr1 = pct100(layer.metrics.cr1.value);
      const cshare = pct100(layer.metrics.topCountryShare.value);
      const hhi = Math.round(layer.metrics.hhi.value);
      const classes = ['layer'];

      let relHtml = '';
      if (state.mode === 'country' && state.selectedCountry) {
        if (layerHeldInCountry(layer, state.selectedCountry)) classes.push('selected');
        else classes.push('dimmed');
      } else if (state.mode === 'layer' && selectedLayerObj) {
        if (layer.id === selectedLayerObj.id) {
          classes.push('selected');
        } else if (directUpstream.has(layer.id)) {
          classes.push('dep-up');
          relHtml = '<span class="layer-rel layer-rel--up">feeds it &uarr;</span>';
        } else if (layer.dependsOn.includes(selectedLayerObj.id)) {
          classes.push('dep-down');
          relHtml = '<span class="layer-rel layer-rel--down">relies on it &darr;</span>';
        } else {
          classes.push('dimmed');
        }
      }
      if (cascade) {
        if (cascade.sourceLayerIds.has(layer.id)) classes.push('shock-source');
        else if (cascade.impactedLayerIds.has(layer.id)) classes.push('shock-downstream');
        else classes.push('dimmed');
      }

      const dot = layer.isCriticalChokepoint ? '<span class="chip-dot"></span>' : '';
      const tagline = layer.whatItIs.split('.')[0] ?? layer.whatItIs;
      const hhiPlain = hhiBand(hhi);

      const shockBadge = cascade
        ? cascade.sourceLayerIds.has(layer.id)
          ? '<span class="shock-badge shock-badge--source">removed</span>'
          : cascade.impactedLayerIds.has(layer.id)
            ? '<span class="shock-badge shock-badge--downstream">stalls</span>'
            : ''
        : '';

      const geoLine = isCompositeLayer(layer)
        ? `<div class="geo geo--composite"><span class="geo-label">Inputs</span> ${escapeHtml(compositeGeoSummary(layer))} · ${metricAbbr('hhi')} ${hhi.toLocaleString('en-US')} <span class="geo-plain">(${escapeHtml(hhiPlain.label)})</span></div>`
        : `<div class="geo">${metricAbbr('top-country-share', layer.metrics.topCountry)} ${cshare}% · ${metricAbbr('hhi')} ${hhi.toLocaleString('en-US')} <span class="geo-plain">(${escapeHtml(hhiPlain.label)})</span></div>`;

      return `
        <div role="button" tabindex="0" class="${classes.join(' ')}" data-layer-id="${layer.id}" aria-pressed="${layer.id === state.selectedLayer ? 'true' : 'false'}">
          <div class="layer-top">
            <span class="ord">${String(layer.stackOrder).padStart(2, '0')}</span>
            <span class="lname">${dot}${escapeHtml(layer.name)}${shockBadge}</span>
            ${relHtml || `<span class="lcat">${escapeHtml(layer.category)}</span>`}
          </div>
          <p class="layer-tagline">${escapeHtml(tagline)}.</p>
          ${metricRowPlain('cr1', 'CR1', cr1, 100, `${cr1}%`, metricTip('cr1'), 'map')}
          ${geoLine}
        </div>
      `;
    })
    .join('');

  railEl.querySelectorAll<HTMLElement>('[data-layer-id]').forEach((row) => {
    const activate = () => {
      const id = row.dataset.layerId!;
      const layer = layers.find((l) => l.id === id)!;
      if (getState().stackMode === 'shock') {
        setLayerShock(id, layer.metrics.topCountry);
        return;
      }
      toggleLayer(id, layer.metrics.topCountry);
    };
    row.addEventListener('click', activate);
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
  });
}

function concentrationStakesHtml(layer: Layer): string {
  const downstream = getDownstreamLayerIds(layers, layer.id);
  const cr1 = pct100(layer.metrics.cr1.value);
  const country = layer.metrics.topCountry;

  const fragility = layer.isCriticalChokepoint
    ? `<strong>Fragility.</strong> A critical chokepoint: if supply from ${escapeHtml(country)} is cut, ${downstream.size} downstream layer${downstream.size === 1 ? '' : 's'} would be hard to operate at scale.`
    : downstream.size > 0
      ? `<strong>Fragility.</strong> More than one supplier exists, so losing any single one is more recoverable than at the stack's chokepoints.`
      : `<strong>Fragility.</strong> Sits at the top of the stack; little depends on it downstream.`;

  const leverage =
    cr1 >= 50
      ? `<strong>Leverage.</strong> With ${cr1}% in one supplier's hands, whoever holds this layer can restrict or prioritize supply. <a href="controls/">Export controls already work this way</a>.`
      : `<strong>Leverage.</strong> No single supplier dominates, so this layer offers less unilateral control than the stack's true chokepoints.`;

  return `
    <div class="blk stakes">
      <h3>What the concentration means</h3>
      <p>${fragility}</p>
      <p>${leverage}</p>
    </div>`;
}

function renderLayerPanel(layer: Layer): void {
  const cr1 = pct100(layer.metrics.cr1.value);
  const cr3 = pct100(layer.metrics.cr3.value);
  const cshare = pct100(layer.metrics.topCountryShare.value);
  const hhi = Math.round(layer.metrics.hhi.value);
  const sub =
    SUBSTITUTABILITY_LABEL[layer.metrics.substitutability.value] ?? layer.metrics.substitutability.value;
  const downstream = getDownstreamLayerIds(layers, layer.id);
  const { urls, asOf } = collectSources(layer);
  const hhiPlain = hhiBand(hhi);
  const chokeCopy = humanChokepointPanelCopy(layer);

  const propagationBlock =
    downstream.size > 0
      ? `
      <details class="blk propagation">
        <summary>Downstream propagation (${downstream.size} layer${downstream.size === 1 ? '' : 's'})</summary>
        <p>Without this layer, these dependent layers would be hard to operate at scale:</p>
        <ul class="actor-list">
          ${[...downstream]
            .map((id) => layers.find((l) => l.id === id)!)
            .sort((a, b) => a.stackOrder - b.stackOrder)
            .map((l) => `<li>${escapeHtml(l.name)} · ${escapeHtml(l.metrics.topCountry)}</li>`)
            .join('')}
        </ul>
      </details>
    `
      : '';

  const chokeBlock =
    layer.isCriticalChokepoint && isCompositeLayer(layer)
      ? renderCompositeChokepointsHtml(layer)
      : layer.isCriticalChokepoint
        ? `
      <div class="choke">
        <div class="lbl">Critical chokepoint</div>
        <div class="why">${escapeHtml(chokeCopy)}</div>
      </div>
    `
        : `
      <div class="blk">
        <h3>Chokepoint classification</h3>
        <p class="choke-muted">${escapeHtml(chokeCopy)}</p>
      </div>
    `;

  panelEl.innerHTML = `
    <h2>${escapeHtml(layer.name)}</h2>
    <div class="panel-meta">${escapeHtml(layer.category)} · stack order ${layer.stackOrder} · ${escapeHtml(layer.metrics.topCountry)}</div>

    <div class="blk"><h3>What it is</h3><p>${escapeHtml(layer.whatItIs)}</p></div>
    <div class="blk"><h3>Why it matters</h3><p>${escapeHtml(layer.whyItMatters)}</p></div>

    ${concentrationStakesHtml(layer)}

    ${renderCompositeNoticeHtml(layer)}

    <div class="blk">
      <h3>Concentration metrics</h3>
      <table class="metrics">
        ${tableRow(metricAbbr('cr1'), metricDef('cr1')?.hint ?? 'Largest supplier', cr1, 100, `${cr1}%`, layer.metrics.cr1, true, metricPlain('cr1', cr1))}
        ${tableRow(metricAbbr('cr3'), metricDef('cr3')?.hint ?? 'Top three', cr3, 100, `${cr3}%`, layer.metrics.cr3, true, metricPlain('cr3', cr3))}
        ${tableRow(metricAbbr('hhi'), metricDef('hhi')?.hint ?? 'Concentration index', hhi, 10000, hhi.toLocaleString('en-US'), layer.metrics.hhi, true, `${hhiPlain.label} (${hhiPlain.detail})`)}
        ${tableRow(metricAbbr('top-country-share', layer.metrics.topCountry), metricDef('top-country-share')?.hint ?? 'Country share', cshare, 100, `${cshare}%`, layer.metrics.topCountryShare, true, metricPlain('top-country-share', cshare))}
        <tr>
          <td class="mk">Substitutability<span class="mk-hint">${escapeHtml(metricDef('substitutability')?.hint ?? 'Time to replace')}</span></td>
          <td class="mbar"></td>
          <td class="mv">${escapeHtml(sub)}</td>
          <td class="mtag">${metricTags(layer.metrics.substitutability)}</td>
        </tr>
      </table>
      ${layer.metrics.topCountryShare.note ? `<p class="note">${escapeHtml(layer.metrics.topCountryShare.note)}</p>` : ''}
      ${
        !isCompositeLayer(layer) && layer.metrics.dominantCountries.length > 1
          ? `<p class="note">Dominant geographies: ${escapeHtml(layer.metrics.dominantCountries.map((entry) => `${entry.country} (${pct100(entry.share.value)}%)`).join('; '))}.</p>`
          : ''
      }
    </div>

    ${chokeBlock}

    ${renderSubcomponentsHtml(layer)}

    <div class="blk">
      <h3>Actors</h3>
      <ul class="actor-list">
        ${layer.actors
          .map((actor) => {
            const share = pct100(actor.share.value);
            return `<li><strong>${escapeHtml(actor.name)}</strong> (${escapeHtml(actor.country)}): ${share}%
              ${metricTags(actor.share)}
              ${actor.share.note ? `<span class="note">${escapeHtml(actor.share.note)}</span>` : ''}
            </li>`;
          })
          .join('')}
      </ul>
    </div>

    ${propagationBlock}

    <div class="panel-actions panel-actions--simulate">
      <div class="panel-simulate">
        <button type="button" class="shock-action" data-shock-layer-id="${layer.id}">${COPY.simulateLayer}</button>
        <p class="panel-simulate-hint">${escapeHtml(COPY.simulateLayerHint)}</p>
      </div>
      <button type="button" class="shock-secondary" data-clear-shock>${COPY.resetSimulation}</button>
    </div>

    <div class="blk">
      <h3>Sources</h3>
      ${sourceLinks(urls, asOf)}
    </div>

    <details class="evidence-drawer">
      <summary>Evidence details</summary>
      <div class="evidence-body">
        ${evidenceRows(layer)}
      </div>
    </details>
  `;

  panelEl.querySelector<HTMLButtonElement>('[data-shock-layer-id]')?.addEventListener('click', () => {
    setLayerShock(layer.id, layer.metrics.topCountry);
  });
  panelEl.querySelector<HTMLButtonElement>('[data-clear-shock]')?.addEventListener('click', clearShock);
}

function renderCountryPanel(country: string): void {
  const agg = countryAggregates.find((c) => c.country === country);
  if (!agg) {
    panelEl.innerHTML = '<p class="choke-muted">No layers mapped to this country.</p>';
    return;
  }

  const layerCards = agg.layers
    .map((layer) => {
      const cr1 = pct100(layer.metrics.cr1.value);
      const choke = layer.isCriticalChokepoint
        ? '<span class="chip-dot"></span> critical chokepoint'
        : '';
      const chokeMeta = choke ? `<span class="country-layer-meta">${choke} · ${metricTags(layer.metrics.cr1)}</span>` : `<span class="country-layer-meta">${metricTags(layer.metrics.cr1)}</span>`;
      return `
        <li class="country-layer-row">
          <button type="button" class="country-layer-btn" data-layer-id="${layer.id}">
            <span class="country-layer-name">${escapeHtml(layer.name.split('(')[0].trim())}</span>
            ${metricRowPlain('cr1', 'CR1', cr1, 100, `${cr1}%`, metricTip('cr1'), 'map')}
            ${chokeMeta}
            ${layer.metrics.topCountryShare.note ? `<span class="note">${escapeHtml(layer.metrics.topCountryShare.note)}</span>` : ''}
          </button>
        </li>
      `;
    })
    .join('');

  panelEl.innerHTML = `
    <h2>${escapeHtml(country)}</h2>
    <div class="panel-meta">${agg.layers.length} of ${stackLayerCount} stack layers · ${agg.chokepointCount} critical chokepoint${agg.chokepointCount === 1 ? '' : 's'}</div>
    <div class="panel-actions panel-actions--simulate">
      <div class="panel-simulate">
        <button type="button" class="shock-action" data-shock-country="${escapeAttr(country)}">${COPY.simulateCountry}</button>
        <p class="panel-simulate-hint">${escapeHtml(COPY.simulateCountryHint)}</p>
      </div>
      <button type="button" class="shock-secondary" data-clear-shock>${COPY.resetSimulation}</button>
    </div>

    <div class="blk">
      <h3>Layers held here</h3>
      <ul class="country-layer-list">${layerCards}</ul>
    </div>

    ${
      agg.caveats.length
        ? `
      <div class="blk">
        <h3>Caveats</h3>
        ${agg.caveats.map((c) => `<p class="note">${escapeHtml(c)}</p>`).join('')}
      </div>
    `
        : ''
    }

    ${
      agg.hasUnverified
        ? `<p class="note">Some values for this country carry <span class="tag unverified">unverified</span> tags. Open a layer for detail.</p>`
        : ''
    }
  `;

  panelEl.querySelectorAll<HTMLButtonElement>('.country-layer-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.layerId!;
      const layer = layers.find((l) => l.id === id)!;
      toggleLayer(id, layer.metrics.topCountry);
    });
  });
  panelEl.querySelector<HTMLButtonElement>('[data-shock-country]')?.addEventListener('click', () => {
    setCountryShock(country);
  });
  panelEl.querySelector<HTMLButtonElement>('[data-clear-shock]')?.addEventListener('click', clearShock);
}

function renderShockPanel(cascade: CascadeImpact): void {
  const brief = shockBrief(cascade);
  panelEl.innerHTML = renderShockImpactHtml(brief, cascade.steps, layers, cascade.sourceLayers, {
    slimLead: true,
  });
  panelEl.querySelector<HTMLButtonElement>('#shock-clear')?.addEventListener('click', clearShock);
  wireShockPickers(panelEl);
  wireMetricTips(panelEl);
}

function renderPanel(): void {
  const state = getState();
  const cascade = analyzeCascade(layers, activeShockTarget());

  if (state.stackMode === 'shock' && !cascade) {
    panelEl.innerHTML = `
      <h2>${COPY.modeWhatIf}</h2>
      <p class="panel-meta">Simulate removing a layer or country and trace downstream impact</p>
      <div class="shock-impact">
        ${renderShockLayerPicker(layers, new Set())}
        <p class="shock-impact-summary">Pick a layer in the picker, stack rail, or map.</p>
      </div>
    `;
    wireShockPickers(panelEl);
    return;
  }

  if (cascade) {
    renderShockPanel(cascade);
    return;
  }

  if (state.mode === 'country' && state.selectedCountry) {
    renderCountryPanel(state.selectedCountry);
    return;
  }

  const layer = state.selectedLayer ? layers.find((l) => l.id === state.selectedLayer) : undefined;
  if (!layer) {
    renderStarterPanel();
    return;
  }

  renderLayerPanel(layer);
}

const STARTER_LAYER_IDS = ['euv-litho', 'leading-edge-fab', 'hbm'];

function renderStarterPanel(): void {
  const starters = STARTER_LAYER_IDS.map((id) => layers.find((l) => l.id === id)).filter(
    (l): l is Layer => Boolean(l),
  );

  const items = starters
    .map((layer) => {
      const hero =
        layerHeroMetric(layer) === 'geographic'
          ? `${escapeHtml(layer.metrics.topCountry)} ${pct100(layer.metrics.topCountryShare.value)}%`
          : `${pct100(layer.metrics.cr1.value)}% one firm`;
      return `
        <li>
          <button type="button" class="panel-starter-btn" data-layer-id="${layer.id}">
            <span class="panel-starter-name">${escapeHtml(layerShortName(layer))}</span>
            <span class="panel-starter-stat">${hero}</span>
            <span class="panel-starter-why">${escapeHtml(layerThesisHeadline(layer))}</span>
          </button>
        </li>
      `;
    })
    .join('');

  panelEl.innerHTML = `
    <h2>Start here</h2>
    <p class="panel-meta">Pick a layer to see who controls it, why it matters, and what breaks without it. Or tap a country on the map.</p>
    <div class="blk">
      <h3>The narrowest chokepoints</h3>
      <ul class="panel-starter">${items}</ul>
    </div>
    <p class="note">Switch to <strong>${COPY.modeWhatIf}</strong> to remove a layer or country and trace what stalls downstream.</p>
  `;

  panelEl.querySelectorAll<HTMLButtonElement>('.panel-starter-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.layerId!;
      const target = layers.find((l) => l.id === id)!;
      toggleLayer(id, target.metrics.topCountry);
    });
  });
}

function renderMetricsGuide(): void {
  document.querySelector<HTMLElement>('#metrics-guide')!.innerHTML = renderMetricsGuideHtml();
}

function renderAbout(): void {
  document.querySelector<HTMLElement>('#about')!.innerHTML = renderAboutHtml();
}

function renderMethodology(): void {
  const defs: Array<[string, string]> = [
    ['CR1', 'Share held by the single largest company (0 to 100%). 100% means a sole supplier.'],
    ['CR3', 'Combined share of the top three companies. Catches oligopolies.'],
    [
      'HHI',
      'Herfindahl-Hirschman Index (0 to 10,000): the sum of squared market shares. Above 2,500 is highly concentrated; 10,000 is a monopoly.',
    ],
    ['Top-country share', 'How much of the layer sits in its single most dominant country.'],
    [
      'Substitutability',
      'How fast alternatives could scale if dominant supply failed: fungible, months, years, or years to decades.',
    ],
    [
      'Confidence',
      CONFIDENCE_DEFINITIONS.map((d) => `${d.label}: ${d.gloss}.`).join(' '),
    ],
  ];

  const defsHtml = defs
    .map(
      ([term, body]) =>
        `<div class="methodology-def"><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(body)}</dd></div>`,
    )
    .join('');

  document.querySelector<HTMLElement>('#methodology')!.innerHTML = `
    <h2>Methodology</h2>
    <p class="methodology-lead">Culm measures concentration at each physical layer of the AI stack with separate, auditable metrics. There is no single blended score: every number stands on its own and carries a confidence level, an as-of date, and source links.</p>
    ${renderConfidenceLegend()}
    <dl class="methodology-defs">${defsHtml}</dl>
    <p class="methodology-rule"><strong>Critical chokepoint:</strong> a layer is flagged when one company or one country holds at least 80% of it, and replacing that supply would take years. Empty sources are shown as unverified.</p>
    <details class="methodology-spec">
      <summary>Data sources and refresh</summary>
      <p>${escapeHtml(API_SUMMARY)}</p>
      <p>Epoch-derived fields refresh monthly via GitHub Actions, or manually with <code>npm run refresh:apis</code> followed by <code>npm run build</code>. The full machine-readable spec ships in the dataset download above.</p>
    </details>
    <p class="methodology-foot">Last updated ${escapeHtml(concentrationMap.lastUpdated)}</p>
  `;
}

function renderDataExport(): void {
  const el = document.querySelector<HTMLElement>('#data-export');
  if (!el) return;
  el.innerHTML = `
    <h2>Dataset</h2>
    <p class="data-export-text">
      Culm dataset <strong>v${escapeHtml(concentrationMap.datasetVersion)}</strong>
      (schema ${escapeHtml(concentrationMap.schemaVersion)}), snapshot ${escapeHtml(concentrationMap.lastUpdated)}.
      Everything below is the same sourced, versioned data behind the map.
    </p>
    <ul class="data-export-list">
      <li class="data-export-row">
        <button type="button" class="data-export-action" id="download-json">Download JSON</button>
        <span class="data-export-desc">The complete dataset: all eight layers with every metric, actor, source link, and confidence flag.</span>
      </li>
      <li class="data-export-row">
        <button type="button" class="data-export-action" id="download-csv">Download CSV</button>
        <span class="data-export-desc">A flat spreadsheet of layers and their headline metrics (CR1, CR3, HHI, top-country share) for quick analysis.</span>
      </li>
      <li class="data-export-row">
        <a class="data-export-action" href="data/schema.json">schema.json</a>
        <span class="data-export-desc">The JSON Schema the dataset validates against, if you want to build on it.</span>
      </li>
    </ul>
    <p class="data-export-cite">${escapeHtml(concentrationMap.citation)}</p>
  `;
  el.querySelector<HTMLButtonElement>('#download-json')?.addEventListener('click', () => {
    downloadText(
      `culm-concentration-${concentrationMap.lastUpdated}.json`,
      'application/json',
      `${JSON.stringify(buildDatasetSnapshot(), null, 2)}\n`,
    );
  });
  el.querySelector<HTMLButtonElement>('#download-csv')?.addEventListener('click', () => {
    downloadText(
      `culm-concentration-${concentrationMap.lastUpdated}.csv`,
      'text/csv',
      `${concentrationCsv()}\n`,
    );
  });
}

function renderMapMeta(): void {
  if (mapMetaEl) {
    mapMetaEl.textContent = `${mapCountryCount} countries · ${stackLayerCount} stack layers`;
  }
}

function wireMetricTips(root: ParentNode = document): void {
  root.querySelectorAll<HTMLButtonElement>('button.metric-tip[data-metric-id]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const guide = document.querySelector<HTMLDetailsElement>('#metrics-guide');
      if (!guide) return;
      guide.open = true;
      const row = document.getElementById(`metric-def-${button.dataset.metricId}`);
      row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      row?.classList.add('metrics-dl-row--flash');
      window.setTimeout(() => row?.classList.remove('metrics-dl-row--flash'), 1200);
    });
  });
}

const renderMap = createMapView(mapHostEl, mapTooltipEl, mapCaptionEl, layers);

function renderGuide(active: GuideTabId = 'overview'): void {
  const el = document.querySelector<HTMLElement>('#guide');
  if (!el) return;
  el.innerHTML = renderGuideHtml(active);
  el.querySelectorAll<HTMLButtonElement>('[data-guide-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.guideTab as GuideTabId | undefined;
      if (!tab) return;
      renderGuide(tab);
    });
  });
}

function renderAll(): void {
  const state = getState();
  renderThesis();
  renderStackFlow();
  renderRail();
  renderPanel();
  renderMap(state);
  wireMetricTips();
  replaceUrlFromState(state);
  updatePageMeta(state, layers);
  syncModeToggleUi();
  syncInteractHint();
  syncStackLabel();
  syncMapLegend();
}

function syncModeToggleUi(): void {
  const state = getState();
  const inspectBtn = document.querySelector<HTMLButtonElement>('#mode-inspect');
  const whatIfBtn = document.querySelector<HTMLButtonElement>('#mode-shock');

  inspectBtn?.setAttribute('aria-pressed', state.stackMode === 'inspect' ? 'true' : 'false');
  whatIfBtn?.setAttribute('aria-pressed', state.stackMode === 'shock' ? 'true' : 'false');

  if (inspectBtn) inspectBtn.textContent = COPY.modeInspect;
  if (whatIfBtn) whatIfBtn.textContent = COPY.modeWhatIf;

  document.body.classList.toggle(
    'culm-shock-mode',
    state.stackMode === 'shock' && !!activeShockTarget(),
  );
}

function setupModeToggle(): void {
  document.querySelector<HTMLButtonElement>('#mode-inspect')?.addEventListener('click', () => {
    setStackMode('inspect');
  });
  document.querySelector<HTMLButtonElement>('#mode-shock')?.addEventListener('click', () => {
    setStackMode('shock');
  });
}

function initFromUrl(): void {
  const patch = parseUrlState(window.location.search);
  if (Object.keys(patch).length === 0) return;
  patchState({
    stackMode: patch.stackMode ?? getState().stackMode,
    mode: patch.mode ?? getState().mode,
    selectedLayer: patch.selectedLayer !== undefined ? patch.selectedLayer : getState().selectedLayer,
    selectedCountry:
      patch.selectedCountry !== undefined ? patch.selectedCountry : getState().selectedCountry,
    shockTarget: patch.shockTarget !== undefined ? patch.shockTarget : getState().shockTarget,
  });
}

renderMetricsGuide();
renderAbout();
renderGuide();
renderMethodology();
renderDataExport();
renderMapMeta();
mountExploreNav(document.querySelector('#explore-nav'), 'stack', '');
const deeperBridgeEl = document.querySelector<HTMLElement>('#deeper-bridge');
if (deeperBridgeEl) deeperBridgeEl.innerHTML = renderDeeperBridge('');
document.querySelector<HTMLElement>('#dataset-version')!.textContent = concentrationMap.datasetVersion;
document.querySelector<HTMLElement>('#dataset-updated')!.textContent = concentrationMap.lastUpdated;
initFromUrl();
subscribe(renderAll);
renderAll();
setupModeToggle();
initConfidenceTips();

document.querySelector<HTMLElement>('#app')!.dataset.ready = 'true';
