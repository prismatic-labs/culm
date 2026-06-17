import '../styles.css';
import {
  ACCELERATOR_DESIGNERS,
  COMPUTE_CONCENTRATION,
  COMPUTE_PAGE_COPY,
  POWER_FACTS,
  type ComputeSource,
} from '../data/compute';
import { initConfidenceTips, renderConfidenceLegend, renderConfidenceTag } from '../lib/confidence';
import { escapeHtml } from '../lib/escape-html';
import { mountExploreNav } from '../lib/explore-nav';

const introEl = document.querySelector<HTMLElement>('#compute-intro')!;
const whoHeadEl = document.querySelector<HTMLElement>('#compute-who-heading')!;
const whoLeadEl = document.querySelector<HTMLElement>('#compute-who-lead')!;
const whoEl = document.querySelector<HTMLElement>('#compute-who')!;
const powerHeadEl = document.querySelector<HTMLElement>('#compute-power-heading')!;
const powerLeadEl = document.querySelector<HTMLElement>('#compute-power-lead')!;
const powerEl = document.querySelector<HTMLElement>('#compute-power')!;
const payoffEl = document.querySelector<HTMLElement>('#compute-payoff')!;

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function renderSources(sources: readonly ComputeSource[]): string {
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

function renderIntro(): void {
  introEl.innerHTML = `
    <p class="lede">
      ${escapeHtml(COMPUTE_PAGE_COPY.intro)}
      <b class="lede-point">${escapeHtml(COMPUTE_PAGE_COPY.point)}</b>
      <span class="lede-action">${escapeHtml(COMPUTE_PAGE_COPY.action)}</span>
    </p>
    ${renderConfidenceLegend()}`;
}

function renderWho(): void {
  whoHeadEl.textContent = COMPUTE_PAGE_COPY.whoHeading;
  whoLeadEl.textContent = COMPUTE_PAGE_COPY.whoLead;

  const maxShare = ACCELERATOR_DESIGNERS[0]?.share ?? 1;
  const bars = ACCELERATOR_DESIGNERS.map((d) => {
    const width = Math.max((d.share / maxShare) * 100, 1.5);
    return `
      <div class="designer-row">
        <span class="designer-name">${escapeHtml(d.name)}</span>
        <span class="designer-track" aria-hidden="true">
          <span class="designer-bar" style="width: ${width.toFixed(1)}%"></span>
        </span>
        <span class="designer-share">${pct(d.share)}</span>
      </div>`;
  }).join('');

  whoEl.innerHTML = `
    <article class="compute-card compute-card--accel">
      <div class="compute-stat-value">${pct(COMPUTE_CONCENTRATION.nvidiaShare)}</div>
      <p class="compute-stat-label">of AI-accelerator compute shipped is Nvidia's, measured in cumulative H100-equivalents</p>
      <div class="designer-bars">${bars}</div>
      <p class="compute-card-note">${renderConfidenceTag('medium')} Top three designers hold ${pct(COMPUTE_CONCENTRATION.topThreeShare)} combined; market HHI is ${Math.round(COMPUTE_CONCENTRATION.acceleratorHhi).toLocaleString('en-US')}, far above the 2,500 “highly concentrated” line.</p>
      <ul class="panel-sources">${renderSources(COMPUTE_CONCENTRATION.accelSources)}</ul>
    </article>
    <article class="compute-card compute-card--geo">
      <div class="compute-stat-value">${pct(COMPUTE_CONCENTRATION.usClusterShare)}</div>
      <p class="compute-stat-label">of mapped GPU-cluster compute sits in the United States</p>
      <p class="compute-card-note">${renderConfidenceTag('medium')} Based on Epoch's existing-cluster inventory, which covers an estimated 10–20% of global AI chips, so the geographic share is indicative, not exhaustive. In this sample, US cluster share is high.</p>
      <ul class="panel-sources">${renderSources(COMPUTE_CONCENTRATION.clusterSources)}</ul>
    </article>`;
}

function renderPower(): void {
  powerHeadEl.textContent = COMPUTE_PAGE_COPY.powerHeading;
  powerLeadEl.textContent = COMPUTE_PAGE_COPY.powerLead;

  powerEl.innerHTML = POWER_FACTS.map(
    (f) => `
    <article class="power-card">
      <div class="power-value">${escapeHtml(f.value)}</div>
      <p class="power-label">${escapeHtml(f.label)}</p>
      <p class="power-note">
        ${renderConfidenceTag(f.confidence)}
        ${escapeHtml(f.note)}
      </p>
      <ul class="panel-sources">${renderSources(f.sources)}</ul>
    </article>`,
  ).join('');
}

function renderPayoff(): void {
  payoffEl.innerHTML = `
    <div class="compute-payoff">
      <p><strong>Fragility.</strong> ${escapeHtml(COMPUTE_PAGE_COPY.fragility)}</p>
      <p><strong>Leverage.</strong> ${escapeHtml(COMPUTE_PAGE_COPY.leverage)}</p>
    </div>`;
}

renderIntro();
renderWho();
renderPower();
renderPayoff();
mountExploreNav(document.querySelector('#explore-nav'), 'compute', '../');
initConfidenceTips();
