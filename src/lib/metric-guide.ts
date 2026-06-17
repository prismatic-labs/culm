import { escapeAttr, escapeHtml } from './escape-html';
import { CONFIDENCE_DEFINITIONS } from './confidence';

export interface MetricDefinition {
  id: string;
  name: string;
  hint: string;
  detail: string;
  plain?: (value: number) => string;
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    id: 'cr1',
    name: 'CR1',
    hint: 'Largest single supplier',
    detail:
      'Share of this layer held by the one biggest company or actor (0 to 100%). ' +
      '100% means a sole supplier, e.g. one firm making all EUV tools.',
    plain: (pct) => `the single biggest supplier makes ${pct} of every 100`,
  },
  {
    id: 'cr3',
    name: 'CR3',
    hint: 'Top three combined',
    detail:
      'Combined share of the three largest actors. Catches oligopolies where no one firm ' +
      'dominates alone but only a few names matter.',
    plain: (pct) => `the top three suppliers together make ${pct} of every 100`,
  },
  {
    id: 'hhi',
    name: 'HHI',
    hint: 'Market concentration index',
    detail:
      'Herfindahl-Hirschman Index (0 to 10,000): sum of squared market shares. ' +
      'Above 2,500 is considered highly concentrated in antitrust analysis.',
  },
  {
    id: 'top-country',
    name: 'Top country',
    hint: 'Where supply is based',
    detail:
      'The country with the largest geographic share of this layer. ' +
      'Firm concentration and place-based risk are not the same. Both are shown separately.',
  },
  {
    id: 'top-country-share',
    name: 'Top-country share',
    hint: 'That country’s share',
    detail: 'How much of the layer is attributed to the dominant country (0 to 100%).',
    plain: (pct) => `${pct}% of this layer sits in the leading country`,
  },
  {
    id: 'substitutability',
    name: 'Substitutability',
    hint: 'Time to replace',
    detail:
      'How quickly alternatives could scale if dominant supply failed: fungible, months, years, or years-to-decades. ' +
      'High concentration is more alarming when replacement takes years.',
  },
  {
    id: 'chokepoint',
    name: 'Critical chokepoint',
    hint: 'Flagged layers',
    detail:
      'A layer is flagged when (CR1 ≥ 80% or top-country share ≥ 80%) and substitutability is years or years-to-decades. ' +
      'See Methodology for the full rule.',
  },
];

const byId = new Map(METRIC_DEFINITIONS.map((d) => [d.id, d]));

export function metricDef(id: string): MetricDefinition | undefined {
  return byId.get(id);
}

export function metricTip(id: string): string {
  return metricDef(id)?.detail ?? '';
}

export function metricAbbr(id: string, label?: string): string {
  const name = escapeHtml(label ?? metricDef(id)?.name ?? id);
  const tip = metricTip(id);
  if (!tip) return name;
  return `<button type="button" class="metric-tip" data-metric-id="${escapeAttr(id)}" aria-label="${escapeAttr(`${name}: ${tip}`)}">${name}</button>`;
}

export function metricPlain(id: string, value: number): string {
  const def = metricDef(id);
  if (def?.plain) return def.plain(Math.round(value));
  return '';
}

export function hhiBand(hhi: number): { label: string; detail: string } {
  if (hhi >= 10000) return { label: 'a monopoly', detail: 'a single supplier, no competition' };
  if (hhi >= 5000) return { label: 'almost no competition', detail: 'very few suppliers control the market' };
  if (hhi >= 2500) return { label: 'highly concentrated', detail: 'antitrust agencies treat this as concentrated' };
  if (hhi >= 1500) return { label: 'moderately concentrated', detail: 'a handful of firms dominate' };
  return { label: 'more competitive', detail: 'no single firm dominates' };
}

export function renderMetricsGuideHtml(): string {
  return `
    <summary>What the numbers mean</summary>
    <div class="metrics-guide-body">
      <p class="metrics-guide-lead">
        Each number measures one thing. Plain-English lines sit beside the numbers in the stack.
        Click any underlined metric to open its definition below.
        Confidence tags rate how sure Culm is about each value:
        ${CONFIDENCE_DEFINITIONS.map((d) => `${d.label} (${d.gloss})`).join('; ')}.
        <span class="tag unverified">unverified</span> means no source link is attached yet.
      </p>
      <dl class="metrics-dl">
        ${METRIC_DEFINITIONS.map(
          (d) => `
          <div class="metrics-dl-row" id="metric-def-${escapeAttr(d.id)}">
            <dt><span class="metrics-dl-name">${escapeHtml(d.name)}</span> <span class="metrics-dl-hint">${escapeHtml(d.hint)}</span></dt>
            <dd>${escapeHtml(d.detail)}</dd>
          </div>
        `,
        ).join('')}
      </dl>
    </div>
  `;
}

const SOURCE_ORG: Record<string, string> = {
  'pubs.usgs.gov': 'USGS (U.S. Geological Survey)',
  'www.brookings.edu': 'Brookings Institution',
  'www.asml.com': 'ASML',
  'www.trendforce.com': 'TrendForce',
  'www.nomadsemi.com': 'Nomad Semi',
  'www.srgresearch.com': 'Synergy Research Group',
  'epoch.ai': 'Epoch AI',
  'www.soitec.com': 'Soitec / Financial Times',
};

export function sourceCitation(url: string, asOf: string): string {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    if (import.meta.env.DEV) console.warn('[culm] malformed source URL:', url);
  }
  const org = SOURCE_ORG[host] ?? host;
  return `Source: ${org}, data as of ${asOf}`;
}
