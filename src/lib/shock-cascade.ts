import type { Layer } from '../types';
import { isCompositeLayer, renderCompositeNoticeHtml } from './composite-layer';
import { COPY } from './ui-copy';
import { escapeHtml } from './escape-html';
import { layerShortName } from './downstream-flow';
import { pct100, SUBSTITUTABILITY_LABEL } from './ui';

export interface CascadeStep {
  layer: Layer;
  role: 'source' | 'downstream';
  /** Hops from the nearest shocked source along dependsOn edges. */
  depth: number;
}

export interface ShockImpactBrief {
  sourceLabel: string;
  /** One-line summary of what breaks and how far it reaches. */
  headline: string;
  /** Concrete consequences pulled from layer descriptions. */
  bottomLine: string;
  downstreamCount: number;
  impactedCount: number;
  criticalCount: number;
  countries: string[];
  unaffectedLayers: Layer[];
  maxDepth: number;
  computeShare: number | null;
  computeMethod: string | null;
  stackLayerCount: number;
  /** Source context for collapsible detail. */
  sourceMechanism: string;
  sourceConcentration: string;
  sourceRecovery: string;
}

export function sourceLayerIds(sourceLayers: Layer[]): Set<string> {
  return new Set(sourceLayers.map((layer) => layer.id));
}

function firstSentence(text: string): string {
  const end = text.indexOf('.');
  return end === -1 ? text.trim() : text.slice(0, end + 1).trim();
}

function substitutabilityLabel(layer: Layer): string {
  return (
    SUBSTITUTABILITY_LABEL[layer.metrics.substitutability.value] ??
    layer.metrics.substitutability.value
  );
}

function depthByStep(steps: CascadeStep[]): Map<string, number> {
  return new Map(steps.map((step) => [step.layer.id, step.depth]));
}

function whatStops(layer: Layer): string {
  return layer.stallEffect ?? firstSentence(layer.whatItIs);
}

function sourceContext(source: Layer): Pick<
  ShockImpactBrief,
  'sourceMechanism' | 'sourceConcentration' | 'sourceRecovery'
> {
  const actor = source.actors[0];
  const sub = substitutabilityLabel(source);
  return {
    sourceMechanism: source.whyItMatters,
    sourceConcentration: actor
      ? `${actor.name} · ${pct100(actor.share.value)}% of this layer`
      : `${source.metrics.topCountry} · ${pct100(source.metrics.topCountryShare.value)}% geographic share`,
    sourceRecovery:
      source.metrics.substitutability.note ??
      `No substitute modeled within ${sub} in this dataset.`,
  };
}

/** Nearest upstream dependency in the cascade that blocks this step. */
export function blockingLayerForStep(
  step: CascadeStep,
  layers: Layer[],
  depthById: Map<string, number>,
): Layer | null {
  if (step.role === 'source') return step.layer;

  const blockers = step.layer.dependsOn
    .map((id) => layers.find((layer) => layer.id === id))
    .filter((layer): layer is Layer => !!layer && depthById.has(layer.id));

  if (!blockers.length) return null;

  return blockers.sort((a, b) => (depthById.get(a.id) ?? 99) - (depthById.get(b.id) ?? 99))[0]!;
}

function blockingPhrase(
  step: CascadeStep,
  layers: Layer[],
  sourceIds: Set<string>,
  depthById: Map<string, number>,
): string {
  if (step.role === 'source') return 'Removal source: no longer available in this simulation.';

  const blocking = blockingLayerForStep(step, layers, depthById);
  if (!blocking) return 'Upstream dependency in this cascade is unavailable.';

  if (sourceIds.has(blocking.id)) {
    return `Stalls without ${layerShortName(blocking)} (removed · ${substitutabilityLabel(blocking)} to substitute).`;
  }

  return `Stalls while ${layerShortName(blocking)} is stalled upstream.`;
}

