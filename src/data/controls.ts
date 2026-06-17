import type { Confidence } from '../types';

export interface ControlSource {
  url: string;
  org: string;
  asOf: string;
  note?: string;
}

export type ControlDirection = 'west-to-china' | 'china-to-west';

export type ControlStatus = 'active' | 'tightening' | 'contested';

export interface LeverageMeasure {
  id: string;
  /** Stack layer this control acts on (matches concentration-map layer id). */
  layerId: string;
  layerName: string;
  stackOrder: number;
  title: string;
  direction: ControlDirection;
  /** Who holds the lever and is exercising it. */
  controller: string;
  /** Who the control is aimed at. */
  target: string;
  /** Legal/policy instrument. */
  instrument: string;
  since: string;
  status: ControlStatus;
  /** What the measure does. */
  summary: string;
  /** Observed effect or current state. */
  effect: string;
  confidence: Confidence;
  sources: ControlSource[];
}

const BIS: ControlSource = {
  url: 'https://www.bis.gov/',
  org: 'U.S. Bureau of Industry and Security',
  asOf: '2025',
};

const CRS: ControlSource = {
  url: 'https://www.congress.gov/crs-products',
  org: 'Congressional Research Service',
  asOf: '2025',
};

/**
 * Leverage already exercised over the stack's chokepoints. The concentration map
 * shows where control sits; these are the control points that have actually been
 * pulled. Ordered by stack layer so the two pages line up one to one.
 */
