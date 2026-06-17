import {
  ISA_EXPLORATION_SUMMARY,
  METAL_PROFILES,
  SEABED_HOTSPOTS,
  STATE_OF_PLAY,
} from '../data/seabed';
import { DATASET_LAST_UPDATED } from './dataset-meta';

export function buildSeabedDatasetSnapshot() {
  return {
    version: '1.0.0',
    schema: '1.0.0',
    lastUpdated: DATASET_LAST_UPDATED,
    exportedAt: new Date().toISOString(),
    license: 'Apache-2.0',
    hotspots: SEABED_HOTSPOTS,
    metals: METAL_PROFILES,
    isaExploration: ISA_EXPLORATION_SUMMARY,
    stateOfPlay: STATE_OF_PLAY,
  };
}
