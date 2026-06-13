import { escapeHtml } from './escape-html';
import { isCompositeLayer } from './composite-layer';
import type { Layer, SubComponent } from '../types';
import { pct100 } from './ui';

function renderSubNode(component: SubComponent): string {
  return `
    <strong>${escapeHtml(component.name)}</strong>
    <span class="subcomponent-meta">${escapeHtml(component.country)} · ${pct100(component.share.value)}%</span>
    ${component.note ? `<span class="note">${escapeHtml(component.note)}</span>` : ''}
  `;
}

export function renderSubcomponentsHtml(layer: Layer): string {
  if (!layer.subcomponents?.length) return '';

  const childrenOf = (parentId: string) =>
    layer.subcomponents!.filter((c) => c.parentId === parentId);
  const roots = layer.subcomponents.filter((c) => !c.parentId);

  function walk(component: SubComponent): string {
    const kids = childrenOf(component.id);
    const nested =
      kids.length > 0
        ? `<ul class="subcomponent-list">${kids.map((k) => walk(k)).join('')}</ul>`
        : '';
    return `<li class="subcomponent-item">${renderSubNode(component)}${nested}</li>`;
  }

  return `
    <div class="blk subcomponents">
      <h3>${isCompositeLayer(layer) ? 'Inputs in this layer' : 'Recursive inputs'}</h3>
      <p class="note">${
        isCompositeLayer(layer)
          ? 'Each row is a distinct input with its own supplier geography. Map markers follow these countries.'
          : 'Sub-suppliers and critical inputs inside this layer. Pilot graph for hidden dependencies.'
      }</p>
      <ul class="subcomponent-list">${roots.map((root) => walk(root)).join('')}</ul>
    </div>
  `;
}
