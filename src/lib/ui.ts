import { escapeAttr, escapeHtml } from './escape-html';
import { hhiBand, metricPlain } from './metric-guide';

/** Concentration heat ramp. Magnitude only, matches restyle tokens. */
export function heat(pct: number): string {
  return pct >= 80 ? 'var(--hot)' : pct >= 50 ? 'var(--warm)' : 'var(--cool)';
}

/**
 * Map markers: green sage ramp (geographic chokepoint intensity).
 * Kept distinct from copper dependency arrows.
 */
export function heatMap(pct: number): string {
  const p = Math.max(0, Math.min(100, pct));
  if (p >= 95) return '#5a7a52';
  if (p >= 85) return '#739068';
  if (p >= 70) return '#94a88c';
  if (p >= 50) return '#b8c4b0';
  return '#d8e0d4';
}

export function pct100(value: number): number {
  return Math.round(value * 100);
}

export type MeterRamp = 'heat' | 'map';

export function meterBar(pct: number, max: number, ramp: MeterRamp = 'heat'): string {
  const normalized = max === 100 ? pct : (pct / max) * 100;
  const width = Math.min(100, normalized);
  const color = ramp === 'map' ? heatMap(normalized) : heat(max === 100 ? pct : normalized);
  return `<div class="track"><div class="fill" style="width:${width}%;background:${color}"></div></div>`;
}

export function meterRow(
  label: string,
  pct: number,
  max: number,
  valueText: string,
  tip = '',
  plain = '',
  ramp: MeterRamp = 'heat',
): string {
  const tipAttr = tip ? ` title="${escapeAttr(tip)}"` : '';
  const plainHtml = plain
    ? `<span class="meter-plain">${escapeHtml(plain)}</span>`
    : '';
  return `
    <div class="meter">
      <span class="k metric-tip"${tipAttr}>${escapeHtml(label)}</span>
      ${meterBar(pct, max, ramp)}
      <span class="v">${escapeHtml(valueText)}</span>
      ${plainHtml}
    </div>
  `;
}

export function metricRowPlain(
  metricId: 'cr1' | 'cr3' | 'hhi' | 'top-country-share',
  label: string,
  pct: number,
  max: number,
  valueText: string,
  tip: string,
  ramp: MeterRamp = 'heat',
): string {
  if (metricId === 'hhi') {
    const band = hhiBand(pct);
    return meterRow(label, pct, max, valueText, tip, `${band.label} (${band.detail})`, ramp);
  }
  const plain = metricPlain(metricId, pct);
  return meterRow(label, pct, max, valueText, tip, plain, ramp);
}

export const SUBSTITUTABILITY_LABEL: Record<string, string> = {
  'years-to-decades': 'years to decades',
  years: 'years',
  months: 'months',
  fungible: 'fungible',
};
