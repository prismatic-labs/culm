import metricHistory from '../data/metric-history.json';
import { escapeAttr, escapeHtml } from './escape-html';
import { pct100 } from './ui';

interface HistoryPoint {
  asOf: string;
  cr1: number;
}

interface LayerHistory {
  layerId: string;
  metric: string;
  points: HistoryPoint[];
}

const histories = metricHistory.histories as LayerHistory[];

export interface MetricTrend {
  deltaPct: number;
  direction: 'up' | 'down' | 'flat';
  fromAsOf: string;
  toAsOf: string;
  label: string;
}

export function cr1Trend(layerId: string, currentCr1: number, currentAsOf: string): MetricTrend | null {
  const history = histories.find((entry) => entry.layerId === layerId);
  if (!history || history.points.length < 2) return null;

  const previous = history.points[history.points.length - 2]!;
  const currentPoint = history.points[history.points.length - 1];
  const baseline = currentPoint?.asOf === currentAsOf ? previous : currentPoint ?? previous;
  const delta = pct100(currentCr1) - pct100(baseline.cr1);
  if (Math.abs(delta) < 1) {
    return {
      deltaPct: 0,
      direction: 'flat',
      fromAsOf: baseline.asOf,
      toAsOf: currentAsOf,
      label: 'flat vs prior snapshot',
    };
  }
  return {
    deltaPct: Math.abs(delta),
    direction: delta > 0 ? 'up' : 'down',
    fromAsOf: baseline.asOf,
    toAsOf: currentAsOf,
    label: `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)} pts since ${baseline.asOf}`,
  };
}

export function trendBadgeHtml(trend: MetricTrend | null): string {
  if (!trend || trend.direction === 'flat') return '';
  const cls = trend.direction === 'up' ? 'trend-up' : 'trend-down';
  return `<span class="trend-badge ${cls}" title="Compared to ${escapeAttr(trend.fromAsOf)}">${escapeHtml(trend.label)}</span>`;
}
