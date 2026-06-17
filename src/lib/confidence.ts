import type { Confidence } from '../types';
import { escapeAttr, escapeHtml } from './escape-html';

export interface ConfidenceDefinition {
  id: Confidence;
  label: string;
  /** Short gloss shown beside the tag in the legend. */
  gloss: string;
  /** Full sentence for tooltips and screen readers. */
  detail: string;
}

export const CONFIDENCE_DEFINITIONS: ConfidenceDefinition[] = [
  {
    id: 'high',
    label: 'high',
    gloss: 'primary sources agree',
    detail:
      'High confidence: the claim is directly documented, or multiple primary sources agree with little ambiguity.',
  },
  {
    id: 'medium',
    label: 'medium',
    gloss: 'credible but partial',
    detail:
      'Medium confidence: credible sources, but indirect data, partial coverage, or interpretation is involved.',
  },
  {
    id: 'low',
    label: 'low',
    gloss: 'plausible, early, or contested',
    detail:
      'Low confidence: plausible linkage or early estimate; one source, contested scope, or significant uncertainty.',
  },
];

const byId = new Map(CONFIDENCE_DEFINITIONS.map((d) => [d.id, d]));

export function confidenceDef(c: Confidence): ConfidenceDefinition {
  return byId.get(c)!;
}

export function confidenceClass(c: Confidence | string): string {
  return `conf-${c}`;
}

export function renderConfidenceTag(c: Confidence | string): string {
  const def = byId.get(c as Confidence);
  const label = def?.label ?? String(c);
  const detail = def?.detail ?? `Confidence: ${label}`;
  return `<button type="button" class="conf-tag conf-tag--tip ${confidenceClass(c)}" data-tip="${escapeAttr(detail)}" aria-label="${escapeAttr(detail)}">${escapeHtml(label)}</button>`;
}

/** Compact, visible key for pages that use confidence tags. */
export function renderConfidenceLegend(): string {
  const items = CONFIDENCE_DEFINITIONS.map(
    (d) =>
      `<span class="confidence-legend-item">${renderConfidenceTag(d.id)} <span class="confidence-legend-gloss">${escapeHtml(d.gloss)}</span></span>`,
  ).join('');
  return `<p class="confidence-legend" role="note"><span class="confidence-legend-label">Confidence <span class="confidence-legend-hint">· hover a tag</span></span>${items}</p>`;
}

let tipEl: HTMLElement | null = null;
let tipTarget: HTMLElement | null = null;
let tipsReady = false;

function ensureTipEl(): HTMLElement {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.id = 'conf-tip';
    tipEl.hidden = true;
    tipEl.setAttribute('role', 'tooltip');
    document.body.appendChild(tipEl);
  }
  return tipEl;
}

function hideConfidenceTip(): void {
  if (!tipEl) return;
  tipEl.hidden = true;
  tipEl.textContent = '';
  tipTarget = null;
}

function positionConfidenceTip(target: HTMLElement, tip: HTMLElement): void {
  const rect = target.getBoundingClientRect();
  const margin = 8;
  tip.style.left = '0px';
  tip.style.top = '0px';
  tip.hidden = false;

  const tipRect = tip.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  let top = rect.top - tipRect.height - margin;
  const maxLeft = window.innerWidth - tipRect.width - margin;
  left = Math.max(margin, Math.min(left, maxLeft));

  if (top < margin) {
    top = rect.bottom + margin;
  }

  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
}

function showConfidenceTip(target: HTMLElement): void {
  const text = target.dataset.tip;
  if (!text) return;
  const tip = ensureTipEl();
  if (tipTarget === target && !tip.hidden) return;
  tipTarget = target;
  tip.textContent = text;
  positionConfidenceTip(target, tip);
}

/** Wire hover/focus tooltips for confidence tags. Safe to call once per page. */
export function initConfidenceTips(): void {
  if (tipsReady) return;
  tipsReady = true;

  document.addEventListener(
    'mouseover',
    (event) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>('.conf-tag--tip[data-tip]');
      if (target) {
        showConfidenceTip(target);
        return;
      }
      if (tipTarget) hideConfidenceTip();
    },
    true,
  );

  document.addEventListener(
    'focusin',
    (event) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>('.conf-tag--tip[data-tip]');
      if (target) showConfidenceTip(target);
    },
    true,
  );

  document.addEventListener(
    'focusout',
    () => {
      window.setTimeout(() => {
        const active = document.activeElement;
        if (active?.closest('.conf-tag--tip[data-tip]')) return;
        hideConfidenceTip();
      }, 0);
    },
    true,
  );

  window.addEventListener('scroll', hideConfidenceTip, true);
  window.addEventListener('resize', hideConfidenceTip);
}
