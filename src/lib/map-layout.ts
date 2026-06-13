export const EAST_ASIA_CLUSTER = new Set(['China', 'Japan', 'South Korea', 'Taiwan']);

export interface LayoutPoint {
  country: string;
  x: number;
  y: number;
  radius: number;
}

export interface LabelLayout {
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  leaderX: number;
  leaderY: number;
  useLeader: boolean;
  anchor: 'start' | 'middle' | 'end';
}

export function markerRadiusFromStats(chokepointCount: number, maxCr1: number): number {
  const raw = 5 + chokepointCount * 1.5 + maxCr1 * 2;
  return Math.min(12, Math.max(6, raw));
}

/** Nudge clustered markers apart while staying near true geography. */
export function separateClusterMarkers(
  points: LayoutPoint[],
  cluster: Set<string> = EAST_ASIA_CLUSTER,
  minGap = 6,
  iterations = 24,
): void {
  const clusterPoints = points.filter((point) => cluster.has(point.country));
  if (clusterPoints.length < 2) return;

  for (let iter = 0; iter < iterations; iter += 1) {
    for (let i = 0; i < clusterPoints.length; i += 1) {
      for (let j = i + 1; j < clusterPoints.length; j += 1) {
        const a = clusterPoints[i]!;
        const b = clusterPoints[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const minDist = a.radius + b.radius + minGap;
        if (dist >= minDist) continue;
        const push = (minDist - dist) / 2;
        const ux = dx / dist;
        const uy = dy / dist;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
  }
}

/**
 * Country labels on the world map. East Asia labels fan out radially: each label
 * sits just outside the cluster in the direction of its own marker, so the short
 * leader lines point away from the cluster centre and never cross neighbouring
 * dots or the flow arrows that converge on the cluster.
 */
export function layoutMarkerLabels(points: LayoutPoint[]): Map<string, LabelLayout> {
  const layouts = new Map<string, LabelLayout>();

  const eastAsia = points.filter((point) => EAST_ASIA_CLUSTER.has(point.country));

  if (eastAsia.length) {
    const cx = eastAsia.reduce((sum, point) => sum + point.x, 0) / eastAsia.length;
    const cy = eastAsia.reduce((sum, point) => sum + point.y, 0) / eastAsia.length;

    for (const point of eastAsia) {
      let dx = point.x - cx;
      let dy = point.y - cy;
      let len = Math.hypot(dx, dy);
      if (len < 1) {
        // Marker sits on the centroid: default to pointing north.
        dx = 0;
        dy = -1;
        len = 1;
      }
      const ux = dx / len;
      const uy = dy / len;

      const labelDist = point.radius + 20;
      const anchor: LabelLayout['anchor'] =
        ux > 0.35 ? 'start' : ux < -0.35 ? 'end' : 'middle';

      layouts.set(point.country, {
        x: point.x + ux * labelDist,
        y: point.y + uy * labelDist,
        anchorX: point.x + ux * point.radius,
        anchorY: point.y + uy * point.radius,
        leaderX: point.x + ux * (labelDist - 6),
        leaderY: point.y + uy * (labelDist - 6),
        useLeader: true,
        anchor,
      });
    }
  }

  for (const point of points) {
    if (EAST_ASIA_CLUSTER.has(point.country)) continue;
    layouts.set(point.country, {
      x: point.x,
      y: point.y + point.radius + 12,
      anchorX: point.x,
      anchorY: point.y + point.radius,
      leaderX: point.x,
      leaderY: point.y + point.radius,
      useLeader: false,
      anchor: 'middle',
    });
  }

  return layouts;
}

export function isEastAsiaCountry(country: string): boolean {
  return EAST_ASIA_CLUSTER.has(country);
}
