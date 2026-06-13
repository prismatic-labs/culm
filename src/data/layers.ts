import type { Confidence, Layer, SourcedValue, Substitutability } from '../types';
import { evaluateChokepoint, computeCr1, computeCr3, computeHhiFromShares } from '../lib/chokepoint';
import { dominantCountriesFromActors } from '../lib/layer-countries';
import epochMetrics from '../data/auto/epoch-metrics.json';

export function sv<T>(
  value: T,
  opts: {
    confidence: Confidence;
    asOf: string;
    sources: string[];
    note?: string;
    rawClaim?: string;
    extraction?: string;
    caveat?: string;
  },
): SourcedValue<T> {
  return { value, ...opts };
}

function layerFromMetrics(
  base: Omit<Layer, 'isCriticalChokepoint' | 'chokepointRationale' | 'metrics'> & {
    metrics: Layer['metrics'];
  },
): Layer {
  const choke = evaluateChokepoint({ metrics: base.metrics });
  return { ...base, ...choke };
}

function metricsFromActors(
  actors: Layer['actors'],
  opts: {
    topCountry: string;
    topCountryShare: SourcedValue<number>;
    substitutability: SourcedValue<Substitutability>;
    asOf: string;
    sources: string[];
    note?: string;
  },
) {
  const shares = actors.map((a) => a.share.value);
  const dominantCountries = dominantCountriesFromActors(
    actors,
    opts.topCountry,
    opts.topCountryShare,
  );
  return {
    cr1: sv(computeCr1(shares), {
      confidence: opts.sources.length ? 'medium' : 'low',
      asOf: opts.asOf,
      sources: opts.sources,
      note: opts.note,
    }),
    cr3: sv(computeCr3(shares), {
      confidence: opts.sources.length ? 'medium' : 'low',
      asOf: opts.asOf,
      sources: opts.sources,
    }),
    hhi: sv(computeHhiFromShares(shares), {
      confidence: opts.sources.length ? 'medium' : 'low',
      asOf: opts.asOf,
      sources: opts.sources,
    }),
    topCountry: opts.topCountry,
    topCountryShare: opts.topCountryShare,
    dominantCountries,
    substitutability: opts.substitutability,
  };
}

const USGS_GALLIUM =
  'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-gallium.pdf';
const BROOKINGS_JP =
  'https://www.brookings.edu/articles/the-renaissance-of-the-japanese-semiconductor-industry/';
const ASML_EUV = 'https://www.asml.com/en/products/euv-lithography-systems';
const FT_ASML =
  'https://www.soitec.com/docs/default-source/press-news---articles-de-presse/january---26/why-neither-asia-nor-the-us-has-produced-a-rival-to-asml---financial-times---21-01-2026.pdf';
const TRENDFORCE_EDA =
  'https://www.trendforce.com/news/2025/06/02/news-china-revenue-at-risk-as-u-s-curbs-slam-eda-giants-impact-on-synopsys-cadence-and-more/';
const TRENDFORCE_FAB =
  'https://www.trendforce.com/news/2024/04/08/news-tsmcs-advanced-processes-remain-resilient-amid-challenges/';
const TRENDFORCE_HBM =
  'https://www.trendforce.com/news/2024/04/24/news-amid-foundry-overcapacity-competition-for-hbm-intensifies-rapidly/';
const NOMAD_COWOS = 'https://www.nomadsemi.com/p/tsmcs-cowos-capacity';
const SYNERGY_CLOUD =
  'https://www.srgresearch.com/articles/cloud-market-jumped-to-330-billion-in-2024-genai-is-now-driving-half-of-the-growth';
const EPOCH_CHIP_SALES = 'https://epoch.ai/data/ai_chip_sales.zip';
const EPOCH_GPU = 'https://epoch.ai/data/gpu_clusters.csv';

const nvidiaShare = epochMetrics.aiAccelerators.designers.Nvidia ?? 0.707;
const amdShare = epochMetrics.aiAccelerators.designers.AMD ?? 0.065;
const googleShare = epochMetrics.aiAccelerators.designers.Google ?? 0.19;

