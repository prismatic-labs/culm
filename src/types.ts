export type Confidence = 'high' | 'medium' | 'low';
export type Substitutability = 'fungible' | 'months' | 'years' | 'years-to-decades';

/** Provenance pipeline fields for the evidence drawer. */
export interface EvidenceFields {
  /** What the source literally states or what we observe in raw data. */
  rawClaim?: string;
  /** How we derived the displayed value from the raw claim. */
  extraction?: string;
  /** Limits, coverage gaps, or interpretation warnings. */
  caveat?: string;
}

export interface SourcedValue<T> extends EvidenceFields {
  value: T;
  confidence: Confidence;
  asOf: string;
  sources: string[];
  note?: string;
}

export interface Actor {
  name: string;
  country: string;
  share: SourcedValue<number>;
}

export interface DominantCountry {
  country: string;
  share: SourcedValue<number>;
}

/** Nested supplier / input within a stack layer (recursive chokepoint pilot). */
export interface SubComponent {
  id: string;
  name: string;
  country: string;
  /** Parent sub-component id within this layer, if nested. */
  parentId?: string;
  share: SourcedValue<number>;
  note?: string;
}

export interface Layer {
  id: string;
  name: string;
  stackOrder: number;
  category:
    | 'Materials'
    | 'Equipment'
    | 'Design/EDA'
    | 'Fabrication'
    | 'Memory'
    | 'Packaging'
    | 'Accelerators'
    | 'Compute/Cloud'
    | 'Models';
  whatItIs: string;
  whyItMatters: string;
  /** What stops working across the stack when this layer becomes unavailable. Used in shock mode. */
  stallEffect?: string;
  actors: Actor[];
  metrics: {
    cr1: SourcedValue<number>;
    cr3: SourcedValue<number>;
    hhi: SourcedValue<number>;
    topCountry: string;
    topCountryShare: SourcedValue<number>;
    /** Every country with meaningful geographic share in this layer (map + aggregates). */
    dominantCountries: DominantCountry[];
    substitutability: SourcedValue<Substitutability>;
  };
  dependsOn: string[];
  /** Optional sub-supplier graph for recursive dependency analysis. */
  subcomponents?: SubComponent[];
  isCriticalChokepoint: boolean;
  chokepointRationale: string;
}

export interface ConcentrationMap {
  /** Semver for the dataset snapshot (not the app). */
  datasetVersion: string;
  /** JSON schema version for concentration.json consumers. */
  schemaVersion: string;
  /** Suggested citation string for researchers. */
  citation: string;
  /** Zenodo DOI when published; empty until archived. */
  doi?: string;
  layers: Layer[];
  methodology: string;
  lastUpdated: string;
}
