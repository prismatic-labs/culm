import '../styles.css';
import {
  CONTROLS_PAGE_COPY,
  CONTROLS_SUMMARY,
  LEVERAGE_MEASURES,
  type ControlSource,
  type LeverageMeasure,
} from '../data/controls';
import { initConfidenceTips, renderConfidenceLegend, renderConfidenceTag } from '../lib/confidence';
import { escapeAttr, escapeHtml } from '../lib/escape-html';
import { mountExploreNav } from '../lib/explore-nav';

const summaryEl = document.querySelector<HTMLElement>('#controls-summary')!;
const directionKeyEl = document.querySelector<HTMLElement>('#controls-direction-key')!;
const listEl = document.querySelector<HTMLElement>('#controls-list')!;

function renderSources(sources: readonly ControlSource[]): string {
  const seen = new Set<string>();
  const unique = sources.filter((s) => {
    const key = `${s.org}|${s.asOf}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique
    .map(
      (s) =>
        `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.org)}</a> · ${escapeHtml(s.asOf)}</li>`,
    )
    .join('');
}

function directionLabel(m: LeverageMeasure): string {
  return m.direction === 'west-to-china'
    ? 'US-led export controls → China'
    : 'China import restrictions → US, EU, Japan';
}

function renderSummary(): void {
  const govs = CONTROLS_SUMMARY.governmentsInConcert;
  summaryEl.innerHTML = `
    <h2 id="controls-summary-heading">${escapeHtml(CONTROLS_PAGE_COPY.heading)}</h2>
    <p class="controls-summary-lede">${escapeHtml(CONTROLS_PAGE_COPY.lede)}</p>
    ${renderConfidenceLegend()}
    <div class="controls-stats">
      <article class="controls-stat">
        <div class="controls-stat-value">${CONTROLS_SUMMARY.controlledLayers} of ${CONTROLS_SUMMARY.totalLayers}</div>
        <p class="controls-stat-label">stack chokepoints already under an active control measure</p>
      </article>
      <article class="controls-stat">
        <div class="controls-stat-value">${govs.length}</div>
        <p class="controls-stat-label">governments with aligned export-control rules: ${escapeHtml(govs.join(', '))}</p>
      </article>
      <article class="controls-stat">
        <div class="controls-stat-value">Bidirectional</div>
        <p class="controls-stat-label">US-led controls on tools and chips; China restrictions on several refined inputs</p>
      </article>
    </div>
    <div class="controls-payoff">
      <p><strong>Fragility.</strong> ${escapeHtml(CONTROLS_PAGE_COPY.fragility)}</p>
      <p><strong>Leverage.</strong> ${escapeHtml(CONTROLS_PAGE_COPY.leverage)}</p>
    </div>
    <p class="controls-packaging-note">Layer 06, advanced packaging, has no standalone export control in this list yet. Equipment and accelerator curbs reach it indirectly.</p>`;
}

function renderDirectionGuide(): void {
  directionKeyEl.innerHTML = `
    <p class="controls-direction-lead">
      <strong>How to read the arrows.</strong> ${escapeHtml(CONTROLS_PAGE_COPY.directionGuide)}
    </p>
    <div class="controls-direction-examples">
      <div class="controls-direction-example">
        <span class="control-dir control-dir--west-to-china">US-led export controls → China</span>
        <p class="control-flow control-flow--sample" aria-label="United States restricting China">
          <span class="control-actor">United States</span>
          <span class="control-arrow" aria-hidden="true">→</span>
          <span class="control-actor">China</span>
        </p>
        <p class="controls-direction-note">Chips, tools, and equipment export controls. Red card accent.</p>
      </div>
      <div class="controls-direction-example">
        <span class="control-dir control-dir--china-to-west">China import restrictions → US, EU, Japan</span>
        <p class="control-flow control-flow--sample" aria-label="China restricting imports to the United States, EU, and Japan">
          <span class="control-actor">China</span>
          <span class="control-arrow" aria-hidden="true">→</span>
          <span class="control-actor">United States, EU, Japan</span>
        </p>
        <p class="controls-direction-note">Materials export bans. Blue card accent.</p>
      </div>
    </div>`;
}

function renderList(): void {
  const measures = [...LEVERAGE_MEASURES].sort((a, b) => a.stackOrder - b.stackOrder);
  listEl.innerHTML = measures
    .map((m) => {
      const ord = String(m.stackOrder).padStart(2, '0');
      const inspectUrl = `../?mode=layer&layer=${encodeURIComponent(m.layerId)}`;
      return `
        <article class="control-card control-card--${m.direction}">
          <header class="control-card-head">
            <span class="control-ord">${ord}</span>
            <div class="control-head-text">
              <h3>${escapeHtml(m.title)}</h3>
              <a class="control-layer" href="${inspectUrl}">${escapeHtml(m.layerName)} · inspect in stack →</a>
            </div>
            <span class="control-dir control-dir--${m.direction}">${escapeHtml(directionLabel(m))}</span>
          </header>
          <p class="control-flow" aria-label="${escapeAttr(`${m.controller} restricting ${m.target}`)}">
            <span class="control-actor control-actor--from">${escapeHtml(m.controller)}</span>
            <span class="control-arrow" aria-hidden="true">→</span>
            <span class="control-actor control-actor--to">${escapeHtml(m.target)}</span>
          </p>
          <p class="control-meta">
            <span class="control-status control-status--${m.status}">${escapeHtml(m.status)}</span>
            <span>${escapeHtml(m.instrument)}</span>
            <span class="control-since">since ${escapeHtml(m.since)}</span>
          </p>
          <p class="control-summary">${escapeHtml(m.summary)}</p>
          <p class="control-effect">
            ${renderConfidenceTag(m.confidence)}
            ${escapeHtml(m.effect)}
          </p>
          <ul class="panel-sources">${renderSources(m.sources)}</ul>
        </article>`;
    })
    .join('');
}

renderSummary();
renderDirectionGuide();
renderList();
mountExploreNav(document.querySelector('#explore-nav'), 'controls', '../');
initConfidenceTips();
