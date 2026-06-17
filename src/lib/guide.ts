import { escapeHtml } from './escape-html';
import { COPY } from './ui-copy';

export type GuideTabId = 'overview' | 'inspect' | 'whatif';

const PANELS: Record<GuideTabId, { title: string; body: string }> = {
  overview: {
    title: 'How Culm works',
    body:
      'The AI stack is eight physical steps from raw materials to cloud compute. ' +
      'Culm maps who controls each step, by company share and by country, and draws one-hop supply links on the map. ' +
      'Nothing here is a blended “fragility score”; each metric is separate and sourced.',
  },
  inspect: {
    title: 'Inspect · concentration',
    body:
      'Click a layer in the stack or a country on the map. ' +
      'Green markers show geographic chokepoint intensity (darker = stronger role). ' +
      'Copper arrows show direct dependency for your current selection: where supply flows in one hop downstream.',
  },
  whatif: {
    title: `${COPY.modeWhatIf} · simulate removal`,
    body:
      'Switch to What if? and pick a layer or country to remove from the stack. ' +
      'Culm walks the dependency graph and shows what stalls downstream, layer by layer, with plain outcomes. ' +
      'It is a thought experiment, not a forecast. Reset anytime to try another scenario.',
  },
};

export function renderGuideHtml(active: GuideTabId = 'overview'): string {
  const tabs: Array<{ id: GuideTabId; label: string }> = [
    { id: 'overview', label: 'How it works' },
    { id: 'inspect', label: COPY.modeInspect },
    { id: 'whatif', label: COPY.modeWhatIf },
  ];

  const panel = PANELS[active];

  return `
    <div class="guide-tabs" role="tablist" aria-label="How Culm works">
      ${tabs
        .map(
          (tab) => `
        <button
          type="button"
          class="guide-tab${tab.id === active ? ' guide-tab--active' : ''}"
          role="tab"
          aria-selected="${tab.id === active ? 'true' : 'false'}"
          data-guide-tab="${tab.id}"
        >${escapeHtml(tab.label)}</button>
      `,
        )
        .join('')}
    </div>
    <div class="guide-panel" role="tabpanel">
      <h2 class="guide-panel-title">${escapeHtml(panel.title)}</h2>
      <p class="guide-panel-body">${escapeHtml(panel.body)}</p>
      ${
        active === 'overview'
          ? `
      <div class="guide-continue">
        <h3>Continue reading</h3>
        <ol>
          <li><a href="controls/">Export controls already pulled on the AI stack</a> · measures already pulled on each chokepoint</li>
          <li><a href="compute/">Who controls AI compute, and the power that runs it</a> · accelerator concentration and the power that binds it</li>
          <li><a href="seabed/">Deep-sea mining and the metals behind AI power</a> · a supply question still being decided</li>
          <li><a href="materials/">What the AI hardware stack is made of</a> · physical inputs at each layer</li>
        </ol>
      </div>`
          : ''
      }
    </div>
  `;
}
