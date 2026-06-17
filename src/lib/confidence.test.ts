import { describe, expect, it } from 'vitest';
import {
  CONFIDENCE_DEFINITIONS,
  renderConfidenceLegend,
  renderConfidenceTag,
} from '../lib/confidence';

describe('confidence helpers', () => {
  it('defines high, medium, and low with gloss and detail', () => {
    expect(CONFIDENCE_DEFINITIONS.map((d) => d.id)).toEqual(['high', 'medium', 'low']);
    for (const d of CONFIDENCE_DEFINITIONS) {
      expect(d.gloss.length).toBeGreaterThan(0);
      expect(d.detail.length).toBeGreaterThan(d.gloss.length);
    }
  });

  it('renders tags as hoverable buttons with tip text', () => {
    const tag = renderConfidenceTag('medium');
    expect(tag).toContain('<button type="button"');
    expect(tag).toContain('conf-tag--tip conf-medium');
    expect(tag).toContain('data-tip=');
    expect(tag).toContain('Medium confidence');
    expect(tag).toContain('partial coverage');
  });

  it('renders a visible legend with all three levels', () => {
    const legend = renderConfidenceLegend();
    expect(legend).toContain('confidence-legend');
    expect(legend).toContain('conf-high');
    expect(legend).toContain('conf-medium');
    expect(legend).toContain('conf-low');
    expect(legend).toContain('hover a tag');
    expect(legend).toContain('primary sources agree');
  });
});