const criticalMaterials = layerFromMetrics({
  id: 'critical-materials',
  name: 'Critical Materials & Inputs',
  stackOrder: 1,
  category: 'Materials',
  whatItIs:
    'Photoresists, ultrapure silica wafers, specialty gases, and critical elements such as gallium and germanium.',
  whyItMatters:
    'Several inputs are single-country dependencies. Without them, every downstream layer stalls, ' +
    'often before the bottleneck most people have heard of. Each input below has its own dominant country.',
  stallEffect:
    'Without these inputs, wafer and lithography supply chains halt before fabs can run.',
  actors: [
    {
      name: 'China (primary gallium production)',
      country: 'China',
      share: sv(0.99, {
        confidence: 'high',
        asOf: '2024',
        sources: [USGS_GALLIUM],
        note: 'USGS MCS 2025: China accounted for 99% of worldwide primary low-purity gallium production.',
      }),
    },
    {
      name: 'JSR + TOK + Shin-Etsu (EUV photoresist)',
      country: 'Japan',
      share: sv(0.9, {
        confidence: 'medium',
        asOf: '2024',
        sources: [BROOKINGS_JP],
        note: 'Brookings cites ~50% global photoresist share for Japan; EUV segment higher (~90% per industry reports). Layer uses Japan photoresist/wafer cluster.',
      }),
    },
    {
      name: 'Shin-Etsu + SUMCO (300mm silicon wafers)',
      country: 'Japan',
      share: sv(0.53, {
        confidence: 'medium',
        asOf: '2024',
        sources: [BROOKINGS_JP],
        note: 'Brookings: Japan 53% global silicon wafer share.',
      }),
    },
  ],
  metrics: {
    cr1: sv(0.99, {
      confidence: 'high',
      asOf: '2024',
      sources: [USGS_GALLIUM],
      note: 'Layer headline CR1 uses gallium primary production, the tightest single-country input in this layer.',
    }),
    cr3: sv(0.99, {
      confidence: 'medium',
      asOf: '2024',
      sources: [USGS_GALLIUM, BROOKINGS_JP],
      note: 'Composite layer; CR3 not additive across sub-materials. Shown for transparency.',
    }),
    hhi: sv(9900, {
      confidence: 'medium',
      asOf: '2024',
      sources: [USGS_GALLIUM],
      note: 'Dominated by gallium country concentration.',
    }),
    topCountry: 'China',
    topCountryShare: sv(0.99, {
      confidence: 'high',
      asOf: '2024',
      sources: [USGS_GALLIUM],
      note: 'Gallium refining. Japan dominates photoresist/wafers separately. See actors.',
    }),
    dominantCountries: [
      {
        country: 'China',
        share: sv(0.99, {
          confidence: 'high',
          asOf: '2024',
          sources: [USGS_GALLIUM],
          note: 'USGS MCS 2025: China 99% of worldwide primary low-purity gallium production. Gallium feeds gallium-arsenide and gallium-nitride chips used in radio-frequency, power-electronics, and optoelectronic devices.',
        }),
      },
      {
        country: 'Japan',
        share: sv(0.9, {
          confidence: 'medium',
          asOf: '2024',
          sources: [BROOKINGS_JP],
          note: 'Japan ~90% EUV photoresist; ~53% silicon wafers (Brookings).',
        }),
      },
    ],
    substitutability: sv('years', {
      confidence: 'medium',
      asOf: '2025',
      sources: [USGS_GALLIUM, BROOKINGS_JP],
      note: 'USGS notes limited substitutes for germanium in some uses; gallium refinery buildout measured in years.',
    }),
  },
  subcomponents: [
    {
      id: 'gallium',
      name: 'Primary gallium production',
      country: 'China',
      share: sv(0.99, {
        confidence: 'high',
        asOf: '2024',
        sources: [USGS_GALLIUM],
        note: 'USGS MCS 2025: China 99% of worldwide primary low-purity gallium production. Drives headline CR1.',
      }),
    },
    {
      id: 'euv-photoresist',
      name: 'EUV photoresist (JSR, TOK, Shin-Etsu)',
      country: 'Japan',
      share: sv(0.9, {
        confidence: 'medium',
        asOf: '2024',
        sources: [BROOKINGS_JP],
        note: 'Japan ~90% of EUV photoresist segment.',
      }),
    },
    {
      id: 'silicon-wafers',
      name: '300mm silicon wafers (Shin-Etsu, SUMCO)',
      country: 'Japan',
      share: sv(0.53, {
        confidence: 'medium',
        asOf: '2024',
        sources: [BROOKINGS_JP],
        note: 'Japan 53% global wafer share. Below 80% alone; shown for transparency.',
      }),
    },
  ],
  dependsOn: [],
});