export const LEVERAGE_MEASURES: LeverageMeasure[] = [
  {
    id: 'china-gallium-germanium',
    layerId: 'critical-materials',
    layerName: 'Critical Materials & Inputs',
    stackOrder: 1,
    title: 'China export controls on gallium, germanium, and antimony',
    direction: 'china-to-west',
    controller: 'China',
    target: 'United States, EU, Japan, and other importers',
    instrument: 'MOFCOM export licensing; outright ban on dual-use shipments to the US',
    since: '2023',
    status: 'tightening',
    summary:
      'China requires export licences for gallium and germanium (from August 2023), then antimony and graphite, and in December 2024 banned exports of gallium, germanium, and antimony to the United States. China refines the large majority of all three.',
    effect:
      'Gallium and germanium feed RF and power electronics in the materials layer. Prices spiked and buyers sought alternative sources, showing leverage runs both ways: the US, Japan, and the Netherlands hold major shares in tools and chips, while China holds major refining share for several inputs.',
    confidence: 'high',
    sources: [
      CRS,
      {
        url: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-gallium.pdf',
        org: 'USGS Mineral Commodity Summaries',
        asOf: '2025',
        note: 'China refining dominance for gallium and germanium.',
      },
    ],
  },
  {
    id: 'euv-to-china',
    layerId: 'euv-litho',
    layerName: 'EUV Lithography',
    stackOrder: 2,
    title: 'No EUV lithography for China',
    direction: 'west-to-china',
    controller: 'Netherlands, with United States',
    target: 'China',
    instrument: 'Dutch export licensing under sustained US pressure; later DUV restrictions',
    since: '2019',
    status: 'active',
    summary:
      'The Netherlands has withheld export licences for ASML extreme-ultraviolet systems to China since 2019. ASML, the sole maker of EUV tools, has never shipped one to China; from 2023 some advanced DUV tools were also restricted.',
    effect:
      'China has not received EUV systems; leading-edge logic production there remains constrained. A well-documented case of a sole-supplier layer used in export policy.',
    confidence: 'high',
    sources: [
      CRS,
      {
        url: 'https://www.asml.com/en/news',
        org: 'ASML',
        asOf: '2024',
        note: 'ASML disclosures on export licensing for China.',
      },
    ],
  },
  {
    id: 'eda-advanced-nodes',
    layerId: 'chip-design-eda',
    layerName: 'Chip Design & EDA',
    stackOrder: 3,
    title: 'Controls on advanced EDA software',
    direction: 'west-to-china',
    controller: 'United States',
    target: 'China',
    instrument: 'BIS export controls (EAR); Entity List designations',
    since: '2022',
    status: 'contested',
    summary:
      'BIS restricted electronic design automation tools for gate-all-around (GAAFET) advanced nodes from August 2022. The leading EDA vendors (Synopsys, Cadence, Siemens) are US-headquartered or operate under US export rules. A broader 2025 restriction was tightened then partly eased.',
    effect:
      'Limits China’s ability to design the most advanced chips even where it can fabricate them. Scope has shifted with policy, so the control is real but in flux.',
    confidence: 'medium',
    sources: [BIS, CRS],
  },
  {
    id: 'sme-leading-edge',
    layerId: 'leading-edge-fab',
    layerName: 'Leading-Edge Fabrication (≤5nm)',
    stackOrder: 4,
    title: 'Multilateral curbs on chipmaking equipment',
    direction: 'west-to-china',
    controller: 'United States, Japan, and Netherlands',
    target: 'China',
    instrument: 'BIS October 2022 rule and US-persons restriction; aligned Japanese and Dutch controls (2023)',
    since: '2022',
    status: 'active',
    summary:
      'From October 2022, the US restricted tools for sub-14/16nm logic, advanced DRAM, and 128-layer NAND, and barred US persons from supporting advanced Chinese fabs. Japan and the Netherlands aligned their own equipment controls in 2023.',
    effect:
      'Three governments with aligned export-control rules cut off equipment for leading-edge fabrication, the layer where one firm and one region already dominate.',
    confidence: 'high',
    sources: [BIS, CRS],
  },
  {
    id: 'hbm-to-china',
    layerId: 'hbm',
    layerName: 'High-Bandwidth Memory (HBM)',
    stackOrder: 5,
    title: 'High-bandwidth memory export controls',
    direction: 'west-to-china',
    controller: 'United States',
    target: 'China',
    instrument: 'BIS December 2024 rule (foreign direct product rule)',
    since: '2024',
    status: 'active',
    summary:
      'In December 2024 BIS restricted exports of advanced HBM (HBM2e and above) to China, reaching foreign-made memory through the foreign direct product rule.',
    effect:
      'HBM is the memory AI accelerators need. Cutting it constrains China’s ability to package competitive AI chips even where logic dies exist.',
    confidence: 'high',
    sources: [BIS, CRS],
  },
  {
    id: 'accelerators-to-china',
    layerId: 'ai-accelerators',
    layerName: 'AI Accelerators',
    stackOrder: 7,
    title: 'Advanced AI chip export controls',
    direction: 'west-to-china',
    controller: 'United States',
    target: 'China',
    instrument: 'BIS performance thresholds (Oct 2022, Oct 2023); Entity List; foreign direct product rule',
    since: '2022',
    status: 'tightening',
    summary:
      'The US restricted advanced GPUs (A100/H100) to China in October 2022, caught the workaround H800/A800 parts in October 2023, and has repeatedly adjusted thresholds since (including the H20). Entity List and FDPR extend reach to non-US supply.',
    effect:
      'Frontier accelerators are the most directly governed input. The controls slowed Chinese access, drove a gray market, and accelerated domestic alternatives such as Huawei Ascend.',
    confidence: 'high',
    sources: [
      BIS,
      CRS,
      {
        url: 'https://epoch.ai/data/ai-chip-sales',
        org: 'Epoch AI',
        asOf: '2025',
        note: 'Accelerator compute share concentrated in Nvidia.',
      },
    ],
  },
  {
    id: 'ai-diffusion-cloud',
    layerId: 'compute-cloud',
    layerName: 'Compute Provision / Cloud',
    stackOrder: 8,
    title: 'The attempt to control compute and model weights',
    direction: 'west-to-china',
    controller: 'United States',
    target: 'Global tiers of countries',
    instrument: 'BIS “Framework for Artificial Intelligence Diffusion” (Jan 2025), rescinded May 2025',
    since: '2025',
    status: 'contested',
    summary:
      'A January 2025 framework set tiered country caps on AI-chip exports and reached toward closed model weights and cloud access. It was rescinded in May 2025 and a replacement approach is being worked out.',
    effect:
      'The first attempt to extend export control past hardware into compute capacity and model weights. Short-lived, but an early signal of where policy may head next.',
    confidence: 'medium',
    sources: [BIS, CRS],
  },
];

export const CONTROLS_SUMMARY = {
  /** Distinct stack layers that carry at least one active control measure. */
  controlledLayers: 7,
  totalLayers: 8,
  governmentsInConcert: ['United States', 'Netherlands', 'Japan'],
};

export const CONTROLS_PAGE_COPY = {
  heading: 'At a glance',
  lede:
    'Below: how many stack layers carry a control, which governments aligned, and how bidirectional the measures run.',
  fragility:
    'Each control is also a vulnerability. The same concentration that lets one side restrict supply means the other side can retaliate at its own chokepoint, as China’s gallium and germanium bans show.',
  leverage:
    'Export and compute controls are a major enforceable lever in current AI policy debates. They are possible only because the inputs to frontier AI are concentrated enough to gate, which is exactly what Culm maps.',
  directionGuide:
    'Each arrow reads left to right: who holds the lever, then who the control targets. The badge in the corner repeats the same direction. Red means US-led export controls toward China; blue means China restricting imports to the United States, EU, Japan, and other buyers.',
} as const;