function buildBottomLine(downstream: CascadeStep[]): string {
  if (!downstream.length) {
    return 'Nothing downstream depends on this source in the current dependency graph.';
  }

  const picks: CascadeStep[] = [];
  const first = downstream[0]!;
  const last = downstream[downstream.length - 1]!;
  picks.push(first);
  if (downstream.length > 2) {
    picks.push(downstream[Math.floor(downstream.length / 2)]!);
  }
  if (last.layer.id !== first.layer.id) picks.push(last);

  const unique = picks.filter(
    (step, index, arr) => arr.findIndex((other) => other.layer.id === step.layer.id) === index,
  );

  return unique.map((step) => whatStops(step.layer)).join(' ');
}

function buildHeadline(source: Layer, downstream: CascadeStep[]): string {
  const sourceName = layerShortName(source);
  if (!downstream.length) {
    return `Remove ${sourceName} and nothing else in this dataset stalls.`;
  }

  const terminal = downstream[downstream.length - 1]!;
  const terminalName = layerShortName(terminal.layer);

  if (downstream.length === 1) {
    return `Remove ${sourceName} and ${terminalName} stalls. ${whatStops(terminal.layer)}`;
  }

  return `Remove ${sourceName} and ${downstream.length} downstream layers stall, through ${terminalName}.`;
}

export function buildShockImpactBrief(
  sourceLayers: Layer[],
  steps: CascadeStep[],
  allLayers: Layer[],
  stackLayerCount: number,
  label: string,
  computeShare: number | null,
  computeMethod: string | null,
): ShockImpactBrief {
  const source = sourceLayers[0]!;
  const downstream = steps.filter((step) => step.role === 'downstream');
  const impactedIds = new Set(steps.map((step) => step.layer.id));
  const countries = [
    ...new Set(
      steps.flatMap((step) =>
        step.layer.metrics.dominantCountries.map((entry) => entry.country),
      ),
    ),
  ].sort();

  const unaffectedLayers = allLayers.filter((layer) => !impactedIds.has(layer.id));
  const criticalCount = steps.filter((step) => step.layer.isCriticalChokepoint).length;
  const maxDepth = Math.max(...steps.map((step) => step.depth), 0);
  const context = sourceContext(source);

  return {
    sourceLabel: label,
    headline: buildHeadline(source, downstream),
    bottomLine: buildBottomLine(downstream),
    downstreamCount: downstream.length,
    impactedCount: steps.length,
    criticalCount,
    countries,
    unaffectedLayers,
    maxDepth,
    computeShare,
    computeMethod,
    stackLayerCount,
    ...context,
  };
}

/** Assign depth along the stack dependency graph (sources at 0). */
export function buildCascadeSteps(
  layers: Layer[],
  sourceIds: Set<string>,
  impactedIds: Set<string>,
): CascadeStep[] {
  const depth = new Map<string, number>();
  for (const id of sourceIds) depth.set(id, 0);

  const impacted = layers.filter((layer) => impactedIds.has(layer.id));
  for (let pass = 0; pass < impacted.length; pass++) {
    for (const layer of impacted) {
      if (sourceIds.has(layer.id)) continue;
      const nextDepths = layer.dependsOn
        .filter((depId) => depth.has(depId))
        .map((depId) => depth.get(depId)! + 1);
      if (!nextDepths.length) continue;
      const next = Math.min(...nextDepths);
      const prev = depth.get(layer.id);
      if (prev === undefined || next < prev) depth.set(layer.id, next);
    }
  }

  return impacted
    .map((layer) => ({
      layer,
      role: sourceIds.has(layer.id) ? ('source' as const) : ('downstream' as const),
      depth: depth.get(layer.id) ?? 1,
    }))
    .sort((a, b) => a.layer.stackOrder - b.layer.stackOrder);
}

export function cascadeChainLabel(steps: CascadeStep[]): string {
  return steps.map((step) => layerShortName(step.layer)).join(' → ');
}

function depthGroupTitle(depth: number): string {
  if (depth === 1) return 'Stalls immediately';
  if (depth === 2) return 'Stalls next';
  return `${depth} hops out`;
}