const euvLithography = layerFromMetrics({
  id: 'euv-litho',
  name: 'EUV Lithography',
  stackOrder: 2,
  category: 'Equipment',
  whatItIs:
    'The machines that print the finest circuit patterns using extreme-ultraviolet light. ' +
    'No leading-edge AI chip can be made at current densities without them.',
  whyItMatters:
    'A single company is the only maker of these machines on Earth, and each one depends ' +
    'on a thin chain of sub-suppliers. This is the narrowest point in the entire stack.',
  stallEffect:
    'No new leading-edge chips can be patterned; advanced-node production stops.',
  actors: [
    {
      name: 'ASML',
      country: 'Netherlands',
      share: sv(1.0, {
        confidence: 'high',
        asOf: '2025',
        sources: [ASML_EUV, FT_ASML],
        note: 'Sole commercial EUV lithography system supplier.',
      }),
    },
  ],
  metrics: {
    cr1: sv(1.0, { confidence: 'high', asOf: '2025', sources: [ASML_EUV, FT_ASML] }),
    cr3: sv(1.0, { confidence: 'high', asOf: '2025', sources: [ASML_EUV, FT_ASML] }),
    hhi: sv(10000, { confidence: 'high', asOf: '2025', sources: [ASML_EUV, FT_ASML] }),
    topCountry: 'Netherlands',
    topCountryShare: sv(1.0, {
      confidence: 'medium',
      asOf: '2025',
      sources: [ASML_EUV, FT_ASML],
      note: 'Assembly in NL; Zeiss SMT (Germany) supplies EUV optics. Sub-supplier concentration.',
    }),
    dominantCountries: [
      {
        country: 'Netherlands',
        share: sv(1.0, {
          confidence: 'medium',
          asOf: '2025',
          sources: [ASML_EUV, FT_ASML],
          note: 'Assembly in NL; Zeiss SMT (Germany) supplies EUV optics.',
        }),
      },
    ],
    substitutability: sv('years-to-decades', {
      confidence: 'high',
      asOf: '2025',
      sources: [FT_ASML],
      note: 'FT/CSET framing: no credible second EUV supplier; decades of operating data gap.',
    }),
  },
  subcomponents: [
    {
      id: 'asml-system',
      name: 'ASML (EUV system integration)',
      country: 'Netherlands',
      share: sv(1.0, {
        confidence: 'high',
        asOf: '2025',
        sources: [ASML_EUV, FT_ASML],
        note: 'Sole commercial EUV lithography system supplier.',
        rawClaim: 'ASML is the only commercial supplier of EUV lithography systems.',
        extraction: 'Layer CR1 uses 100% for sole-supplier commercial EUV tools.',
      }),
    },
    {
      id: 'zeiss-optics',
      name: 'Zeiss SMT (EUV mirrors / optics)',
      country: 'Germany',
      parentId: 'asml-system',
      share: sv(1.0, {
        confidence: 'high',
        asOf: '2025',
        sources: [ASML_EUV, FT_ASML],
        note: 'Near-monopoly on EUV optical subsystems supplied into ASML tools.',
        rawClaim: 'Zeiss SMT supplies EUV optics integrated into ASML systems.',
        extraction: 'Modeled as 100% of EUV optics subsystem share in this pilot graph.',
        caveat: 'German supplier; concentration is firm-level, not Netherlands assembly share.',
      }),
    },
    {
      id: 'euv-source',
      name: 'Cymer / ASML (EUV light source)',
      country: 'United States',
      parentId: 'asml-system',
      share: sv(1.0, {
        confidence: 'medium',
        asOf: '2025',
        sources: [ASML_EUV],
        note: 'Laser-produced plasma EUV source integrated by ASML (Cymer acquired 2013).',
        rawClaim: 'Commercial EUV sources are integrated into ASML scanners.',
        extraction: 'Pilot node for light-source subsystem concentration.',
      }),
    },
  ],
  dependsOn: ['critical-materials'],
});

