import { SEABED_HOTSPOTS, type SeabedHotspot } from '../data/seabed';
import { escapeAttr, escapeHtml } from '../lib/escape-html';
import {
  depthToAxisPercent,
  formatDepthRangeShort,
} from '../lib/seabed-depth';

export interface DepthStripView {
  selectHotspot(id: string | null): void;
}

const DEPTH_TICKS_M = [0, 2000, 4000, 6000];

function sortedHotspots(): SeabedHotspot[] {
  return [...SEABED_HOTSPOTS].sort(
    (a, b) => a.depthM.min - b.depthM.min || a.depthM.max - b.depthM.max || a.shortLabel.localeCompare(b.shortLabel),
  );
}

function renderRow(hotspot: SeabedHotspot, selectedId: string | null): string {
  const left = depthToAxisPercent(hotspot.depthM.min);
  const width = Math.max(depthToAxisPercent(hotspot.depthM.max) - left, 1.5);
  const selected = hotspot.id === selectedId;
  return `
    <button
      type="button"
      class="depth-row depth-row--${hotspot.jurisdiction}${selected ? ' is-selected' : ''}"
      data-hotspot-id="${escapeAttr(hotspot.id)}"
      aria-pressed="${selected ? 'true' : 'false'}"
      aria-label="${escapeAttr(`${hotspot.name}, ${formatDepthRangeShort(hotspot.depthM)}`)}"
    >
      <span class="depth-row-name">${escapeHtml(hotspot.shortLabel)}</span>
      <span class="depth-row-track" aria-hidden="true">
        <span
          class="depth-row-range"
          style="left: ${left.toFixed(2)}%; width: ${width.toFixed(2)}%"
        ></span>
      </span>
      <span class="depth-row-depth">${escapeHtml(formatDepthRangeShort(hotspot.depthM))}</span>
    </button>`;
}

export function createDepthStrip(
  host: HTMLElement,
  onSelect: (id: string) => void,
): DepthStripView {
  let selectedId: string | null = 'ccz';

  const render = (): void => {
    host.innerHTML = `
      <div class="depth-chart" role="group" aria-label="Water depth by site, shallow to deep">
        <div class="depth-chart-head">
          <span class="depth-chart-title">Depth</span>
          <span class="depth-chart-sub">Metres below surface</span>
        </div>
        <div class="depth-chart-rows">
          ${sortedHotspots().map((h) => renderRow(h, selectedId)).join('')}
        </div>
        <div class="depth-chart-axis" aria-hidden="true">
          <span class="depth-chart-axis-spacer"></span>
          <div class="depth-chart-ticks">
            ${DEPTH_TICKS_M.map((m) => `<span>${m === 0 ? '0' : `${m / 1000}k`}</span>`).join('')}
          </div>
          <span class="depth-chart-axis-spacer"></span>
        </div>
        <p class="depth-chart-note">
          AI's core metals (copper, cobalt, nickel) lie in the deepest sites. Depth drives the cost
          and limits how few operators can work there, the same concentration the map traces.
        </p>
      </div>`;

    host.querySelectorAll<HTMLButtonElement>('.depth-row').forEach((btn) => {
      btn.addEventListener('click', () => onSelect(btn.dataset.hotspotId!));
    });
  };

  render();

  return {
    selectHotspot(id: string | null) {
      selectedId = id;
      host.querySelectorAll<HTMLButtonElement>('.depth-row').forEach((btn) => {
        const active = btn.dataset.hotspotId === id;
        btn.classList.toggle('is-selected', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    },
  };
}
