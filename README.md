# Culm

Physical AI supply chain concentration map: a sourced, layer-by-layer measurement of how few actors and countries control each layer from materials to cloud.

**Live:** [prismatic-labs.github.io/culm/](https://prismatic-labs.github.io/culm/)

Winner of **Breaking Barriers to AI Safety** (LISA × BlueDot Impact, June 2026).

## Production

- **Deploy:** push to `main` runs tests, builds `dist/`, and publishes to GitHub Pages (see `.github/workflows/deploy.yml`).
- **Data refresh:** Epoch AI accelerator and cluster metrics refresh automatically on the 1st of each month (`.github/workflows/refresh-epoch.yml`). Manual refresh: `npm run refresh:all`.
- **Snapshot date:** `lastUpdated` follows `fetchedAt` in `src/data/auto/epoch-metrics.json` and appears in the hub footer and methodology block.
- **AI safety framing:** hub kicker + collapsible “Why this matters for AI safety” + About section; companion pages show evidence (controls, compute) without repeating the slogan.

## Seabed level (`/culm/seabed/`)

Deep-sea mining hotspots tagged with AI-relevant metals. Who, where, which metals, water depth, confidence-rated linkages. Copper is the spine. Dataset at `public/data/seabed-hotspots.json`.

## Stack

- Vite 7 + TypeScript (vanilla, no framework)
- Vitest for unit tests
- `d3-geo` + `world-atlas` for the geographic view
- Python refresh script for Epoch AI CSV/ZIP metrics

## Commands

```bash
npm install
npm run dev          # local viewer
npm run test         # vitest
npm run build        # tsc --noEmit && vite build
npm run refresh:apis # pull Epoch metrics into src/data/auto/epoch-metrics.json
npm run refresh:all  # refresh + test + rebuild concentration.json
```

## Data schema

### Snapshot files

- **`public/data/concentration.json`** — canonical semver snapshot (emitted at dev/build).
- **`public/data/schema.json`** — JSON Schema v1.1.0.
- **`public/data/CHANGELOG.md`** — dataset changelog.

### `SourcedValue<T>`

Every displayed number carries provenance:

```typescript
interface SourcedValue<T> {
  value: T;
  confidence: 'high' | 'medium' | 'low';
  asOf: string;       // period label, e.g. "2024" or "2025-Q4"
  sources: string[];   // http(s) URLs; empty => tagged "unverified" in UI
  note?: string;
  rawClaim?: string;   // what the source states
  extraction?: string; // how the value was derived
  caveat?: string;     // coverage limits
}
```

### `Layer`

Eight stack layers (`stackOrder` 1–8). Each has actors, concentration metrics, dependency edges (`dependsOn`), and a **computed** `isCriticalChokepoint` flag (never hand-set).

```typescript
interface DominantCountry {
  country: string;
  share: SourcedValue<number>;
}

metrics: {
  cr1, cr3, hhi: SourcedValue<number>;
  topCountry: string;              // headline plurality geography
  topCountryShare: SourcedValue<number>;
  dominantCountries: DominantCountry[];  // all map-visible geographies
  substitutability: SourcedValue<Substitutability>;
}
```

`dominantCountries` lets composite layers (e.g. critical materials: gallium in China, photoresists in Japan) appear on the map without splitting the stack.

Optional `subcomponents[]` on a layer models recursive sub-supplier dependencies (EUV pilot: ASML → Zeiss optics).

### Shock mode

Toggle **Inspect** / **Shock** in the header. In Shock mode, selecting a layer or country runs `analyzeCascade` over `dependsOn` edges and shows impacted downstream layers plus a transparent frontier-compute proxy (accelerator CR1 × compute geography when both are in the cascade). Share views via URL: `?stack=shock&shock=layer:euv-litho`.

### Chokepoint rule

Computed in `src/lib/chokepoint.ts` via `layerFromMetrics` → `evaluateChokepoint`:

> (CR1 ≥ 80% **or** top-country share ≥ 80% **or** any dominant-country share ≥ 80%) **and** substitutability ∈ {years, years-to-decades}

## Sourcing and unverified tags

- Values with at least one `sources` URL render as **sourced** with a confidence label.
- Values with `sources: []` render as **unverified** until a URL is attached.
- Epoch-derived headline numbers live in `src/data/auto/epoch-metrics.json`, committed after `npm run refresh:apis`.

### Snapshot policy

1. Run `npm run refresh:apis` when Epoch publishes new CSVs (or wait for the monthly GitHub Action).
2. Review the diff to `epoch-metrics.json`.
3. Run `npm run test && npm run build` to regenerate `public/data/concentration.json`.
4. Commit the snapshot with the rest of the dataset changes.
5. The refresh script validates shares, totals, and writes atomically; it exits non-zero on failure.

`lastUpdated` in the dataset is derived from `epoch-metrics.json` → `fetchedAt`.

## Acknowledgements

Built for and winner of the hackathon **Breaking Barriers to AI Safety**, hosted by LISA x BlueDot Impact (June 2026).

## License

Apache-2.0