const chipDesignEda = layerFromMetrics({
  id: 'chip-design-eda',
  name: 'Chip Design & EDA',
  stackOrder: 3,
  category: 'Design/EDA',
  whatItIs:
    'Electronic design automation tools, licensable IP cores, and accelerator chip architects.',
  whyItMatters:
    'A three-firm oligopoly supplies the software every advanced chip is designed with. ' +
    'You cannot tape out leading-edge silicon without passing through it.',
  stallEffect: 'New advanced chip designs cannot be taped out or verified at scale.',
  actors: [
    {
      name: 'Synopsys',
      country: 'United States',
      share: sv(0.31, { confidence: 'medium', asOf: '2024', sources: [TRENDFORCE_EDA] }),
    },
    {
      name: 'Cadence',
      country: 'United States',
      share: sv(0.3, { confidence: 'medium', asOf: '2024', sources: [TRENDFORCE_EDA] }),
    },
    {
      name: 'Siemens EDA',
      country: 'Germany',
      share: sv(0.13, { confidence: 'medium', asOf: '2024', sources: [TRENDFORCE_EDA] }),
    },
  ],
  metrics: {
    ...metricsFromActors(
      [
        { name: 'Synopsys', country: 'United States', share: sv(0.31, { confidence: 'medium', asOf: '2024', sources: [TRENDFORCE_EDA] }) },
        { name: 'Cadence', country: 'United States', share: sv(0.3, { confidence: 'medium', asOf: '2024', sources: [TRENDFORCE_EDA] }) },
        { name: 'Siemens EDA', country: 'Germany', share: sv(0.13, { confidence: 'medium', asOf: '2024', sources: [TRENDFORCE_EDA] }) },
      ],
      {
        topCountry: 'United States',
        topCountryShare: sv(0.61, {
          confidence: 'medium',
          asOf: '2024',
          sources: [TRENDFORCE_EDA],
          note: 'Synopsys + Cadence US revenue share of EDA triopoly.',
        }),
        substitutability: sv('years', {
          confidence: 'medium',
          asOf: '2025',
          sources: [TRENDFORCE_EDA],
          note: 'Foundry-certified tool chains; switching EDA vendor at advanced nodes takes years.',
        }),
        asOf: '2024',
        sources: [TRENDFORCE_EDA],
      },
    ),
  },
  dependsOn: ['critical-materials'],
});

