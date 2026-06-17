import '../styles.css';
import {
  DEEP_SEA_MINING_PRO_CON,
  ISA_EXPLORATION_SUMMARY,
  METAL_PROFILES,
  SEABED_CONCENTRATION,
  SEABED_HOTSPOTS,
  STATE_OF_PLAY,
  type SeabedSource,
} from '../data/seabed';
import { initConfidenceTips, renderConfidenceLegend, renderConfidenceTag } from '../lib/confidence';
import { escapeHtml } from '../lib/escape-html';
import { mountExploreNav } from '../lib/explore-nav';
import { createDepthStrip } from './depth-strip';
import { createSeabedMap, renderHotspotPanel } from './map';

const panelEl = document.querySelector<HTMLElement>('#seabed-panel')!;
const mapHost = document.querySelector<HTMLElement>('#seabed-map')!;
const depthHost = document.querySelector<HTMLElement>('#seabed-depth')!;
const mapWrap = document.querySelector<HTMLElement>('#seabed-map-wrap')!;
const tooltipEl = document.querySelector<HTMLElement>('#seabed-tooltip')!;
const metalsEl = document.querySelector<HTMLElement>('#metals-strip')!;
const exploringEl = document.querySelector<HTMLElement>('#exploring-strip')!;
const stateEl = document.querySelector<HTMLElement>('#state-of-play')!;
const introEl = document.querySelector<HTMLElement>('.page-intro');

function renderIntroLegend(): void {
  if (!introEl) return;
  introEl.insertAdjacentHTML('beforeend', renderConfidenceLegend());
}

function renderMetalsStrip(): void {
  metalsEl.innerHTML = METAL_PROFILES.map((m) => {
    const roles = m.aiRoles
      .map(
        (r) =>
          `<li>${renderConfidenceTag(r.confidence)} ${escapeHtml(r.role)}</li>`,
      )
      .join('');
    const classes = ['metal-card'];
    if (m.protagonist) classes.push('metal-card--hero');
    if (m.seabedRole === 'not seabed-sourced') classes.push('metal-card--scope');
    const dissent = m.dissent
      ? `<p class="metal-dissent"><strong>Note:</strong> ${escapeHtml(m.dissent)}</p>`
      : '';
    const notSeabed =
      m.seabedRole === 'not seabed-sourced'
        ? '<p class="metal-honesty">Not seabed-sourced.</p>'
        : '';
    return `
      <article class="${classes.join(' ')}" id="metal-${escapeHtml(m.id)}" tabindex="-1">
        <header class="metal-card-head">
          <button type="button" class="metal-chip metal-chip--card" data-metal-id="${escapeHtml(m.id)}">${escapeHtml(m.symbol)}</button>
          <h3>${escapeHtml(m.name)}</h3>
          <span class="metal-seabed">${escapeHtml(m.seabedRole)}</span>
        </header>
        <p class="metal-demand">${escapeHtml(m.demandNote)}</p>
        ${dissent}
        ${notSeabed}
        <ul class="metal-roles">${roles}</ul>
        <p class="metal-other"><span>Also used for:</span> ${escapeHtml(m.otherUses)}</p>
      </article>`;
  }).join('');

  metalsEl.querySelectorAll<HTMLButtonElement>('[data-metal-id]').forEach((btn) => {
    btn.addEventListener('click', () => focusMetal(btn.dataset.metalId!));
  });
}

function renderExploringStrip(): void {
  exploringEl.innerHTML = `
    <div class="exploring-stat">
      <div class="num">${ISA_EXPLORATION_SUMMARY.totalContracts}</div>
      <div class="cap">ISA exploration contracts in force · as of ${escapeHtml(ISA_EXPLORATION_SUMMARY.asOf)}</div>
    </div>
    <dl class="exploring-dl">
      <div><dt>Contractors</dt><dd>${ISA_EXPLORATION_SUMMARY.contractors}</dd></div>
      <div><dt>Polymetallic nodules</dt><dd>${ISA_EXPLORATION_SUMMARY.byResource.polymetallicNodules}</dd></div>
      <div><dt>Polymetallic sulphides</dt><dd>${ISA_EXPLORATION_SUMMARY.byResource.polymetallicSulphides}</dd></div>
      <div><dt>Cobalt-rich crusts</dt><dd>${ISA_EXPLORATION_SUMMARY.byResource.cobaltRichCrusts}</dd></div>
      <div><dt>CCZ nodule contracts</dt><dd>${ISA_EXPLORATION_SUMMARY.cczNoduleContracts}</dd></div>
    </dl>
    <p class="exploring-note">
      National EEZ programmes (Cook Islands, Papua New Guinea, and others) license exploration under
      coastal-state authorities, separate from ISA contract areas in international waters.
    </p>
    <ul class="panel-sources">
      ${ISA_EXPLORATION_SUMMARY.sources
        .map(
          (s) =>
            `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.org)}</a> · ${escapeHtml(s.asOf)}</li>`,
        )
        .join('')}
    </ul>`;
}

