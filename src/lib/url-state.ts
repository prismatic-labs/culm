import type { CulmState, StackMode } from '../state';

const LAYER_IDS = new Set([
  'critical-materials',
  'euv-litho',
  'chip-design-eda',
  'leading-edge-fab',
  'hbm',
  'advanced-packaging',
  'ai-accelerators',
  'compute-cloud',
]);

export interface UrlStatePatch {
  stackMode?: StackMode;
  mode?: CulmState['mode'];
  selectedLayer?: string | null;
  selectedCountry?: string | null;
  shockTarget?: CulmState['shockTarget'];
}

export function parseUrlState(search: string): UrlStatePatch {
  const params = new URLSearchParams(search);
  const patch: UrlStatePatch = {};

  const stack = params.get('stack');
  if (stack === 'inspect' || stack === 'shock') patch.stackMode = stack;

  const mode = params.get('mode');
  if (mode === 'layer' || mode === 'country') patch.mode = mode;

  const layer = params.get('layer');
  if (layer && LAYER_IDS.has(layer)) {
    patch.selectedLayer = layer;
    patch.mode = 'layer';
  }

  const country = params.get('country');
  if (country) {
    patch.selectedCountry = country;
    patch.mode = 'country';
    patch.selectedLayer = null;
  }

  const shock = params.get('shock');
  if (shock?.startsWith('layer:')) {
    const id = shock.slice('layer:'.length);
    if (LAYER_IDS.has(id)) {
      patch.shockTarget = { kind: 'layer', id };
      patch.stackMode = patch.stackMode ?? 'shock';
    }
  } else if (shock?.startsWith('country:')) {
    patch.shockTarget = { kind: 'country', name: shock.slice('country:'.length) };
    patch.stackMode = patch.stackMode ?? 'shock';
  }

  return patch;
}

export function serializeUrlState(state: CulmState): string {
  const params = new URLSearchParams();
  if (state.stackMode !== 'inspect') params.set('stack', state.stackMode);

  if (state.stackMode === 'shock' && state.shockTarget) {
    params.set(
      'shock',
      state.shockTarget.kind === 'layer'
        ? `layer:${state.shockTarget.id}`
        : `country:${state.shockTarget.name}`,
    );
  }

  if (state.mode === 'country' && state.selectedCountry) {
    params.set('mode', 'country');
    params.set('country', state.selectedCountry);
  } else if (state.selectedLayer) {
    params.set('mode', 'layer');
    params.set('layer', state.selectedLayer);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function replaceUrlFromState(state: CulmState): void {
  const next = `${window.location.pathname}${serializeUrlState(state)}`;
  if (`${window.location.pathname}${window.location.search}` !== next) {
    window.history.replaceState(null, '', next);
  }
}
