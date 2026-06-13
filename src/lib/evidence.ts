import { escapeHtml } from './escape-html';
import { renderSourceLinksHtml } from './source-links';
import type { SourcedValue } from '../types';

export function renderEvidenceRow(label: string, value: string, sourced: SourcedValue<number | string>): string {
  const steps: string[] = [];
  if (sourced.rawClaim) steps.push(`<dt>Raw claim</dt><dd>${escapeHtml(sourced.rawClaim)}</dd>`);
  if (sourced.extraction) steps.push(`<dt>Extraction</dt><dd>${escapeHtml(sourced.extraction)}</dd>`);
  steps.push(`<dt>Displayed value</dt><dd>${escapeHtml(value)}</dd>`);
  if (sourced.caveat) steps.push(`<dt>Caveat</dt><dd>${escapeHtml(sourced.caveat)}</dd>`);
  else if (sourced.note) steps.push(`<dt>Note</dt><dd>${escapeHtml(sourced.note)}</dd>`);

  return `
    <div class="evidence-row">
      <div class="evidence-row-head">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(value)} · ${escapeHtml(sourced.asOf)} · ${escapeHtml(sourced.confidence)}</span>
      </div>
      <dl class="evidence-pipeline">${steps.join('')}</dl>
      ${renderSourceLinksHtml(sourced.sources, sourced.asOf)}
    </div>
  `;
}
