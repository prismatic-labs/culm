import { geoEqualEarth, geoPath } from 'd3-geo';
import type { FeatureCollection } from 'geojson';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import countries110m from 'world-atlas/countries-110m.json';
import { METAL_SYMBOL_TO_ID, SEABED_HOTSPOTS, type SeabedHotspot } from '../data/seabed';
import { renderConfidenceTag } from '../lib/confidence';
import { escapeAttr, escapeHtml } from '../lib/escape-html';
import { formatDepthRange, formatDepositType } from '../lib/seabed-depth';

const MAP_WIDTH = 960;
const MAP_HEIGHT = 520;
const MAP_PAD = { top: 36, right: 24, bottom: 16, left: 108 };

const JURISDICTION = {
  isa: {
    label: 'ISA contract area',
    explain:
      'Exploration licence from the International Seabed Authority for seabed beyond any country\'s 200-mile zone.',
  },
  eez: {
    label: 'National EEZ',
    explain:
      'Licence or project inside a coastal state\'s exclusive economic zone (within 200 nautical miles).',
  },
} as const;

function jurisdictionCopy(jurisdiction: SeabedHotspot['jurisdiction']) {
  return JURISDICTION[jurisdiction];
}

function labelPlacement(x: number): { anchor: string; dx: number } {
  if (x < MAP_PAD.left + 52) return { anchor: 'start', dx: 10 };
  if (x > MAP_WIDTH - MAP_PAD.right - 52) return { anchor: 'end', dx: -10 };
  return { anchor: 'middle', dx: 0 };
}

export interface SeabedMapView {
  selectHotspot(id: string | null): void;
  filterMetal(metalId: string | null): void;
  getSelected(): string | null;
}

function metalChipHtml(symbol: string, context: 'panel' | 'linkage' = 'panel'): string {
  const metalId = METAL_SYMBOL_TO_ID[symbol];
  if (!metalId) {
    return `<span class="metal-chip metal-chip--plain">${escapeHtml(symbol)}</span>`;
  }
  const label = context === 'linkage' ? symbol : symbol;
  return `<button type="button" class="metal-chip" data-metal-id="${escapeAttr(metalId)}" aria-label="${escapeAttr(`Show ${symbol} details`)}">${escapeHtml(label)}</button>`;
}

function hotspotHasMetal(hotspot: SeabedHotspot, metalId: string): boolean {
  return hotspot.targetMetals.some((sym) => METAL_SYMBOL_TO_ID[sym] === metalId);
}

function renderTooltip(h: SeabedHotspot): string {
  const metals = h.targetMetals.map((sym) => metalChipHtml(sym)).join(' ');
  const topLink = h.aiLinkages[0];
  return `
    <strong>${escapeHtml(h.shortLabel)}</strong>
    <span>${escapeHtml(jurisdictionCopy(h.jurisdiction).label)}</span>
    <span>${escapeHtml(formatDepthRange(h.depthM))} · ${escapeHtml(formatDepositType(h.depositType))}</span>
    <span class="map-tooltip-metals">Metals: ${metals}</span>
    ${
      topLink
        ? `<span>${escapeHtml(topLink.metal)} linkage ${renderConfidenceTag(topLink.confidence)}</span>`
        : ''
    }
  `;
}

