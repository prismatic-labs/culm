import { concentrationMap } from '../data/concentration-map';
import type { ConcentrationMap } from '../types';

export function buildDatasetSnapshot(): ConcentrationMap & { exportedAt: string } {
  return {
    ...concentrationMap,
    exportedAt: new Date().toISOString(),
  };
}