const leadingEdgeFab = layerFromMetrics({
  id: 'leading-edge-fab',
  name: 'Leading-Edge Fabrication (≤5nm)',
  stackOrder: 4,
  category: 'Fabrication',
  whatItIs:
    'The foundries that actually manufacture the most advanced AI chips at the smallest process nodes.',
  whyItMatters:
    'Most leading-edge AI silicon is fabricated by one company, concentrated in one region. ' +
    'That is a geographic single point of failure for the whole frontier.',
  stallEffect: 'Frontier AI silicon production at ≤5nm stops worldwide at scale.',
  actors: [
    {
      name: 'TSMC',
      country: 'Taiwan',
      share: sv(0.9, {
        confidence: 'medium',
        asOf: '2025-Q4',
        sources: [TRENDFORCE_FAB],
        note: 'TrendForce: TSMC >90% at 3nm, ~70-80% at 5nm; layer uses advanced-node composite ~90%.',
      }),
    },
    {
      name: 'Samsung Foundry',
      country: 'South Korea',
      share: sv(0.08, {
        confidence: 'medium',
        asOf: '2025-Q4',
        sources: [TRENDFORCE_FAB],
      }),
    },
  ],
  metrics: {
    ...metricsFromActors(
      [
        { name: 'TSMC', country: 'Taiwan', share: sv(0.9, { confidence: 'medium', asOf: '2025-Q4', sources: [TRENDFORCE_FAB] }) },
        { name: 'Samsung Foundry', country: 'South Korea', share: sv(0.08, { confidence: 'medium', asOf: '2025-Q4', sources: [TRENDFORCE_FAB] }) },
      ],
      {
        topCountry: 'Taiwan',
        topCountryShare: sv(0.9, { confidence: 'medium', asOf: '2025-Q4', sources: [TRENDFORCE_FAB] }),
        substitutability: sv('years', {
          confidence: 'high',
          asOf: '2025',
          sources: [TRENDFORCE_FAB],
        }),
        asOf: '2025-Q4',
        sources: [TRENDFORCE_FAB],
      },
    ),
  },
  dependsOn: ['euv-litho', 'critical-materials'],
});

const hbm = layerFromMetrics({
  id: 'hbm',
  name: 'High-Bandwidth Memory (HBM)',
  stackOrder: 5,
  category: 'Memory',
  whatItIs: 'Stacked DRAM packages that feed AI accelerators at the bandwidth training and inference require.',
  whyItMatters:
    'Only three firms make HBM at scale, heavily concentrated in Korea. ' +
    'Accelerator output is capped by HBM attach rate and supply.',
  stallEffect:
    'Training clusters cannot get enough memory bandwidth; accelerator output is capped.',
  actors: [
    {
      name: 'SK hynix',
      country: 'South Korea',
      share: sv(0.525, { confidence: 'medium', asOf: '2024', sources: [TRENDFORCE_HBM] }),
    },
    {
      name: 'Samsung',
      country: 'South Korea',
      share: sv(0.424, { confidence: 'medium', asOf: '2024', sources: [TRENDFORCE_HBM] }),
    },
    {
      name: 'Micron',
      country: 'United States',
      share: sv(0.05, { confidence: 'medium', asOf: '2024', sources: [TRENDFORCE_HBM] }),
    },
  ],
  metrics: {
    ...metricsFromActors(
      [
        { name: 'SK hynix', country: 'South Korea', share: sv(0.525, { confidence: 'medium', asOf: '2024', sources: [TRENDFORCE_HBM] }) },
        { name: 'Samsung', country: 'South Korea', share: sv(0.424, { confidence: 'medium', asOf: '2024', sources: [TRENDFORCE_HBM] }) },
        { name: 'Micron', country: 'United States', share: sv(0.05, { confidence: 'medium', asOf: '2024', sources: [TRENDFORCE_HBM] }) },
      ],
      {
        topCountry: 'South Korea',
        topCountryShare: sv(0.949, {
          confidence: 'medium',
          asOf: '2024',
          sources: [TRENDFORCE_HBM],
          note: 'SK hynix + Samsung combined.',
        }),
        substitutability: sv('years', {
          confidence: 'medium',
          asOf: '2025',
          sources: [TRENDFORCE_HBM],
        }),
        asOf: '2024',
        sources: [TRENDFORCE_HBM],
      },
    ),
  },
  dependsOn: ['leading-edge-fab', 'critical-materials'],
});

