import { geoCentroid, geoEqualEarth, geoPath } from 'd3-geo';
import type { FeatureCollection } from 'geojson';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import countries110m from 'world-atlas/countries-110m.json';
import type { Layer } from './types';
import { analyzeCascade } from './lib/cascade';
import { isCompositeLayer } from './lib/composite-layer';
import {
  aggregateByCountry,
  countryChokeIntensity,
  resolveCountryFeatures,
  type CountryAggregate,
  type ResolvedCountry,
} from './lib/country-aggregate';
import {
  aggregateDirectDownstream,
  flowCaptionLabel,
  layerShortName,
  layersHeldInCountry,
  mergeDownstreamForOrigins,
} from './lib/downstream-flow';
import { escapeHtml } from './lib/escape-html';
import { flowOriginCountry, layerHeldInCountry } from './lib/layer-countries';
import {
  EAST_ASIA_CLUSTER,
  layoutMarkerLabels,
  markerRadiusFromStats,
  separateClusterMarkers,
} from './lib/map-layout';
import { buildInternalLoopPath, buildSimpleFlowPath } from './lib/simple-flow-path';
import { heat, heatMap, pct100 } from './lib/ui';
import { activeShockTarget, getState, setCountry, type CulmState, type ShockTarget } from './state';

export { flowSourceLayer } from './lib/flow-source';

interface MapFlow {
  source: Layer | null;
  sources: Layer[];
  captionLabel: string;
  fromCountry: string | null;
  origins: string[];
  internal: Layer[];
  targets: string[];
}

const EMPTY_MAP_FLOW: MapFlow = {
  source: null,
  sources: [],
  captionLabel: '',
  fromCountry: null,
  origins: [],
  internal: [],
  targets: [],
};

const MAP_WIDTH = 760;
const MAP_HEIGHT = 430;
const INK = '#18241d';

interface MarkerPoint {
  country: string;
  x: number;
  y: number;
  radius: number;
  resolved: ResolvedCountry;
}

interface MarkerElements {
  dotGroup: SVGGElement;
  labelGroup: SVGGElement;
  nameLabel: SVGTextElement;
  leaderLine: SVGLineElement | null;
}

const COUNTRY_SHORT: Record<string, string> = {
  China: 'China',
  Japan: 'Japan',
  Netherlands: 'Netherlands',
  Taiwan: 'Taiwan',
  'South Korea': 'S. Korea',
  'United States': 'United States',
};

function concentrationTier(maxCr1Pct: number): string {
  if (maxCr1Pct >= 80) return 'Very high';
  if (maxCr1Pct >= 50) return 'High';
  return 'Moderate';
}

function layerListHtml(aggregate: CountryAggregate, stackLayerCount: number): string {
  return aggregate.layers
    .map((layer) => {
      const status = layer.isCriticalChokepoint
        ? '<span class="chip-dot"></span> critical'
        : 'not critical';
      const unverified =
        layer.metrics.cr1.sources.length === 0
          ? ' <span class="tag unverified">unverified</span>'
          : '';
      const name = escapeHtml(layer.name.split('(')[0].trim());
      return `<li>${name} · CR1 ${pct100(layer.metrics.cr1.value)}% · ${status}${unverified}</li>`;
    })
    .join('');
}

function appendInternalLoop(flowLayer: SVGGElement, point: MarkerPoint): void {
  appendFlowPath(
    flowLayer,
    buildInternalLoopPath(point.x, point.y, point.radius),
    0,
    'map-flow map-flow-loop',
  );
}

function appendFlowPath(
  flowLayer: SVGGElement,
  d: string,
  routeIndex: number,
  className = 'map-flow',
): void {
  const halo = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  halo.setAttribute('d', d);
  halo.setAttribute('class', 'map-flow-halo');
  const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathEl.setAttribute('d', d);
  pathEl.setAttribute('class', className);
  const shockFlow = className.includes('map-flow-shock');
  pathEl.setAttribute(
    'marker-end',
    shockFlow ? 'url(#culm-flow-arrow-shock)' : 'url(#culm-flow-arrow)',
  );
  flowLayer.append(halo, pathEl);
}

