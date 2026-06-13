import { describe, expect, it } from 'vitest';
import { isDirectDownloadUrl, renderSourceLinksHtml } from './source-links';

describe('isDirectDownloadUrl', () => {
  it('flags dataset file extensions', () => {
    expect(isDirectDownloadUrl('https://epoch.ai/data/ai_chip_sales.zip')).toBe(true);
    expect(isDirectDownloadUrl('https://epoch.ai/data/gpu_clusters.csv')).toBe(true);
  });

  it('does not flag normal pages or PDFs', () => {
    expect(isDirectDownloadUrl('https://epoch.ai/data/ai-chip-sales')).toBe(false);
    expect(isDirectDownloadUrl('https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-gallium.pdf')).toBe(
      false,
    );
  });
});

describe('renderSourceLinksHtml', () => {
  it('links to the human page first and labels downloads explicitly', () => {
    const html = renderSourceLinksHtml(
      [
        'https://epoch.ai/data/ai_chip_sales.zip',
        'https://epoch.ai/data/ai-chip-sales',
      ],
      '2025-Q4',
    );

    expect(html).toContain('href="https://epoch.ai/data/ai-chip-sales"');
    expect(html).toContain('class="source-page"');
    expect(html).toContain('Epoch AI: AI chip sales');
    expect(html).toContain('href="https://epoch.ai/data/ai_chip_sales.zip"');
    expect(html).toContain('class="source-download"');
    expect(html).toContain('Download ZIP');
    expect(html).not.toMatch(/href="https:\/\/epoch\.ai\/data\/ai_chip_sales\.zip"[^>]*>epoch\.ai/);
  });

  it('maps CSV-only Epoch sources to their publication page', () => {
    const html = renderSourceLinksHtml(['https://epoch.ai/data/gpu_clusters.csv'], '2025-05');

    expect(html).toContain('href="https://epoch.ai/publications/trends-in-ai-supercomputers"');
    expect(html).toContain('class="source-page"');
    expect(html).toContain('Download CSV');
  });
});