const advancedPackaging = layerFromMetrics({
  id: 'advanced-packaging',
  name: 'Advanced Packaging (CoWoS-class)',
  stackOrder: 6,
  category: 'Packaging',
  whatItIs:
    'Advanced packaging bonds accelerator dies to HBM stacks. The dominant method is TSMC\u2019s CoWoS (chip-on-wafer-on-substrate) and similar techniques.',
  whyItMatters:
    'Known capacity bottleneck: even when fabs and HBM exist, packaging lines throttle how many AI GPUs ship.',
  stallEffect: 'GPU and accelerator shipments stall even when dies and HBM exist.',
  actors: [
    {
      name: 'TSMC (CoWoS)',
      country: 'Taiwan',
      share: sv(0.95, {
        confidence: 'medium',
        asOf: '2025',
        sources: [NOMAD_COWOS],
        note: 'Industry estimates ~100% of production-proven AI CoWoS; TSMC dominates.',
      }),
    },
    {
      name: 'OSAT partners (Amkor, SPIL, etc.)',
      country: 'Taiwan',
      share: sv(0.05, {
        confidence: 'low',
        asOf: '2025',
        sources: [NOMAD_COWOS],
        note: 'TSMC outsourcing portion of CoWoS workflow; still Taiwan-centric.',
      }),
    },
  ],
  metrics: {
    ...metricsFromActors(
      [
        { name: 'TSMC (CoWoS)', country: 'Taiwan', share: sv(0.95, { confidence: 'medium', asOf: '2025', sources: [NOMAD_COWOS] }) },
        { name: 'OSAT partners', country: 'Taiwan', share: sv(0.05, { confidence: 'low', asOf: '2025', sources: [NOMAD_COWOS] }) },
      ],
      {
        topCountry: 'Taiwan',
        topCountryShare: sv(0.95, { confidence: 'medium', asOf: '2025', sources: [NOMAD_COWOS] }),
        substitutability: sv('years', {
          confidence: 'medium',
          asOf: '2025',
          sources: [NOMAD_COWOS],
        }),
        asOf: '2025',
        sources: [NOMAD_COWOS],
      },
    ),
  },
  dependsOn: ['leading-edge-fab', 'hbm'],
});

const aiAccelerators = layerFromMetrics({
  id: 'ai-accelerators',
  name: 'AI Accelerators',
  stackOrder: 7,
  category: 'Accelerators',
  whatItIs:
    'Finished training and inference chips: merchant AI accelerators (Nvidia and AMD GPUs, Google TPUs, and similar) plus the in-house silicon that cloud providers design themselves.',
  whyItMatters:
    'The layer most people discuss, but it sits atop every upstream chokepoint. ' +
    'Concentration here is visible; dependence on upstream layers is often not.',
  stallEffect: 'Merchant and hyperscaler AI chip supply to datacenters dries up.',
  actors: [
    {
      name: 'NVIDIA',
      country: 'United States',
      share: sv(nvidiaShare, {
        confidence: 'medium',
        asOf: epochMetrics.aiAccelerators.asOf,
        sources: epochMetrics.aiAccelerators.sources,
        note: 'Epoch AI cumulative H100e-equivalent compute by designer through 2025.',
      }),
    },
    {
      name: 'Google (TPU)',
      country: 'United States',
      share: sv(googleShare, {
        confidence: 'medium',
        asOf: epochMetrics.aiAccelerators.asOf,
        sources: epochMetrics.aiAccelerators.sources,
      }),
    },
    {
      name: 'AMD',
      country: 'United States',
      share: sv(amdShare, {
        confidence: 'medium',
        asOf: epochMetrics.aiAccelerators.asOf,
        sources: epochMetrics.aiAccelerators.sources,
      }),
    },
  ],
  metrics: {
    cr1: sv(epochMetrics.aiAccelerators.cr1, {
      confidence: 'medium',
      asOf: epochMetrics.aiAccelerators.asOf,
      sources: epochMetrics.aiAccelerators.sources,
      note: epochMetrics.aiAccelerators.metric,
      rawClaim: epochMetrics.aiAccelerators.evidence?.rawClaim,
      extraction: epochMetrics.aiAccelerators.evidence?.extraction,
      caveat: epochMetrics.aiAccelerators.evidence?.caveat,
    }),
    cr3: sv(epochMetrics.aiAccelerators.cr3, {
      confidence: 'medium',
      asOf: epochMetrics.aiAccelerators.asOf,
      sources: epochMetrics.aiAccelerators.sources,
    }),
    hhi: sv(epochMetrics.aiAccelerators.hhi, {
      confidence: 'medium',
      asOf: epochMetrics.aiAccelerators.asOf,
      sources: epochMetrics.aiAccelerators.sources,
    }),
    topCountry: 'United States',
    topCountryShare: sv(0.92, {
      confidence: 'medium',
      asOf: epochMetrics.aiAccelerators.asOf,
      sources: epochMetrics.aiAccelerators.sources,
      note: 'NVIDIA + Google + AMD designer HQs; compute share US-heavy.',
    }),
    dominantCountries: [
      {
        country: 'United States',
        share: sv(0.92, {
          confidence: 'medium',
          asOf: epochMetrics.aiAccelerators.asOf,
          sources: epochMetrics.aiAccelerators.sources,
          note: 'NVIDIA + Google + AMD designer HQs; compute share US-heavy.',
        }),
      },
    ],
    substitutability: sv('years', {
      confidence: 'medium',
      asOf: '2025',
      sources: [EPOCH_CHIP_SALES, 'https://epoch.ai/data-insights/ai-chip-production'],
    }),
  },
  dependsOn: ['leading-edge-fab', 'chip-design-eda', 'hbm', 'advanced-packaging'],
});