function attachMapZoom(svg: SVGSVGElement, zoomRoot: SVGGElement): void {
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let pinchStartDistance = 0;
  let pinchStartScale = 1;
  const apply = () => {
    zoomRoot.setAttribute('transform', `translate(${tx} ${ty}) scale(${scale})`);
  };
  svg.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mx = ((event.clientX - rect.left) / rect.width) * MAP_WIDTH;
      const my = ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT;
      const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
      const next = Math.min(4, Math.max(1, scale * factor));
      const ratio = next / scale;
      tx = mx - ratio * (mx - tx);
      ty = my - ratio * (my - ty);
      scale = next;
      apply();
    },
    { passive: false },
  );
  svg.addEventListener('dblclick', () => {
    scale = 1;
    tx = 0;
    ty = 0;
    apply();
  });
  svg.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    const [a, b] = [event.touches[0]!, event.touches[1]!];
    pinchStartDistance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    pinchStartScale = scale;
  });
  svg.addEventListener(
    'touchmove',
    (event) => {
      if (event.touches.length !== 2 || pinchStartDistance <= 0) return;
      event.preventDefault();
      const [a, b] = [event.touches[0]!, event.touches[1]!];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      scale = Math.min(4, Math.max(1, pinchStartScale * (distance / pinchStartDistance)));
      apply();
    },
    { passive: false },
  );
  svg.addEventListener('touchend', () => {
    pinchStartDistance = 0;
  });
}