function positionTooltip(
  tooltipEl: HTMLElement,
  wrapEl: HTMLElement,
  svg: SVGSVGElement,
  svgX: number,
  svgY: number,
): void {
  const host = svg.parentElement as HTMLElement;
  const hostRect = host.getBoundingClientRect();
  const wrapRect = wrapEl.getBoundingClientRect();
  const scaleX = hostRect.width / MAP_WIDTH;
  const scaleY = hostRect.height / MAP_HEIGHT;
  const px = svgX * scaleX;
  const py = svgY * scaleY;

  tooltipEl.style.left = `${px}px`;
  tooltipEl.style.top = `${py}px`;
  tooltipEl.style.transform = 'translate(-50%, calc(-100% - 10px))';

  requestAnimationFrame(() => {
    const tipRect = tooltipEl.getBoundingClientRect();
    const pad = 8;
    let dx = 0;
    let dy = 0;

    if (tipRect.right > wrapRect.right - pad) {
      dx = wrapRect.right - pad - tipRect.right;
    }
    if (tipRect.left + dx < wrapRect.left + pad) {
      dx = wrapRect.left + pad - tipRect.left;
    }
    if (tipRect.top + dy < wrapRect.top + pad) {
      tooltipEl.style.transform = 'translate(-50%, 14px)';
      const flipped = tooltipEl.getBoundingClientRect();
      if (flipped.bottom > wrapRect.bottom - pad) {
        dy = wrapRect.bottom - pad - flipped.bottom;
      }
    }

    tooltipEl.style.marginLeft = dx ? `${dx}px` : '';
    tooltipEl.style.marginTop = dy ? `${dy}px` : '';
  });
}

export function createSeabedMap(
  host: HTMLElement,
  wrapEl: HTMLElement,
  tooltipEl: HTMLElement,
  onSelect: (id: string) => void,
): SeabedMapView {
  const topology = countries110m as unknown as Topology;
  const world = feature(topology, topology.objects.countries) as FeatureCollection;
  const projection = geoEqualEarth()
    .rotate([-10, 0])
    .fitExtent(
      [
        [MAP_PAD.left, MAP_PAD.top],
        [MAP_WIDTH - MAP_PAD.right, MAP_HEIGHT - MAP_PAD.bottom],
      ],
      world,
    );
  const path = geoPath(projection);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'seabed-map-svg');
  svg.setAttribute('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);
  svg.setAttribute('overflow', 'visible');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Global map of deep-sea mining exploration hotspots');

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <filter id="seabed-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  `;

  const zoomRoot = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const landLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  landLayer.setAttribute('class', 'seabed-land-layer');
  for (const f of world.features) {
    const land = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    land.setAttribute('d', path(f) ?? '');
    land.setAttribute('class', 'seabed-land');
    landLayer.appendChild(land);
  }

  const zoneLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  zoneLayer.setAttribute('class', 'seabed-zone-layer');
  const markerLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  markerLayer.setAttribute('class', 'seabed-marker-layer');

  const markerGroups = new Map<string, SVGGElement>();
  let activeMetal: string | null = null;

  const applyMetalFilter = (): void => {
    for (const [id, group] of markerGroups) {
      const hotspot = SEABED_HOTSPOTS.find((h) => h.id === id)!;
      const match = !activeMetal || hotspotHasMetal(hotspot, activeMetal);
      group.classList.toggle('is-dimmed', !match);
    }
  };

  for (const hotspot of SEABED_HOTSPOTS) {
    const [x, y] = projection([hotspot.lon, hotspot.lat]) ?? [0, 0];
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'seabed-hotspot');
    group.setAttribute('data-hotspot-id', hotspot.id);
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'button');
    group.setAttribute('aria-label', `${hotspot.name}. Metals: ${hotspot.targetMetals.join(', ')}`);

    if (hotspot.zoneRadiusDeg) {
      const [ex] = projection([hotspot.lon + hotspot.zoneRadiusDeg, hotspot.lat]) ?? [x + 40];
      const rx = Math.abs(ex - x);
      const ry = rx * 0.55;
      const zone = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      zone.setAttribute('cx', String(x));
      zone.setAttribute('cy', String(y));
      zone.setAttribute('rx', String(rx));
      zone.setAttribute('ry', String(ry));
      zone.setAttribute('class', `seabed-zone seabed-zone--${hotspot.jurisdiction}`);
      group.appendChild(zone);
    }

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', String(x));
    dot.setAttribute('cy', String(y));
    dot.setAttribute('r', hotspot.id === 'ccz' ? '7' : '5.5');
    dot.setAttribute('class', `seabed-dot seabed-dot--${hotspot.jurisdiction}`);
    group.appendChild(dot);

    const labelY = y - (hotspot.zoneRadiusDeg ? 14 : 10);
    const { anchor, dx } = labelPlacement(x);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', String(x + dx));
    label.setAttribute('y', String(labelY));
    label.setAttribute('text-anchor', anchor);
    label.setAttribute('class', 'seabed-label');
    label.textContent = hotspot.shortLabel;
    group.appendChild(label);

    const activate = () => onSelect(hotspot.id);
    group.addEventListener('click', activate);
    group.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });
    group.addEventListener('mouseenter', () => {
      tooltipEl.hidden = false;
      tooltipEl.innerHTML = renderTooltip(hotspot);
      tooltipEl.style.marginLeft = '';
      tooltipEl.style.marginTop = '';
      positionTooltip(tooltipEl, wrapEl, svg, x, y);
      tooltipEl.querySelectorAll<HTMLButtonElement>('.metal-chip[data-metal-id]').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          event.stopPropagation();
          document.dispatchEvent(
            new CustomEvent('culm-focus-metal', { detail: btn.dataset.metalId }),
          );
        });
      });
    });
    group.addEventListener('mouseleave', () => {
      tooltipEl.hidden = true;
    });

    markerLayer.appendChild(group);
    markerGroups.set(hotspot.id, group);
  }

  zoomRoot.append(landLayer, zoneLayer, markerLayer);
  svg.append(defs, zoomRoot);
  host.replaceChildren(svg);

  let selected: string | null = 'ccz';
  markerGroups.get('ccz')?.classList.add('is-selected');

  return {
    selectHotspot(id: string | null) {
      selected = id;
      for (const [hid, g] of markerGroups) {
        g.classList.toggle('is-selected', hid === id);
      }
    },
    filterMetal(metalId: string | null) {
      activeMetal = metalId;
      applyMetalFilter();
    },
    getSelected() {
      return selected;
    },
  };
}

