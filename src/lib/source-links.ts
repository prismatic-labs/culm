import { escapeAttr, escapeHtml, isSafeHttpUrl } from './escape-html';
import { sourceCitation } from './metric-guide';

/** Stable dataset URLs used in refresh scripts, mapped to a human-readable page when we have one. */
const DATA_URL_TO_PAGE: Record<string, string> = {
  'https://epoch.ai/data/ai_chip_sales.zip': 'https://epoch.ai/data/ai-chip-sales',
  'https://epoch.ai/data/gpu_clusters.csv': 'https://epoch.ai/publications/trends-in-ai-supercomputers',
  'https://epoch.ai/data/gpu_clusters.zip': 'https://epoch.ai/publications/trends-in-ai-supercomputers',
  'https://epoch.ai/data/ai_chip_components.zip': 'https://epoch.ai/data/ai-chip-sales',
  'https://epoch.ai/data/ai_chip_owners.zip': 'https://epoch.ai/data/ai-chip-sales',
};

const LINK_LABELS: Record<string, string> = {
  'https://epoch.ai/data/ai-chip-sales': 'Epoch AI: AI chip sales',
  'https://epoch.ai/data-insights/ai-chip-production': 'Epoch AI: AI chip production',
  'https://epoch.ai/publications/trends-in-ai-supercomputers': 'Epoch AI: GPU supercomputers',
  'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-gallium.pdf': 'USGS: gallium commodity summary',
  'https://www.usgs.gov/data/us-geological-survey-mineral-commodity-summaries-2025-data-release':
    'USGS: MCS 2025 data release',
  'https://www.brookings.edu/articles/the-renaissance-of-the-japanese-semiconductor-industry/':
    'Brookings: Japanese semiconductor materials',
  'https://www.asml.com/en/products/euv-lithography-systems': 'ASML: EUV lithography',
  'https://www.srgresearch.com/articles/cloud-market-jumped-to-330-billion-in-2024-genai-is-now-driving-half-of-the-growth':
    'Synergy Research: cloud market share',
};

export function isDirectDownloadUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\.(zip|csv|tsv|xlsx|xls|json|xml)$/.test(path);
  } catch {
    return false;
  }
}

function hostKey(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function linkLabel(url: string): string {
  if (LINK_LABELS[url]) return LINK_LABELS[url]!;

  try {
    const parsed = new URL(url);
    if (isDirectDownloadUrl(url)) {
      const ext = parsed.pathname.split('.').pop()?.toUpperCase() ?? 'file';
      return `Download ${ext}`;
    }
    const slug = parsed.pathname.split('/').filter(Boolean).pop();
    if (slug) return slug.replace(/[-_]/g, ' ');
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function sourceAnchor(url: string, className = ''): string {
  const cls = className ? ` class="${className}"` : '';
  return `<a href="${escapeAttr(url)}"${cls} target="_blank" rel="noopener noreferrer">${escapeHtml(linkLabel(url))}</a>`;
}

interface SourceGroup {
  host: string;
  browse: string[];
  downloads: string[];
}

function organizeSourceUrls(urls: string[]): SourceGroup[] {
  const groups = new Map<string, SourceGroup>();

  for (const url of urls) {
    if (!isSafeHttpUrl(url)) continue;
    const host = hostKey(url);
    const group = groups.get(host) ?? { host, browse: [], downloads: [] };

    if (isDirectDownloadUrl(url)) {
      if (!group.downloads.includes(url)) group.downloads.push(url);
      const page = DATA_URL_TO_PAGE[url];
      if (page && !group.browse.includes(page)) group.browse.push(page);
    } else if (!group.browse.includes(url)) {
      group.browse.push(url);
    }

    groups.set(host, group);
  }

  return [...groups.values()];
}

export function renderSourceLinksHtml(urls: string[], asOf: string): string {
  const groups = organizeSourceUrls(urls);
  if (!groups.length) {
    const unsafe = urls.filter((url) => url && !isSafeHttpUrl(url));
    if (unsafe.length) {
      return `<ul class="source-list">${unsafe.map((url) => `<li>${escapeHtml(url)}</li>`).join('')}</ul>`;
    }
    return '<p class="note">No source URLs attached yet.</p>';
  }

  return `<ul class="source-list">${groups
    .map((group) => {
      const primary = group.browse[0];
      const citeUrl = primary ?? group.downloads[0]!;
      const cite = escapeHtml(sourceCitation(citeUrl, asOf));

      const actions: string[] = [];
      if (primary) actions.push(sourceAnchor(primary, 'source-page'));
      for (const download of group.downloads) {
        actions.push(sourceAnchor(download, 'source-download'));
      }

      return `<li><span class="source-cite">${cite}</span><span class="source-actions">${actions.join('<span class="source-sep"> · </span>')}</span></li>`;
    })
    .join('')}</ul>`;
}
