/** Which spec-listed sources expose machine-readable access (verified 2026-06-13). */

export interface DataEndpoint {
  id: string;
  provider: string;
  layerIds: string[];
  kind: 'csv' | 'zip' | 'json' | 'pdf' | 'report' | 'airtable';
  url: string;
  license: string;
  notes: string;
}

export const DATA_ENDPOINTS: DataEndpoint[] = [
  {
    id: 'epoch-ai-chip-sales',
    provider: 'Epoch AI',
    layerIds: ['ai-accelerators'],
    kind: 'zip',
    url: 'https://epoch.ai/data/ai_chip_sales.zip',
    license: 'CC-BY',
    notes:
      'No REST API. Stable ZIP with cumulative_timelines_by_designer.csv. Used for designer compute-share (H100e).',
  },
  {
    id: 'epoch-gpu-clusters',
    provider: 'Epoch AI',
    layerIds: ['compute-cloud'],
    kind: 'csv',
    url: 'https://epoch.ai/data/gpu_clusters.csv',
    license: 'CC-BY',
    notes: 'No REST API. CSV of GPU clusters. Used for US performance share among tracked clusters.',
  },
  {
    id: 'epoch-ai-chip-components',
    provider: 'Epoch AI',
    layerIds: ['advanced-packaging', 'hbm'],
    kind: 'zip',
    url: 'https://epoch.ai/data/ai_chip_components.zip',
    license: 'CC-BY',
    notes:
      'CoWoS/HBM consumption vs supply denominators. Useful for packaging/HBM pressure; not yet wired into Culm metrics.',
  },
  {
    id: 'epoch-ai-chip-owners',
    provider: 'Epoch AI',
    layerIds: ['compute-cloud', 'ai-accelerators'],
    kind: 'zip',
    url: 'https://epoch.ai/data/ai_chip_owners.zip',
    license: 'CC-BY',
    notes: 'Owner-level compute distribution. Download only.',
  },
  {
    id: 'epoch-gpu-clusters-zip',
    provider: 'Epoch AI',
    layerIds: ['compute-cloud'],
    kind: 'zip',
    url: 'https://epoch.ai/data/gpu_clusters.zip',
    license: 'CC-BY',
    notes: 'Full GPU clusters dataset archive.',
  },
  {
    id: 'epoch-python-airtable',
    provider: 'Epoch AI',
    layerIds: [],
    kind: 'airtable',
    url: 'https://github.com/epoch-research/epochai-python',
    license: 'CC-BY',
    notes:
      'Python client for ML-models Airtable base only. Requires copying the base and a personal access token. Not used for chip sales.',
  },
  {
    id: 'usgs-mcs-gallium-pdf',
    provider: 'USGS',
    layerIds: ['critical-materials'],
    kind: 'pdf',
    url: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-gallium.pdf',
    license: 'Public domain',
    notes: 'Primary gallium production statistics. No REST API; PDF + ScienceBase CSV data release (DOI 10.5066/P13XCP3R).',
  },
  {
    id: 'usgs-mcs-data-release',
    provider: 'USGS',
    layerIds: ['critical-materials'],
    kind: 'json',
    url: 'https://www.usgs.gov/data/us-geological-survey-mineral-commodity-summaries-2025-data-release',
    license: 'CC0',
    notes: 'Structured CSV tables via ScienceBase download. Catalog JSON API exists but item URLs are not stable REST endpoints.',
  },
  {
    id: 'trendforce-eda',
    provider: 'TrendForce',
    layerIds: ['chip-design-eda'],
    kind: 'report',
    url: 'https://www.trendforce.com/news/2025/06/02/news-china-revenue-at-risk-as-u-s-curbs-slam-eda-giants-impact-on-synopsys-cadence-and-more/',
    license: 'Third-party press / analyst',
    notes: '2024 EDA revenue shares: Synopsys 31%, Cadence 30%, Siemens EDA 13%. No public API.',
  },
  {
    id: 'trendforce-hbm',
    provider: 'TrendForce',
    layerIds: ['hbm'],
    kind: 'report',
    url: 'https://www.trendforce.com/news/2024/04/24/news-amid-foundry-overcapacity-competition-for-hbm-intensifies-rapidly/',
    license: 'Third-party press / analyst',
    notes: '2024 HBM share forecast: SK hynix 52.5%, Samsung 42.4%, Micron ~5%. No public API.',
  },
  {
    id: 'trendforce-tsmc-advanced',
    provider: 'TrendForce',
    layerIds: ['leading-edge-fab'],
    kind: 'report',
    url: 'https://www.trendforce.com/news/2024/04/08/news-tsmcs-advanced-processes-remain-resilient-amid-challenges/',
    license: 'Third-party press / analyst',
    notes: 'TSMC ~70-80% at 5nm, >90% at 3nm. No public API.',
  },
  {
    id: 'synergy-cloud-q4-2024',
    provider: 'Synergy Research Group',
    layerIds: ['compute-cloud'],
    kind: 'report',
    url: 'https://www.srgresearch.com/articles/cloud-market-jumped-to-330-billion-in-2024-genai-is-now-driving-half-of-the-growth',
    license: 'Third-party analyst',
    notes: 'Q4 2024 IaaS/PaaS share: AWS 30%, Microsoft 21%, Google 12%. No public API.',
  },
  {
    id: 'asml-euv',
    provider: 'ASML',
    layerIds: ['euv-litho'],
    kind: 'report',
    url: 'https://www.asml.com/en/products/euv-lithography-systems',
    license: 'Company disclosure',
    notes: 'Sole commercial EUV lithography supplier. No market-share API.',
  },
  {
    id: 'brookings-japan-materials',
    provider: 'Brookings Institution',
    layerIds: ['critical-materials'],
    kind: 'report',
    url: 'https://www.brookings.edu/articles/the-renaissance-of-the-japanese-semiconductor-industry/',
    license: 'Third-party analysis',
    notes: 'Japan ~50% photoresist, ~53% silicon wafer global share (equipment/materials segments).',
  },
];

export const API_SUMMARY = `Machine-readable today: Epoch AI CSV/ZIP downloads (CC-BY) for accelerator compute share and GPU-cluster geography. USGS MCS: PDF + CSV data release, no REST API. TrendForce, Synergy, ASML, company filings: manual citation only. No public APIs.`;
