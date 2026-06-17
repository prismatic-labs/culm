import { describe, expect, it } from 'vitest';
import { renderDeeperBridge, renderExploreNav } from './explore-nav';

describe('explore nav', () => {
  it('orders nav for the demo path (controls before compute)', () => {
    const nav = renderExploreNav('stack', '');
    expect(nav.indexOf('Export controls')).toBeLessThan(nav.indexOf('Compute &amp; power'));
  });

  it('marks the current page and links siblings from the hub', () => {
    const nav = renderExploreNav('compute', '');
    expect(nav).toContain('aria-current="page"');
    expect(nav).toContain('>Compute &amp; power<');
    expect(nav).toContain('href="controls/"');
    expect(nav).not.toContain('href="../"');
  });

  it('uses parent paths from subpages', () => {
    const nav = renderExploreNav('controls', '../');
    expect(nav).toContain('href="../compute/"');
    expect(nav).toContain('href="../"');
    expect(nav).toContain('aria-current="page"');
  });

  it('renders a three-link deeper bridge', () => {
    const bridge = renderDeeperBridge('');
    expect(bridge).toContain('Export controls already pulled');
    expect(bridge).toContain('Who controls AI compute');
    expect(bridge).toContain('Deep-sea mining');
  });
});
