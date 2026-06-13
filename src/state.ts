export type ViewMode = 'layer' | 'country';
export type StackMode = 'inspect' | 'shock';

export type ShockTarget =
  | { kind: 'layer'; id: string }
  | { kind: 'country'; name: string };

export interface CulmState {
  stackMode: StackMode;
  mode: ViewMode;
  selectedLayer: string | null;
  selectedCountry: string | null;
  shockTarget: ShockTarget | null;
}

let state: CulmState = {
  stackMode: 'inspect',
  mode: 'layer',
  selectedLayer: null,
  selectedCountry: null,
  shockTarget: null,
};

const listeners = new Set<() => void>();

export function getState(): Readonly<CulmState> {
  return state;
}

/** Shock cascade is active only in Shock mode with a target set. */
export function activeShockTarget(): ShockTarget | null {
  return state.stackMode === 'shock' ? state.shockTarget : null;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function patchState(patch: Partial<CulmState>): void {
  state = { ...state, ...patch };
  notify();
}

export function setStackMode(mode: StackMode): void {
  if (state.stackMode === mode) return;

  let shockTarget = mode === 'inspect' ? null : state.shockTarget;
  if (mode === 'shock' && !shockTarget && state.selectedLayer) {
    shockTarget = { kind: 'layer', id: state.selectedLayer };
  }

  state = {
    ...state,
    stackMode: mode,
    shockTarget,
  };
  notify();
}

export function setLayer(id: string | null, topCountry: string | null = null): void {
  const shockTarget =
    id && state.stackMode === 'shock' ? ({ kind: 'layer', id } as const) : state.shockTarget;

  state = {
    ...state,
    mode: 'layer',
    selectedLayer: id,
    selectedCountry: null,
    shockTarget,
  };
  notify();
}

export function toggleLayer(id: string, topCountry: string): void {
  if (state.mode === 'layer' && state.selectedLayer === id && state.stackMode === 'inspect') {
    setLayer(null);
    return;
  }
  setLayer(id, topCountry);
}

export function setCountry(name: string | null): void {
  if (state.mode === 'country' && state.selectedCountry === name && state.stackMode === 'inspect') {
    state = { ...state, mode: 'layer', selectedLayer: null, selectedCountry: null };
    notify();
    return;
  }

  const shockTarget =
    name && state.stackMode === 'shock' ? ({ kind: 'country', name } as const) : state.shockTarget;

  state = {
    ...state,
    mode: 'country',
    selectedLayer: null,
    selectedCountry: name,
    shockTarget,
  };
  notify();
}

export function setLayerShock(id: string | null, topCountry: string | null = null): void {
  state = {
    ...state,
    stackMode: id ? 'shock' : state.stackMode,
    shockTarget: id ? { kind: 'layer', id } : null,
    mode: 'layer',
    selectedLayer: id,
    selectedCountry: null,
  };
  notify();
}

export function setCountryShock(name: string | null): void {
  state = {
    ...state,
    stackMode: name ? 'shock' : state.stackMode,
    shockTarget: name ? { kind: 'country', name } : null,
    mode: name ? 'country' : state.mode,
    selectedLayer: null,
    selectedCountry: name,
  };
  notify();
}

export function clearShock(): void {
  if (!state.shockTarget) return;
  state = { ...state, shockTarget: null };
  notify();
}
