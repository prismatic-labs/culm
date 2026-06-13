import { describe, expect, it } from 'vitest';
import {
  EAST_ASIA_CLUSTER,
  layoutMarkerLabels,
  markerRadiusFromStats,
  separateClusterMarkers,
} from './map-layout';

describe('markerRadiusFromStats', () => {
  it('caps radius so markers do not merge into blobs', () => {
    expect(markerRadiusFromStats(2, 1)).toBeLessThanOrEqual(12);
    expect(markerRadiusFromStats(2, 1)).toBeGreaterThanOrEqual(6);
  });
});

describe('separateClusterMarkers', () => {
  it('pushes overlapping East Asia points apart', () => {
    const points = [
      { country: 'China', x: 100, y: 100, radius: 10 },
      { country: 'Taiwan', x: 102, y: 101, radius: 10 },
    ];
    separateClusterMarkers(points, EAST_ASIA_CLUSTER);
    const dist = Math.hypot(points[1]!.x - points[0]!.x, points[1]!.y - points[0]!.y);
    expect(dist).toBeGreaterThanOrEqual(points[0]!.radius + points[1]!.radius + 6);
  });
});

describe('layoutMarkerLabels', () => {
  it('always lays out labels for every country', () => {
    const layouts = layoutMarkerLabels([
      { country: 'China', x: 520, y: 180, radius: 10 },
      { country: 'Netherlands', x: 380, y: 120, radius: 8 },
    ]);
    expect(layouts.has('China')).toBe(true);
    expect(layouts.get('China')!.useLeader).toBe(true);
    expect(layouts.get('Netherlands')!.useLeader).toBe(false);
  });

  it('fans East Asia labels radially so leaders point away from the cluster', () => {
    const layouts = layoutMarkerLabels([
      { country: 'China', x: 580, y: 100, radius: 8 },
      { country: 'Japan', x: 654, y: 96, radius: 8 },
      { country: 'Taiwan', x: 630, y: 134, radius: 10 },
    ]);
    // China is the westernmost dot, so its label sits to the west (anchor end).
    const china = layouts.get('China')!;
    expect(china.useLeader).toBe(true);
    expect(china.anchor).toBe('end');
    expect(china.x).toBeLessThan(580);
    // Japan is the easternmost dot, so its label sits to the east (anchor start).
    const japan = layouts.get('Japan')!;
    expect(japan.anchor).toBe('start');
    expect(japan.x).toBeGreaterThan(654);
    // Taiwan is the southernmost dot, so its label sits below it.
    const taiwan = layouts.get('Taiwan')!;
    expect(taiwan.y).toBeGreaterThan(134);
  });
});
