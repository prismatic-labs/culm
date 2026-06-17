import type { DepthRangeM, SeabedDepositType } from '../data/seabed';

export const DEPTH_AXIS_MAX_M = 6000;

export function formatDepthM(m: number): string {
  return m.toLocaleString('en-US');
}

export function formatDepthRange(depth: DepthRangeM): string {
  if (depth.min === depth.max) return `${formatDepthM(depth.min)} m`;
  return `${formatDepthM(depth.min)}–${formatDepthM(depth.max)} m`;
}

export function formatDepthRangeShort(depth: DepthRangeM): string {
  const label = (m: number): string => {
    if (m < 1000) return `${m} m`;
    const km = m / 1000;
    return `${Number.isInteger(km) ? km : km.toFixed(1)} km`;
  };
  if (depth.min === depth.max) return label(depth.min);
  return `${label(depth.min)}–${label(depth.max)}`;
}

export function formatDepositType(type: SeabedDepositType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function depthMidpoint(depth: DepthRangeM): number {
  return (depth.min + depth.max) / 2;
}

export function depthToAxisPercent(depthM: number): number {
  return Math.min(100, Math.max(0, (depthM / DEPTH_AXIS_MAX_M) * 100));
}