export function renderShockLayerPicker(
  allLayers: Layer[],
  activeSourceIds: Set<string>,
): string {
  return `
    <div class="shock-picker" role="group" aria-label="Remove a stack layer">
      <span class="shock-picker-label">Remove a layer</span>
      <div class="shock-picker-track">
        ${allLayers
          .map((layer) => {
            const active = activeSourceIds.has(layer.id);
            const short = escapeHtml(layerShortName(layer));
            return `
              <button
                type="button"
                class="shock-picker-btn${active ? ' shock-picker-btn--active' : ''}"
                data-shock-pick="${escapeHtml(layer.id)}"
                aria-pressed="${active ? 'true' : 'false'}"
                title="Remove ${short} and trace downstream impact"
              >
                <span class="shock-picker-ord">${String(layer.stackOrder).padStart(2, '0')}</span>
                <span class="shock-picker-name">${short}</span>
              </button>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

export function renderShockFlowHtml(steps: CascadeStep[]): string {
  if (!steps.length) return '';

  return `<div class="shock-flow" aria-label="Impact chain">${steps
    .map((step, index) => {
      const name = escapeHtml(layerShortName(step.layer));
      const nodeState = step.role === 'source' ? 'Removed' : 'Stalls';
      const arrow =
        index > 0 ? '<span class="shock-flow-arrow" aria-hidden="true">→</span>' : '';

      return `
        ${arrow}
        <button
          type="button"
          class="shock-flow-node shock-flow-node--${step.role}"
          data-shock-pick="${escapeHtml(step.layer.id)}"
          title="Remove ${name} from the simulation"
        >
          <span class="shock-flow-node-state">${nodeState}</span>
          <span class="shock-flow-node-name">${name}</span>
        </button>
      `;
    })
    .join('')}</div>`;
}

function renderImpactCard(
  step: CascadeStep,
  layers: Layer[],
  sourceIds: Set<string>,
  depthById: Map<string, number>,
): string {
  const name = escapeHtml(layerShortName(step.layer));
  const country = escapeHtml(step.layer.metrics.topCountry);
  const actor = step.layer.actors[0];
  const actorLine = actor
    ? `${escapeHtml(actor.name)} · ${pct100(actor.share.value)}%`
    : '';
  const block = blockingPhrase(step, layers, sourceIds, depthById);

  return `
    <li class="shock-impact-card cascade-step--${step.role}">
      <div class="shock-impact-card-head">
        <button type="button" class="shock-impact-card-name" data-shock-pick="${escapeHtml(step.layer.id)}" title="Remove ${name} from the simulation">
          ${name}
        </button>
        <span class="shock-impact-card-geo">${country}${actorLine ? ` · ${actorLine}` : ''}</span>
      </div>
      <p class="shock-impact-card-kicker">What stops working</p>
      <p class="shock-impact-card-text">${escapeHtml(whatStops(step.layer))}</p>
      <p class="shock-impact-card-kicker">Blocked because</p>
      <p class="shock-impact-card-text shock-impact-card-text--block">${escapeHtml(block)}</p>
    </li>
  `;
}

export function renderShockImpactByDepthHtml(steps: CascadeStep[], layers: Layer[]): string {
  const downstream = steps.filter((step) => step.role === 'downstream');
  if (!downstream.length) return '';

  const sourceIds = new Set(
    steps.filter((step) => step.role === 'source').map((step) => step.layer.id),
  );
  const depthById = depthByStep(steps);
  const byDepth = new Map<number, CascadeStep[]>();

  for (const step of downstream) {
    const group = byDepth.get(step.depth) ?? [];
    group.push(step);
    byDepth.set(step.depth, group);
  }

  const sections = [...byDepth.entries()]
    .sort(([a], [b]) => a - b)
    .map(([depth, groupSteps]) => {
      const cards = groupSteps
        .map((step) => renderImpactCard(step, layers, sourceIds, depthById))
        .join('');

      return `
        <section class="shock-depth-group" data-depth="${depth}">
          <h3 class="shock-depth-title">${escapeHtml(depthGroupTitle(depth))}</h3>
          <ul class="shock-impact-cards">${cards}</ul>
        </section>
      `;
    })
    .join('');

  return `<div class="shock-impact-depths">${sections}</div>`;
}

function renderShockStatsHtml(brief: ShockImpactBrief): string {
  const chips: string[] = [
    `<div class="shock-stat-chip shock-stat-chip--hot">
      <span class="shock-stat-num">${brief.impactedCount}/${brief.stackLayerCount}</span>
      <span class="shock-stat-lbl">layers affected</span>
    </div>`,
    `<div class="shock-stat-chip">
      <span class="shock-stat-num">${brief.downstreamCount}</span>
      <span class="shock-stat-lbl">downstream blocked</span>
    </div>`,
    `<div class="shock-stat-chip">
      <span class="shock-stat-num">${brief.countries.length}</span>
      <span class="shock-stat-lbl">countr${brief.countries.length === 1 ? 'y' : 'ies'} hit</span>
    </div>`,
  ];

  if (brief.computeShare !== null) {
    chips.push(`
      <div class="shock-stat-chip shock-stat-chip--hot">
        <span class="shock-stat-num">${pct100(brief.computeShare)}%</span>
        <span class="shock-stat-lbl">compute at risk (estimate)</span>
      </div>
    `);
  }

  if (brief.criticalCount > 0) {
    chips.push(`
      <div class="shock-stat-chip">
        <span class="shock-stat-num">${brief.criticalCount}</span>
        <span class="shock-stat-lbl">critical chokepoint${brief.criticalCount === 1 ? '' : 's'}</span>
      </div>
    `);
  }

  if (brief.unaffectedLayers.length > 0) {
    chips.push(`
      <div class="shock-stat-chip shock-stat-chip--ok">
        <span class="shock-stat-num">${brief.unaffectedLayers.length}</span>
        <span class="shock-stat-lbl">still run</span>
      </div>
    `);
  }

  return `<div class="shock-impact-stats">${chips.join('')}</div>`;
}

function renderShockUnaffectedHtml(brief: ShockImpactBrief): string {
  if (!brief.unaffectedLayers.length) return '';

  const buttons = brief.unaffectedLayers
    .map((layer) => {
      const short = escapeHtml(layerShortName(layer));
      return `
        <button type="button" class="shock-unaffected-btn" data-shock-pick="${escapeHtml(layer.id)}" title="Remove ${short} instead">
          ${short}
        </button>
      `;
    })
    .join('');

  return `
    <div class="shock-unaffected">
      <span class="shock-unaffected-label">Still runs. Tap a layer to remove it instead.</span>
      <div class="shock-unaffected-list">${buttons}</div>
    </div>
  `;
}

export function renderShockImpactHtml(
  brief: ShockImpactBrief,
  steps: CascadeStep[],
  layers: Layer[],
  sourceLayers: Layer[] = [],
  options: { slimLead?: boolean } = {},
): string {
  const computeNote =
    brief.computeShare !== null && brief.computeMethod
      ? `<p class="shock-compute-note">${escapeHtml(brief.computeMethod)}</p>`
      : '';

  const activeSourceIds = new Set(
    steps.filter((step) => step.role === 'source').map((step) => step.layer.id),
  );

  const compositeNotice =
    sourceLayers.length === 1 && isCompositeLayer(sourceLayers[0]!)
      ? renderCompositeNoticeHtml(sourceLayers[0]!)
      : '';

  const leadBlock = options.slimLead
    ? ''
    : `
      <div class="shock-impact-lead">
        <p class="shock-impact-kicker">${escapeHtml(brief.sourceLabel)} removed</p>
        <h2 class="shock-impact-headline">${escapeHtml(brief.headline)}</h2>
        <p class="shock-impact-summary">${escapeHtml(brief.bottomLine)}</p>
      </div>
    `;

  return `
    <div class="shock-impact">
      ${compositeNotice}
      ${renderShockLayerPicker(layers, activeSourceIds)}
      ${leadBlock}
      ${renderShockStatsHtml(brief)}
      ${computeNote}
      ${renderShockFlowHtml(steps)}
      ${renderShockImpactByDepthHtml(steps, layers)}
      ${renderShockUnaffectedHtml(brief)}
      <details class="shock-source-context">
        <summary>About the removed source</summary>
        <p>${escapeHtml(brief.sourceMechanism)}</p>
        <p class="shock-source-facts">
          <span>${escapeHtml(brief.sourceConcentration)}</span>
          <span>${escapeHtml(brief.sourceRecovery)}</span>
        </p>
      </details>
      <button type="button" class="shock-clear" id="shock-clear">${COPY.resetSimulation}</button>
    </div>
  `;
}

export function renderCascadeChainHtml(
  steps: CascadeStep[],
  layers: Layer[],
  compact = false,
): string {
  if (!steps.length) return '';

  const sourceIds = new Set(
    steps.filter((step) => step.role === 'source').map((step) => step.layer.id),
  );
  const depthById = depthByStep(steps);

  return `<ol class="cascade-chain${compact ? ' cascade-chain--compact' : ''}">${steps
    .map((step, index) => {
      const name = escapeHtml(layerShortName(step.layer));
      const block = blockingPhrase(step, layers, sourceIds, depthById);
      const arrow =
        index < steps.length - 1 ? '<span class="cascade-arrow" aria-hidden="true">↓</span>' : '';

      return `
        <li class="cascade-step cascade-step--${step.role}" data-depth="${step.depth}">
          <div class="cascade-step-head">
            <span class="cascade-step-ord">${String(step.layer.stackOrder).padStart(2, '0')}</span>
            <span class="cascade-step-name">${name}</span>
            <span class="cascade-step-role">${step.role === 'source' ? 'Removed' : 'Stalls'}</span>
          </div>
          <p class="cascade-step-kicker">What stops working</p>
          <p class="cascade-step-effect">${escapeHtml(whatStops(step.layer))}</p>
          <p class="cascade-step-kicker">Blocked because</p>
          <p class="cascade-step-block">${escapeHtml(block)}</p>
          ${arrow}
        </li>
      `;
    })
    .join('')}</ol>`;
}

export function shockImpactSummary(
  steps: CascadeStep[],
  stackLayerCount: number,
): { headline: string; detail: string } {
  const sources = steps.filter((step) => step.role === 'source');
  const downstream = steps.filter((step) => step.role === 'downstream');
  const critical = steps.filter((step) => step.layer.isCriticalChokepoint).length;
  const source = sources[0]?.layer;

  const headline = source
    ? buildHeadline(source, downstream)
    : `${downstream.length} downstream layer${downstream.length === 1 ? '' : 's'} stall`;

  const detail = `${steps.length} of ${stackLayerCount} stack layers in this cascade${critical ? `, including ${critical} critical chokepoint${critical === 1 ? '' : 's'}` : ''}. Countries: ${[...new Set(steps.flatMap((s) => s.layer.metrics.dominantCountries.map((e) => e.country)))].join(', ')}.`;

  return { headline, detail };
}

/** @deprecated Use buildShockImpactBrief. Kept for tests and gradual migration. */
export function shockThesisCopy(
  sourceLayers: Layer[],
  steps: CascadeStep[],
  stackLayerCount: number,
): {
  mechanism: string;
  concentration: string;
  recovery: string;
  terminalEffect: string;
  scope: string;
} {
  const brief = buildShockImpactBrief(sourceLayers, steps, sourceLayers, stackLayerCount, '', null, null);
  const context = sourceContext(sourceLayers[0]!);
  return {
    mechanism: context.sourceMechanism,
    concentration: context.sourceConcentration,
    recovery: context.sourceRecovery,
    terminalEffect: brief.bottomLine,
    scope: `${brief.impactedCount} of ${stackLayerCount} stack layers stall (${brief.criticalCount} critical).`,
  };
}