function renderStateOfPlay(): void {
  stateEl.innerHTML = STATE_OF_PLAY.map(
    (item) => `
    <article class="state-card">
      <h3>${escapeHtml(item.heading)}</h3>
      <p>${escapeHtml(item.body)}</p>
      <ul class="panel-sources">
        ${item.sources
          .map(
            (s) =>
              `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.org)}</a> · ${escapeHtml(s.asOf)}</li>`,
          )
          .join('')}
      </ul>
    </article>`,
  ).join('');
}

function renderSourceList(sources: readonly SeabedSource[]): string {
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

function renderConcentration(): void {
  const el = document.querySelector<HTMLElement>('#seabed-thesis');
  if (!el) return;

  const stats = SEABED_CONCENTRATION.stats
    .map(
      (s) => `
      <article class="seabed-stat">
        <div class="seabed-stat-value">${escapeHtml(s.value)}</div>
        <p class="seabed-stat-label">${escapeHtml(s.label)}</p>
        <p class="seabed-stat-note">
          ${renderConfidenceTag(s.confidence)}
          ${escapeHtml(s.note)}
        </p>
      </article>`,
    )
    .join('');

  const allSources = SEABED_CONCENTRATION.stats.flatMap((s) => s.sources);

  el.innerHTML = `
    <h2 id="seabed-thesis-heading">${escapeHtml(SEABED_CONCENTRATION.heading)}</h2>
    <p class="seabed-thesis-lede">${escapeHtml(SEABED_CONCENTRATION.lede)}</p>
    <div class="seabed-thesis-stats">${stats}</div>
    <div class="seabed-thesis-payoff">
      <p><strong>Fragility.</strong> ${escapeHtml(SEABED_CONCENTRATION.fragility)}</p>
      <p><strong>Leverage.</strong> ${escapeHtml(SEABED_CONCENTRATION.leverage)}</p>
    </div>
    <ul class="panel-sources seabed-thesis-sources">${renderSourceList(allSources)}</ul>`;
}

function renderProCons(): void {
  const proConEl = document.querySelector<HTMLElement>('#pro-con');
  if (!proConEl) return;

  const list = (items: readonly string[]) =>
    items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

  proConEl.innerHTML = `
    <div class="pro-con-grid">
      <article class="pro-con-col pro-con-col--pro">
        <h3>Pro</h3>
        <ul>${list(DEEP_SEA_MINING_PRO_CON.pros)}</ul>
      </article>
      <article class="pro-con-col pro-con-col--con">
        <h3>Con</h3>
        <ul>${list(DEEP_SEA_MINING_PRO_CON.cons)}</ul>
      </article>
    </div>
    <ul class="panel-sources pro-con-sources">
      ${DEEP_SEA_MINING_PRO_CON.sources
        .map(
          (s) =>
            `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.org)}</a> · ${escapeHtml(s.asOf)}</li>`,
        )
        .join('')}
    </ul>`;
}

function wirePanelMetals(): void {
  panelEl.querySelectorAll<HTMLButtonElement>('.metal-chip[data-metal-id]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      focusMetal(btn.dataset.metalId!);
    });
  });
}

function focusMetal(metalId: string): void {
  mapView.filterMetal(metalId);
  document.querySelectorAll('.metal-card').forEach((card) => {
    card.classList.toggle('is-active', card.id === `metal-${metalId}`);
  });
  document.getElementById(`metal-${metalId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const url = new URL(window.location.href);
  url.searchParams.set('metal', metalId);
  history.replaceState(null, '', url);
}

function showHotspot(id: string): void {
  const hotspot = SEABED_HOTSPOTS.find((h) => h.id === id);
  if (!hotspot) return;
  mapView.selectHotspot(id);
  depthView.selectHotspot(id);
  panelEl.innerHTML = renderHotspotPanel(hotspot);
  wirePanelMetals();
  const url = new URL(window.location.href);
  url.searchParams.set('site', id);
  history.replaceState(null, '', url);
  document.title = `Culm: ${hotspot.name} · seabed mining`;
}

const mapView = createSeabedMap(mapHost, mapWrap, tooltipEl, (id) => {
  showHotspot(id);
});

const depthView = createDepthStrip(depthHost, (id) => {
  showHotspot(id);
});

document.addEventListener('culm-focus-metal', ((event: CustomEvent<string>) => {
  focusMetal(event.detail);
}) as EventListener);

renderIntroLegend();
mountExploreNav(document.querySelector('#explore-nav'), 'seabed', '../');
renderConcentration();
renderMetalsStrip();
renderExploringStrip();
renderStateOfPlay();
renderProCons();

const params = new URLSearchParams(window.location.search);
const initial =
  params.get('site') ?? mapView.getSelected() ?? 'ccz';
if (SEABED_HOTSPOTS.some((h) => h.id === initial)) {
  mapView.selectHotspot(initial);
  showHotspot(initial);
} else {
  showHotspot('ccz');
}

const initialMetal = params.get('metal');
if (initialMetal && METAL_PROFILES.some((m) => m.id === initialMetal)) {
  focusMetal(initialMetal);
}

initConfidenceTips();
