/** Shared user-facing labels for Inspect vs What if? simulation mode. */
export const COPY = {
  modeInspect: 'Inspect',
  modeWhatIf: 'What if?',
  modeInspectHint: 'Inspect · concentration',
  modeWhatIfHint: 'What if? · simulate removal',
  resetSimulation: 'Reset simulation',
  simulateLayer: 'What if this layer vanished?',
  simulateLayerHint: 'Switches to What if? and traces what stalls downstream',
  simulateCountry: 'What if this country went offline?',
  simulateCountryHint: 'Switches to What if? and removes every layer it holds, then traces what stalls downstream',
  stackTapRemove: 'Stack · tap a layer to remove it',
  stackDefault: 'Stack',
} as const;

export function interactHintInspect(): string {
  return `Explore each layer in the stack, or switch to <strong>${COPY.modeWhatIf}</strong> to simulate removal.`;
}

export function interactHintWhatIfIdle(): string {
  return `<strong>${COPY.modeWhatIf}</strong> Tap a layer in the picker, stack rail, or map to simulate removing it. Impact appears in the panel below the map.`;
}

export function interactHintWhatIfActive(sourceLabel: string): string {
  return `<strong>${COPY.modeWhatIf}</strong> Simulating removal of <strong>${sourceLabel}</strong>. Use the picker or stack to try another layer, or reset the simulation.`;
}
