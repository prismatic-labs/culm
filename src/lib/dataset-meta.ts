import { epochMetrics } from '../data/epoch-metrics';

/** ISO date (YYYY-MM-DD) for the latest Epoch API refresh. */
export const DATASET_LAST_UPDATED = epochMetrics.fetchedAt.slice(0, 10);

export function datasetCitation(datasetVersion: string): string {
  return `Prismatic Labs (2026). Culm AI Stack Concentration Map v${datasetVersion}. Dataset snapshot culm-concentration-${DATASET_LAST_UPDATED}.json.`;
}
