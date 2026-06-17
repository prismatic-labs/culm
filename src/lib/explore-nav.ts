import { escapeAttr, escapeHtml } from './escape-html';

export type ExplorePageId = 'stack' | 'materials' | 'compute' | 'controls' | 'seabed';

export interface PageMeta {
  id: ExplorePageId;
  segment: string;
  /** Short label in the Explore bar */
  navLabel: string;
  /** Browser tab title */
  documentTitle: string;
  /** Visible page heading */
  heading: string;
  /** One line under the heading */
  subtitle: string;
  /** AI safety throughline shown above the heading */
  kicker: string;
}

export const PAGE_META: Record<ExplorePageId, PageMeta> = {
  stack: {
    id: 'stack',
    segment: '',
    navLabel: 'Chokepoints',
    documentTitle: 'Culm: AI supply chain concentration map',
    heading: 'Chokepoints from materials to cloud',
    kicker: 'AI safety · concentration, fragility, and leverage in the physical stack',
    subtitle:
      'Eight layers from materials to cloud. Who holds each chokepoint, what breaks without it, and where a few hands can restrict frontier AI.',
  },
  materials: {
    id: 'materials',
    segment: 'materials/',
    navLabel: 'Physical inputs',
    documentTitle: 'Culm: What the AI stack is made of',
    heading: 'What the AI hardware stack is made of',
    kicker: 'Physical stack · the inputs beneath every control point',
    subtitle:
      'The machines, materials, and geography behind each layer, before you ask who controls them.',
  },
  compute: {
    id: 'compute',
    segment: 'compute/',
    navLabel: 'Compute & power',
    documentTitle: 'Culm: Who controls AI compute',
    heading: 'Who controls AI compute, and the power that runs it',
    kicker: 'Compute · where accelerator capacity concentrates',
    subtitle:
      'Accelerator concentration, where clusters sit, and the electricity now binding the stack.',
  },
  controls: {
    id: 'controls',
    segment: 'controls/',
    navLabel: 'Export controls',
    documentTitle: 'Culm: Export controls already pulled on the AI stack',
    heading: 'Export controls already pulled on the AI stack',
    kicker: 'Export controls · where concentration becomes policy leverage',
    subtitle:
      'Live measures by layer: who holds the lever, whom each control targets, and what it did.',
  },
  seabed: {
    id: 'seabed',
    segment: 'seabed/',
    navLabel: 'Seabed mining',
    documentTitle: 'Culm: Deep-sea mining and AI metals',
    heading: 'Deep-sea mining and the metals behind AI power',
    kicker: 'Seabed minerals · a supply question still being decided',
    subtitle:
      'Seven licensed or explored sites, the metals they target, and who may control them next.',
  },
};

const EXPLORE_ORDER: ExplorePageId[] = ['stack', 'controls', 'compute', 'materials', 'seabed'];

function hrefFor(meta: PageMeta, basePath: string): string {
  if (meta.id === 'stack') return basePath || './';
  return `${basePath}${meta.segment}`;
}

/** Horizontal nav shared across Culm pages. `basePath` is `` on the hub, `../` on subpages. */
export function renderExploreNav(current: ExplorePageId, basePath = ''): string {
  const links = EXPLORE_ORDER.map((id) => {
    const page = PAGE_META[id];
    const active = page.id === current;
    const href = hrefFor(page, basePath);
    if (active) {
      return `<span class="explore-link explore-link--active" aria-current="page" title="${escapeAttr(page.heading)}">${escapeHtml(page.navLabel)}</span>`;
    }
    return `<a class="explore-link" href="${escapeAttr(href)}" title="${escapeAttr(page.heading)}">${escapeHtml(page.navLabel)}</a>`;
  }).join('');

  return links;
}

export function renderDeeperBridge(basePath = ''): string {
  const controls = hrefFor(PAGE_META.controls, basePath);
  const compute = hrefFor(PAGE_META.compute, basePath);
  const seabed = hrefFor(PAGE_META.seabed, basePath);

  return `
    <p class="deeper-bridge">
      The map shows where concentration sits. Three companion pages go deeper on controls, compute, and seabed:
      <a class="deeper-bridge-link" href="${escapeAttr(controls)}">${escapeHtml(PAGE_META.controls.heading)}</a>;
      <a class="deeper-bridge-link" href="${escapeAttr(compute)}">${escapeHtml(PAGE_META.compute.heading)}</a>; and
      <a class="deeper-bridge-link" href="${escapeAttr(seabed)}">${escapeHtml(PAGE_META.seabed.heading)}</a>.
    </p>`;
}

export function mountExploreNav(
  el: HTMLElement | null,
  current: ExplorePageId,
  basePath = '',
): void {
  if (!el) return;
  el.innerHTML = renderExploreNav(current, basePath);
}

export function pageMeta(id: ExplorePageId): PageMeta {
  return PAGE_META[id];
}
