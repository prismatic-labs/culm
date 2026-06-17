import type { Confidence } from '../types';
import { epochMetrics } from './epoch-metrics';

export interface ComputeSource {
  url: string;
  org: string;
  asOf: string;
  note?: string;
}

export interface DesignerShare {
  name: string;
  share: number;
}

export interface ComputeFact {
  id: string;
  value: string;
  label: string;
  note: string;
  confidence: Confidence;
  sources: ComputeSource[];
}

const EPOCH_ACCEL: ComputeSource = {
  url: 'https://epoch.ai/data/ai-chip-sales',
  org: 'Epoch AI',
  asOf: epochMetrics.aiAccelerators.asOf,
  note: epochMetrics.aiAccelerators.metric,
};

const EPOCH_CLUSTERS: ComputeSource = {
  url: 'https://epoch.ai/data/gpu_clusters.csv',
  org: 'Epoch AI',
  asOf: epochMetrics.computeCloud.asOf,
  note: epochMetrics.computeCloud.note,
};

const IEA_ENERGY_AI: ComputeSource = {
  url: 'https://www.iea.org/reports/energy-and-ai',
  org: 'IEA',
  asOf: '2025',
  note: 'Energy and AI: data-centre electricity demand outlook.',
};

const EPRI: ComputeSource = {
  url: 'https://www.epri.com/research/products/3002028905',
  org: 'EPRI',
  asOf: '2024',
  note: 'Powering Intelligence: data-center electricity use scenarios.',
};

/** Cumulative H100e share by chip designer, from the Epoch AI chip-sales dataset. */
export const ACCELERATOR_DESIGNERS: DesignerShare[] = Object.entries(
  epochMetrics.aiAccelerators.designers,
)
  .map(([name, share]) => ({ name, share: share as number }))
  .sort((a, b) => b.share - a.share);

export const COMPUTE_CONCENTRATION = {
  nvidiaShare: epochMetrics.aiAccelerators.cr1,
  topThreeShare: epochMetrics.aiAccelerators.cr3,
  acceleratorHhi: epochMetrics.aiAccelerators.hhi,
  usClusterShare: epochMetrics.computeCloud.topCountryShare,
  asOfAccel: epochMetrics.aiAccelerators.asOf,
  asOfCluster: epochMetrics.computeCloud.asOf,
  accelSources: [EPOCH_ACCEL],
  clusterSources: [EPOCH_CLUSTERS],
};

/** The binding constraint: power. Curated, confidence-rated, sourced. */
export const POWER_FACTS: ComputeFact[] = [
  {
    id: 'global-share',
    value: '~1.5% → ~3%',
    label: 'data centres’ share of global electricity, today and projected by 2030',
    note: 'IEA expects data-centre electricity demand to roughly double to around 945 TWh by 2030, with AI the main driver of the growth.',
    confidence: 'medium',
    sources: [IEA_ENERGY_AI],
  },
  {
    id: 'us-grid',
    value: '~4% → ~9%',
    label: 'share of US electricity from data centres, today and projected by 2030',
    note: 'The United States is the largest market and the place where AI load growth most strains the grid; estimates vary by scenario.',
    confidence: 'medium',
    sources: [EPRI, IEA_ENERGY_AI],
  },
  {
    id: 'siting',
    value: 'A few hubs',
    label: 'where capacity clusters: Northern Virginia, Texas, and a handful of US regions',
    note: 'Northern Virginia is the world’s largest data-centre market. Siting follows power availability and interconnection queues, concentrating compute geographically.',
    confidence: 'medium',
    sources: [EPRI],
  },
  {
    id: 'campuses',
    value: 'GW-scale',
    label: 'frontier training campuses are now planned in gigawatts, not megawatts',
    note: 'Single clusters have passed 100,000 GPUs, and announced campuses target gigawatt-scale power, which could increase competition for grid capacity in some regions.',
    confidence: 'low',
    sources: [IEA_ENERGY_AI],
  },
];

export const COMPUTE_PAGE_COPY = {
  heading: 'Where AI actually runs',
  intro:
    'The map traces the supply chain that makes AI compute. This is the other end: where that compute piles up, who controls it, and the constraint now binding hardest, which is electricity.',
  point:
    'Compute is among the most observable and policy-targeted inputs to frontier AI: physical, countable, and concentrated in a few companies, a few countries, and a few power-hungry sites. That is why governments reach for it.',
  action:
    'Figures below are sourced and confidence-rated. Accelerator and cluster shares come from Epoch AI’s partial but public inventory; power figures are scenario estimates.',
  whoHeading: 'Who controls AI compute',
  whoLead:
    'A single designer supplies most AI accelerators, and most mapped cluster compute sits in one country.',
  powerHeading: 'A growing constraint: power and grid access',
  powerLead:
    'The newest chokepoint is not a chip. It is the electricity and grid to run the chips, the same copper and metals the seabed track follows.',
  fragility:
    'Concentration is also exposure. Compute pooled in a few firms, a few regions, and a few grids means a fault, an outage, or a policy shift in one place can affect multiple training and inference sites.',
  leverage:
    'Because compute is observable and concentrated, it is the input controls actually reach: export limits on chips, and the first attempts to govern cloud access and model weights.',
} as const;