export function createMapView(
  host: HTMLElement,
  tooltipEl: HTMLElement,
  captionEl: HTMLElement,
  layers: Layer[],
): (state: CulmState) => void {
  const stackLayerCount = layers.length;
  const topology = countries110m as unknown as Topology;
  const world = feature(topology, topology.objects.countries) as FeatureCollection;
  const aggregates = aggregateByCountry(layers);
  const { resolved, unmatched } = resolveCountryFeatures(aggregates, world);

  if (import.meta.env.DEV && unmatched.length) {
    console.error(
      `[culm map] Could not match countries to world-atlas features: ${unmatched.join(', ')}`,
    );
  }

  const projection = geoEqualEarth().fitSize([MAP_WIDTH, MAP_HEIGHT - 24], world);
  const path = geoPath(projection);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'map-svg');
  svg.setAttribute('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute(
    'aria-label',
    'World map showing countries that hold concentrated AI stack layers',
  );

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <marker id="culm-flow-arrow" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
      <path d="M 0 1 L 8 4 L 0 7 z" class="map-flow-arrowhead map-flow-arrowhead--inspect" />
    </marker>
    <marker id="culm-flow-arrow-shock" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
      <path d="M 0 1 L 8 4 L 0 7 z" class="map-flow-arrowhead map-flow-arrowhead--shock" />
    </marker>
  `;

  const zoomRoot = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  zoomRoot.setAttribute('class', 'map-zoom-root');

  const landLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  landLayer.setAttribute('class', 'map-land-layer');
  for (const f of world.features) {
    const land = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    land.setAttribute('d', path(f) ?? '');
    land.setAttribute('class', 'map-land');
    landLayer.appendChild(land);
  }

  const flowLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  flowLayer.setAttribute('class', 'map-flow-layer');
  const markerDotLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  markerDotLayer.setAttribute('class', 'map-marker-dot-layer');
  const markerLabelLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  markerLabelLayer.setAttribute('class', 'map-marker-label-layer');

  zoomRoot.append(landLayer, flowLayer, markerDotLayer, markerLabelLayer);
  svg.append(defs, zoomRoot);
  host.replaceChildren(svg);
  attachMapZoom(svg, zoomRoot);

  const markerPoints = new Map<string, MarkerPoint>();
  const markerElements = new Map<string, MarkerElements>();
  let hoveredCountry: string | null = null;

  for (const item of resolved) {
    const [x, y] = projection(geoCentroid(item.feature)) ?? [0, 0];
    markerPoints.set(item.aggregate.country, {
      country: item.aggregate.country,
      x,
      y,
      radius: markerRadiusFromStats(item.aggregate.chokepointCount, item.aggregate.maxCr1),
      resolved: item,
    });
  }

  const layoutInput = [...markerPoints.values()].map((point) => ({
    country: point.country,
    x: point.x,
    y: point.y,
    radius: point.radius,
  }));
  separateClusterMarkers(layoutInput, EAST_ASIA_CLUSTER, 16, 32);
  for (const layoutPoint of layoutInput) {
    const point = markerPoints.get(layoutPoint.country)!;
    point.x = layoutPoint.x;
    point.y = layoutPoint.y;
  }

  const labelLayouts = layoutMarkerLabels(layoutInput);

  function hostPoint(sx: number, sy: number): [number, number] {
    const rect = svg.getBoundingClientRect();
    const wrapRect = host.getBoundingClientRect();
    const scaleX = rect.width / MAP_WIDTH;
    const scaleY = rect.height / MAP_HEIGHT;
    return [sx * scaleX + rect.left - wrapRect.left, sy * scaleY + rect.top - wrapRect.top];
  }

  function showTooltip(item: ResolvedCountry, sx: number, sy: number): void {
    const { aggregate } = item;
    const point = markerPoints.get(aggregate.country)!;
    const layerLine = `${aggregate.layers.length} of ${stackLayerCount} layers`;
    const criticalLine =
      aggregate.chokepointCount > 0
        ? `${aggregate.chokepointCount} critical`
        : '0 critical';
    const caveat =
      aggregate.caveats.length > 0
        ? `<p class="map-tooltip-caveat">${escapeHtml(aggregate.caveats[0]!)}</p>`
        : '';

    const [x, y] = hostPoint(sx, sy - point.radius);
    tooltipEl.hidden = false;
    tooltipEl.innerHTML = `
      <div class="map-tooltip-title">${escapeHtml(aggregate.country)}</div>
      <div class="map-tooltip-meta">${layerLine} · ${criticalLine} · ${concentrationTier(pct100(countryChokeIntensity(aggregate)))}</div>
      <ul class="map-tooltip-list">${layerListHtml(aggregate, stackLayerCount)}</ul>
      ${caveat}
    `;
    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
    tooltipEl.style.transform = 'translate(-50%, calc(-100% - 10px))';
  }

  function hideTooltip(): void {
    tooltipEl.hidden = true;
  }

  function flowOriginsForSource(
    source: Layer,
    state: CulmState,
    shock: ShockTarget | null,
  ): string[] {
    if (shock?.kind === 'country') return [shock.name];
    if (
      state.mode === 'country' &&
      state.selectedCountry &&
      layerHeldInCountry(source, state.selectedCountry)
    ) {
      return [state.selectedCountry];
    }
    if (isCompositeLayer(source)) {
      return source.metrics.dominantCountries.map((entry) => entry.country);
    }
    return [flowOriginCountry(state.mode, state.selectedCountry, source)];
  }

  function formatFlowCaption(flow: MapFlow): string {
    if (!flow.source || flow.origins.length === 0) return '';

    const originLabel =
      flow.origins.length > 1 ? flow.origins.join(' + ') : flow.origins[0]!;
    const sourceName = escapeHtml(flow.captionLabel);
    const { internal, targets } = flow;

    if (internal.length === 0 && targets.length === 0) {
      return `<span class="map-caption-active"><strong>${sourceName}</strong> (${escapeHtml(originLabel)}): no direct downstream layer in another country.</span>`;
    }

    const parts: string[] = [];
    if (targets.length) {
      parts.push(`arrows to ${escapeHtml(targets.join(', '))}`);
    }
    if (internal.length) {
      const loopCountries = flow.origins.filter((origin) =>
        internal.every((layer) =>
          layer.metrics.dominantCountries.every((entry) => entry.country === origin),
        ),
      );
      const loopOn = loopCountries.length ? loopCountries.join(' + ') : originLabel;
      parts.push(
        `loop on ${escapeHtml(loopOn)} for ${escapeHtml(internal.map((layer) => layerShortName(layer)).join(', '))}`,
      );
    }

    return `<span class="map-caption-active"><strong>${sourceName}</strong> (${escapeHtml(originLabel)}): ${parts.join('; ')}.</span>`;
  }

  function resolveMapFlow(state: CulmState): MapFlow {
    const shock = activeShockTarget();
    if (state.stackMode === 'shock' && !shock) return EMPTY_MAP_FLOW;

    const cascade = analyzeCascade(layers, shock);

    if (cascade && shock) {
      if (shock.kind === 'country') {
        const held = cascade.sourceLayers;
        if (!held.length) return EMPTY_MAP_FLOW;
        const split = aggregateDirectDownstream(held, layers, shock.name);
        return {
          source: held[0]!,
          sources: held,
          captionLabel: flowCaptionLabel(held),
          fromCountry: shock.name,
          origins: [shock.name],
          internal: split.internal,
          targets: split.externalCountries,
        };
      }

      const source = cascade.sourceLayers[0]!;
      const origins = flowOriginsForSource(source, state, shock);
      const split = mergeDownstreamForOrigins([source], layers, origins);
      return {
        source,
        sources: [source],
        captionLabel: flowCaptionLabel([source]),
        fromCountry: origins[0] ?? null,
        origins,
        internal: split.internal,
        targets: split.externalCountries,
      };
    }

    if (state.mode === 'country' && state.selectedCountry) {
      const held = layersHeldInCountry(state.selectedCountry, layers);
      if (!held.length) return EMPTY_MAP_FLOW;
      const split = aggregateDirectDownstream(held, layers, state.selectedCountry);
      return {
        source: held[0]!,
        sources: held,
        captionLabel: flowCaptionLabel(held),
        fromCountry: state.selectedCountry,
        origins: [state.selectedCountry],
        internal: split.internal,
        targets: split.externalCountries,
      };
    }

    if (state.mode === 'layer' && state.selectedLayer) {
      const source = layers.find((layer) => layer.id === state.selectedLayer) ?? null;
      if (!source) return EMPTY_MAP_FLOW;
      const origins = flowOriginsForSource(source, state, null);
      const split = mergeDownstreamForOrigins([source], layers, origins);
      return {
        source,
        sources: [source],
        captionLabel: flowCaptionLabel([source]),
        fromCountry: origins[0] ?? null,
        origins,
        internal: split.internal,
        targets: split.externalCountries,
      };
    }

    return EMPTY_MAP_FLOW;
  }

  function flowContext(state: CulmState): {
    source: Layer | null;
    origins: string[];
    fromCountry: string | null;
    targets: string[];
    internal: Layer[];
    hasInternalLoop: boolean;
  } {
    const flow = resolveMapFlow(state);
    return {
      source: flow.source,
      origins: flow.origins,
      fromCountry: flow.fromCountry,
      targets: flow.targets,
      internal: flow.internal,
      hasInternalLoop: flow.internal.length > 0,
    };
  }

  function renderCaption(state: CulmState): void {
    const shock = activeShockTarget();
    const cascade = analyzeCascade(layers, shock);
    if (cascade) {
      const flowCaption = formatFlowCaption(resolveMapFlow(state));
      captionEl.innerHTML = flowCaption
        ? flowCaption.replace('map-caption-active', 'map-caption-flow')
        : `<span class="map-caption-idle">Simulation active. See panel below for impact detail.</span>`;
      return;
    }

    const flow = resolveMapFlow(state);
    if (!flow.source || flow.origins.length === 0) {
      captionEl.innerHTML = `
        <span class="map-caption-idle">Select a stack layer or country to see dependency arrows.</span>
      `;
      return;
    }

    captionEl.innerHTML = formatFlowCaption(flow);
  }

  function renderFlows(state: CulmState): void {
    flowLayer.replaceChildren();
    const shock = activeShockTarget();
    const cascade = analyzeCascade(layers, shock);
    const flowClass = cascade ? 'map-flow map-flow-shock' : 'map-flow';
    const ctx = flowContext(state);
    if (!ctx.source || ctx.origins.length === 0) return;

    const routesByOrigin = new Map<string, string[]>();
    for (const origin of ctx.origins) {
      routesByOrigin.set(
        origin,
        ctx.targets.filter((target) => target !== origin),
      );
    }

    for (const [fromName, targets] of routesByOrigin) {
      const from = markerPoints.get(fromName);
      if (!from || targets.length === 0) continue;

      targets.forEach((toName, routeIndex) => {
        const to = markerPoints.get(toName);
        if (!to) return;
        appendFlowPath(
          flowLayer,
          buildSimpleFlowPath(from, to, routeIndex, targets.length),
          routeIndex,
          flowClass,
        );
      });
    }

    for (const origin of ctx.origins) {
      const loopsHere = ctx.internal.some((layer) =>
        layer.metrics.dominantCountries.every((entry) => entry.country === origin),
      );
      if (!loopsHere) continue;
      const point = markerPoints.get(origin);
      if (point) appendInternalLoop(flowLayer, point);
    }
  }

  function buildMarkers(): void {
    for (const item of resolved) {
      const point = markerPoints.get(item.aggregate.country)!;
      const { aggregate } = item;
      const r = point.radius;
      const fill = heatMap(pct100(countryChokeIntensity(aggregate)));
      const shortName = COUNTRY_SHORT[aggregate.country] ?? aggregate.country;
      const layerLine = `${aggregate.layers.length} of ${stackLayerCount} layers`;
      const criticalLine =
        aggregate.chokepointCount > 0
          ? `${aggregate.chokepointCount} critical`
          : '0 critical';
      const labelLayout = labelLayouts.get(aggregate.country)!;

      const dotGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      dotGroup.setAttribute('class', 'map-marker');
      dotGroup.dataset.country = aggregate.country;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(point.x));
      circle.setAttribute('cy', String(point.y));
      circle.setAttribute('r', String(r));
      circle.setAttribute('fill', fill);
      circle.setAttribute('class', 'map-marker-dot');
      circle.setAttribute('stroke', INK);
      circle.setAttribute('stroke-width', '1.25');
      dotGroup.appendChild(circle);
      markerDotLayer.appendChild(dotGroup);

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'map-marker');
      g.setAttribute('role', 'button');
      g.setAttribute('tabindex', '0');
      g.setAttribute(
        'aria-label',
        `${aggregate.country}: ${layerLine}, ${criticalLine}`,
      );
      g.dataset.country = aggregate.country;

      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      hit.setAttribute('cx', String(point.x));
      hit.setAttribute('cy', String(point.y));
      hit.setAttribute('r', String(r + 7));
      hit.setAttribute('class', 'map-marker-hit');

      const leaderLine: SVGLineElement | null = null;

      const nameLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      nameLabel.setAttribute('x', String(labelLayout.x));
      nameLabel.setAttribute('y', String(labelLayout.y));
      nameLabel.setAttribute('class', 'map-marker-name');
      nameLabel.setAttribute('text-anchor', labelLayout.anchor);
      if (labelLayout.useLeader) {
        nameLabel.setAttribute('dominant-baseline', 'middle');
      }
      nameLabel.textContent = shortName;

      const tip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      tip.textContent = `${aggregate.country}: ${layerLine}, ${criticalLine}`;
      g.append(tip, hit);
      if (leaderLine) g.appendChild(leaderLine);
      g.appendChild(nameLabel);

      const activate = () => setCountry(aggregate.country);
      const onEnter = () => {
        hoveredCountry = aggregate.country;
        showTooltip(item, point.x, point.y);
      };
      const onLeave = () => {
        hoveredCountry = null;
        hideTooltip();
      };

      g.addEventListener('click', activate);
      g.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      });
      g.addEventListener('mouseenter', onEnter);
      g.addEventListener('mouseleave', onLeave);
      g.addEventListener('focus', onEnter);
      g.addEventListener('blur', onLeave);

      markerLabelLayer.appendChild(g);
      markerElements.set(aggregate.country, { dotGroup, labelGroup: g, nameLabel, leaderLine });
    }
  }

  function updateMarkers(state: CulmState): void {
    const cascade = analyzeCascade(layers, activeShockTarget());
    const sourceCountries = new Set(
      cascade?.sourceLayers.flatMap((layer) =>
        layer.metrics.dominantCountries.map((entry) => entry.country),
      ) ?? [],
    );
    const shockedCountries = new Set(
      cascade?.impactedLayers.flatMap((layer) =>
        layer.metrics.dominantCountries.map((entry) => entry.country),
      ) ?? [],
    );

    const flow = resolveMapFlow(state);
    const flowCountries =
      flow.origins.length || flow.targets.length
        ? new Set([...flow.origins, ...flow.targets])
        : null;

    for (const item of resolved) {
      const { aggregate } = item;
      const elements = markerElements.get(aggregate.country);
      if (!elements) continue;

      const active =
        (flow.origins.includes(aggregate.country) && !cascade) ||
        (state.mode === 'country' &&
          !cascade &&
          state.selectedCountry !== null &&
          state.selectedCountry === aggregate.country) ||
        (state.mode === 'layer' &&
          !cascade &&
          flowCountries !== null &&
          flow.origins[0] === aggregate.country);

      let dimmed = false;
      if (cascade) {
        dimmed = !shockedCountries.has(aggregate.country);
      } else if (flowCountries && flowCountries.size > 0) {
        dimmed = !flowCountries.has(aggregate.country);
      } else if (state.mode === 'country' && state.selectedCountry !== null) {
        dimmed = state.selectedCountry !== aggregate.country;
      }

      const shocked = shockedCountries.has(aggregate.country);
      const shockSource = sourceCountries.has(aggregate.country);

      const inFlow = flowCountries?.has(aggregate.country) ?? false;
      const isOrigin = flow.origins.includes(aggregate.country) && !cascade;

      const markerClass = [
        'map-marker',
        active ? 'active' : '',
        isOrigin ? 'flow-origin' : '',
        inFlow && !isOrigin && !shockSource ? 'flow-linked' : '',
        shocked ? (shockSource ? 'shock-source' : 'shock-downstream') : '',
        dimmed ? 'dimmed' : '',
      ]
        .filter(Boolean)
        .join(' ');

      elements.dotGroup.setAttribute('class', markerClass);
      elements.labelGroup.setAttribute('class', markerClass);
      elements.labelGroup.setAttribute('aria-pressed', active ? 'true' : 'false');
      elements.nameLabel.classList.remove('map-marker-name--hidden');
      elements.leaderLine?.classList.remove('map-marker-leader--hidden');

      // Raise highlighted markers so their lit leader line and label draw above
      // dimmed neighbours (matters most in the dense East Asia cluster).
      if (active || isOrigin || inFlow || shocked || shockSource) {
        markerDotLayer.appendChild(elements.dotGroup);
        markerLabelLayer.appendChild(elements.labelGroup);
      }
    }
  }

  buildMarkers();
  updateMarkers(getState());

  return (state: CulmState) => {
    updateMarkers(state);
    renderFlows(state);
    renderCaption(state);
  };
}