export function renderHotspotPanel(hotspot: SeabedHotspot): string {
  const contractors = hotspot.contractors
    .map(
      (c) =>
        `<li><strong>${escapeHtml(c.name)}</strong><span class="panel-sub">${escapeHtml(c.sponsor)}</span></li>`,
    )
    .join('');

  const linkages = hotspot.aiLinkages
    .map((l) => {
      const metalBtn = metalChipHtml(l.metal, 'linkage');
      return `
      <li class="linkage-row">
        ${renderConfidenceTag(l.confidence)}
        ${metalBtn} · ${escapeHtml(l.stackLayer)}
        <p>${escapeHtml(l.role)}${l.note ? ` <em>${escapeHtml(l.note)}</em>` : ''}</p>
      </li>`;
    })
    .join('');

  const sources = hotspot.sources
    .map(
      (s) =>
        `<li><a href="${escapeAttr(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.org)}</a> · data as of ${escapeHtml(s.asOf)}</li>`,
    )
    .join('');

  const metalChips = hotspot.targetMetals.map((sym) => metalChipHtml(sym)).join(' ');

  return `
    <header class="seabed-panel-head">
      <span class="panel-kicker">${escapeHtml(jurisdictionCopy(hotspot.jurisdiction).label)}</span>
      <p class="panel-kicker-note">${escapeHtml(jurisdictionCopy(hotspot.jurisdiction).explain)}</p>
      <h2>${escapeHtml(hotspot.name)}</h2>
      <p class="panel-lead">${escapeHtml(hotspot.neutralSummary)}</p>
      <p class="panel-metals">Target metals: ${metalChips}</p>
      <p class="panel-depth"><span class="panel-depth-label">Depth</span> ${escapeHtml(formatDepthRange(hotspot.depthM))} · ${escapeHtml(formatDepositType(hotspot.depositType))}</p>
    </header>
    <section>
      <h3>Who holds the contract</h3>
      <ul class="panel-list">${contractors}</ul>
    </section>
    <section>
      <h3>AI hardware linkage</h3>
      <ul class="panel-list linkage-list">${linkages}</ul>
    </section>
    <section>
      <h3>Sources</h3>
      <ul class="panel-sources">${sources}</ul>
    </section>
  `;
}
