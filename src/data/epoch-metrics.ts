import raw from './auto/epoch-metrics.json';

export interface EpochMetricsFile {
  fetchedAt: string;
  aiAccelerators: {
    asOf: string;
    metric: string;
    designers: Record<string, number>;
    cr1: number;
    cr3: number;
    hhi: number;
    sources: string[];
    evidence?: {
      rawClaim?: string;
      extraction?: string;
      caveat?: string;
    };
  };
  computeCloud: {
    asOf: string;
    metric: string;
    topCountry: string;
    topCountryShare: number;
    sources: string[];
    note?: string;
    evidence?: {
      rawClaim?: string;
      extraction?: string;
      caveat?: string;
    };
  };
}

export const epochMetrics = raw as EpochMetricsFile;

/** Designer share from Epoch data; Epoch may omit minor designers between refreshes. */
export function designerShare(name: string, fallback = 0): number {
  return epochMetrics.aiAccelerators.designers[name] ?? fallback;
}

/** Sum of cumulative H100e share for US-headquartered designers present in Epoch. */
export function usDesignerShareTotal(): number {
  const d = epochMetrics.aiAccelerators.designers;
  return (d.Nvidia ?? 0) + (d.Google ?? 0) + (d.AMD ?? 0);
}
