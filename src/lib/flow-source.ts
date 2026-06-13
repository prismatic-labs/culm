import type { Layer } from '../types';
import { layerHeldInCountry } from './layer-countries';
import type { CulmState } from '../state';

export function flowSourceLayer(state: CulmState, layers: Layer[]): Layer | null {
  if (state.mode === 'layer' && state.selectedLayer) {
    return layers.find((l) => l.id === state.selectedLayer) ?? null;
  }

  if (state.mode === 'country' && state.selectedCountry) {
    const held = layers.filter((layer) => layerHeldInCountry(layer, state.selectedCountry!));
    if (!held.length) return null;
    return held.sort((a, b) => a.stackOrder - b.stackOrder)[0] ?? null;
  }

  return null;
}
