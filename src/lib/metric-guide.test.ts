import { describe, expect, it } from 'vitest';
import { sourceCitation } from './metric-guide';
import { DATA_ENDPOINTS } from './data-sources';
import { concentrationMap } from '../data/concentration-map';
import * as seabed from '../data/seabed';
import * as controls from '../data/controls';
import * as compute from '../data/compute';

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
    // Walk the data modules whole rather than naming the arrays to check. An
    // earlier version of this test listed DATA_ENDPOINTS and the layer metrics,
    // then METAL_PROFILES and LEVERAGE_MEASURES, and still missed
    // SEABED_HOTSPOTS, where rnz.co.nz and sbma.gov.ck were rendering as bare
    // hostnames. A hand-maintained list of places to look drifts; this does not.
    const urls = new Set<string>(DATA_ENDPOINTS.map((e) => e.url));
    const collect = (node: unknown) => {
      if (typeof node === 'string') {
        if (/^https?:\/\//.test(node)) urls.add(node);
      } else if (Array.isArray(node)) {
        node.forEach(collect);
      } else if (node && typeof node === 'object') {
        Object.values(node).forEach(collect);
      }
    };
    collect(concentrationMap);
    collect(seabed);
    collect(controls);
    collect(compute);
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