const computeCloud = layerFromMetrics({
  id: 'compute-cloud',
  name: 'Compute Provision / Cloud',
  stackOrder: 8,
  category: 'Compute/Cloud',
  whatItIs:
    'GPU capacity rented from hyperscalers and neoclouds (GPU-rental specialists like CoreWeave), plus the power grid and datacenter geography behind it.',
  whyItMatters:
    'Frontier training runs concentrate in a handful of cloud providers and regions. ' +
    'Energy and grid access are part of the concentration story at this layer.',
  stallEffect:
    'Frontier training and inference capacity in concentrated cloud regions becomes unavailable.',
  actors: [
    {
      name: 'AWS',
      country: 'United States',
      share: sv(0.3, { confidence: 'medium', asOf: '2024-Q4', sources: [SYNERGY_CLOUD] }),
    },
    {
      name: 'Microsoft Azure',
      country: 'United States',
      share: sv(0.21, { confidence: 'medium', asOf: '2024-Q4', sources: [SYNERGY_CLOUD] }),
    },
    {
      name: 'Google Cloud',
      country: 'United States',
      share: sv(0.12, { confidence: 'medium', asOf: '2024-Q4', sources: [SYNERGY_CLOUD] }),
    },
  ],
  metrics: {
    ...metricsFromActors(
      [
        { name: 'AWS', country: 'United States', share: sv(0.3, { confidence: 'medium', asOf: '2024-Q4', sources: [SYNERGY_CLOUD] }) },
        { name: 'Microsoft Azure', country: 'United States', share: sv(0.21, { confidence: 'medium', asOf: '2024-Q4', sources: [SYNERGY_CLOUD] }) },
        { name: 'Google Cloud', country: 'United States', share: sv(0.12, { confidence: 'medium', asOf: '2024-Q4', sources: [SYNERGY_CLOUD] }) },
      ],
      {
        topCountry: epochMetrics.computeCloud.topCountry,
        topCountryShare: sv(epochMetrics.computeCloud.topCountryShare, {
          confidence: 'medium',
          asOf: epochMetrics.computeCloud.asOf,
          sources: [...epochMetrics.computeCloud.sources, SYNERGY_CLOUD],
          note: epochMetrics.computeCloud.note,
          rawClaim: epochMetrics.computeCloud.evidence?.rawClaim,
          extraction: epochMetrics.computeCloud.evidence?.extraction,
          caveat: epochMetrics.computeCloud.evidence?.caveat,
        }),
        substitutability: sv('months', {
          confidence: 'low',
          asOf: '2025',
          sources: [SYNERGY_CLOUD],
          note: 'Cloud capacity can shift regions over months; not a years-long physical replacement.',
        }),
        asOf: '2024-Q4',
        sources: [SYNERGY_CLOUD, EPOCH_GPU],
      },
    ),
  },
  dependsOn: ['ai-accelerators'],
});

export { criticalMaterials, euvLithography, chipDesignEda, leadingEdgeFab, hbm, advancedPackaging, aiAccelerators, computeCloud };
