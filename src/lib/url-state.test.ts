import { describe, expect, it } from 'vitest';
import { parseUrlState, serializeUrlState } from './url-state';
import type { CulmState } from '../state';

describe('url-state', () => {
  it('parses layer, country, shock, and stack mode from query string', () => {
    const patch = parseUrlState('?stack=shock&shock=layer:euv-litho&mode=layer&layer=euv-litho');
    expect(patch.stackMode).toBe('shock');
    expect(patch.selectedLayer).toBe('euv-litho');
    expect(patch.shockTarget).toEqual({ kind: 'layer', id: 'euv-litho' });
  });

  it('round-trips state through serialize', () => {
    const state: CulmState = {
      stackMode: 'shock',
      mode: 'layer',
      selectedLayer: 'euv-litho',
      selectedCountry: 'Netherlands',
      shockTarget: { kind: 'layer', id: 'euv-litho' },
    };
    const qs = serializeUrlState(state);
    expect(qs).toContain('stack=shock');
    expect(qs).toContain('layer=euv-litho');
    expect(qs).toContain('shock=layer%3Aeuv-litho');
  });
});
