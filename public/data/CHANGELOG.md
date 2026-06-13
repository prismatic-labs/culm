# Culm Dataset Changelog

## 1.0.0 — 2026-06-13

### Added
- Semver dataset versioning (`datasetVersion` 1.0.0, `schemaVersion` 1.1.0).
- Canonical `concentration.json` export with citation string and build-time snapshot.
- Evidence pipeline fields on sourced values: `rawClaim`, `extraction`, `caveat`.
- Epoch AI refresh metadata for accelerator and compute-cloud metrics.
- EUV recursive sub-supplier pilot (`subcomponents`: ASML → Zeiss optics, EUV source).
- Metric history snapshots for trend indicators on Epoch-backed layers.
- Shock mode: cascade analysis with frontier compute proxy (accelerator CR1 × compute geography).
- Shareable URL state (`?stack=shock&shock=layer:euv-litho`, etc.).

### Changed
- CSV export adds `raw_claim`, `extraction`, and `caveat` columns.
- Source links prefer human-readable pages over raw ZIP/CSV downloads.
