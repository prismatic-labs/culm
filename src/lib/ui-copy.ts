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

const COUNTRIES_WITH_ARTICLE = new Set(['United States', 'Netherlands', 'United Kingdom']);

/** Prepend "the" for country names that read as proper plurals/unions. */
export function withArticle(country: string): string {
  return COUNTRIES_WITH_ARTICLE.has(country) ? `the ${country}` : country;
}

export function interactHintWhatIfIdle(): string {
  return `<strong>${COPY.modeWhatIf}</strong> Tap a layer in the picker, stack rail, or map to simulate removing it. Impact appears in the panel below the map.`;
}

export function interactHintWhatIfActive(sourceLabel: string): string {
  return `<strong>${COPY.modeWhatIf}</strong> Simulating removal of <strong>${sourceLabel}</strong>. Use the picker or stack to try another layer, or reset the simulation.`;
}
