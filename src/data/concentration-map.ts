import type { ConcentrationMap } from '../types';
import { CHOKEPOINT_RULE } from '../lib/chokepoint';
import { API_SUMMARY } from '../lib/data-sources';
import {
  advancedPackaging,
  aiAccelerators,
  chipDesignEda,
  computeCloud,
  criticalMaterials,
  euvLithography,
  hbm,
  leadingEdgeFab,
} from './layers';

export const concentrationMap: ConcentrationMap = {
  datasetVersion: '1.0.0',
  schemaVersion: '1.1.0',
  citation:
    'Prismatic Labs (2026). Culm AI Stack Concentration Map v1.0.0. Dataset snapshot culm-concentration-2026-06-13.json.',
  layers: [
    criticalMaterials,
    euvLithography,
    chipDesignEda,
    leadingEdgeFab,
    hbm,
    advancedPackaging,
    aiAccelerators,
    computeCloud,
  ],
  methodology: [
    'Culm measures concentration at each physical layer of the AI stack using separate, auditable metrics. No blended fragility score.',
    '',
    'CR1: share held by the single largest actor (0 to 1).',
    'CR3: combined share of the top three actors (0 to 1).',
    'HHI: Herfindahl-Hirschman Index. Sum of squared percentage shares (0 to 10,000; >2,500 = highly concentrated).',
    'Top-country share: geographic concentration of the dominant country.',
    'Substitutability: fungible | months | years | years-to-decades.',
    '',
    `Critical chokepoint rule: ${CHOKEPOINT_RULE}`,
    '',
    'Every value carries confidence, as-of date, and source URLs. Empty sources are shown as unverified.',
    '',
    `Data APIs: ${API_SUMMARY}`,
    '',
    'Refresh API-derived fields: npm run refresh:apis',
  ].join('\n'),
  lastUpdated: '2026-06-13',
};
