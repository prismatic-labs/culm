import { activeShockTarget, getState, type CulmState } from '../state';

export function updatePageMeta(
  state: CulmState,
  layers: { id: string; name: string }[],
): void {
  let title = 'Culm: AI Stack Concentration Map';
  let description =
    'Eight physical layers sit between raw materials and cloud AI. Culm shows who controls each one, and what breaks if you remove it.';

  const shock = activeShockTarget();

  if (shock?.kind === 'layer') {
    const layer = layers.find((l) => l.id === shock.id);
    const label = layer?.name.split('(')[0].trim() ?? shock.id;
    title = `Culm · What if? · ${label}`;
    description = `Simulate removing ${label} and trace what stalls downstream.`;
  } else if (shock?.kind === 'country') {
    title = `Culm · What if? · ${shock.name}`;
    description = `Simulate removing all layers held in ${shock.name} and trace what stalls downstream.`;
  } else if (state.mode === 'country' && state.selectedCountry) {
    title = `Culm: ${state.selectedCountry}`;
    description = `Concentration of AI stack layers attributed to ${state.selectedCountry}.`;
  } else if (state.selectedLayer) {
    const layer = layers.find((l) => l.id === state.selectedLayer);
    if (layer) {
      title = `Culm: ${layer.name.split('(')[0].trim()}`;
      description = layer.name;
    }
  }

  document.title = title;
  setMeta('description', description);
  setMeta('og:title', title, 'property');
  setMeta('og:description', description, 'property');
}

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name'): void {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}
