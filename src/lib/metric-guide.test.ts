import { describe, expect, it } from 'vitest';
import { sourceCitation } from './metric-guide';
import { DATA_ENDPOINTS } from './data-sources';
import { concentrationMap } from '../data/concentration-map';
import { METAL_PROFILES } from '../data/seabed';
import { LEVERAGE_MEASURES } from '../data/controls';

/**
 * SOURCE_ORG is keyed on the hostname after "www." is stripped. When a key kept
 * its "www." prefix the lookup missed silently and the citation rendered a bare
 * hostname ("brookings.edu") instead of the publisher ("Brookings Institution").
 * These tests drive the lookup from the real data so that cannot recur.
 */
function hostOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

describe('sourceCitation', () => {
  it('names the publisher rather than echoing the hostname', () => {
    expect(sourceCitation('https://www.brookings.edu/articles/x', '2024')).toBe(
      'Source: Brookings Institution, data as of 2024',
    );
    expect(sourceCitation('https://www.ft.com/june-yoon', '2026')).toContain('Financial Times');
    expect(sourceCitation('https://epoch.ai/data/ai-chip-sales', '2026')).toContain('Epoch AI');
  });

  it('has a publisher name for every host the data actually cites', () => {
    const urls = new Set<string>(DATA_ENDPOINTS.map((e) => e.url));
    for (const layer of concentrationMap.layers) {
      for (const m of Object.values(layer.metrics)) {
        for (const u of (m as { sources?: string[] })?.sources ?? []) urls.add(u);
      }
    }
    // Seabed and controls cite their own sources. Leaving them out is how
    // rnz.co.nz, sbma.gov.ck and congress.gov rendered as bare hostnames.
    for (const metal of METAL_PROFILES) for (const s of metal.sources) urls.add(s.url);
    for (const measure of LEVERAGE_MEASURES) for (const s of measure.sources) urls.add(s.url);
    const unnamed = [...urls].filter((u) => sourceCitation(u, '2026').includes(hostOf(u)));
    expect(unnamed).toEqual([]);
  });

  it('falls back to the bare host for an unknown publisher instead of throwing', () => {
    expect(sourceCitation('https://example.invalid/x', '2026')).toBe(
      'Source: example.invalid, data as of 2026',
    );
    expect(() => sourceCitation('not a url', '2026')).not.toThrow();
  });
});
