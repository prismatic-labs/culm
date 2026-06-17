import '../styles.css';
import { concentrationMap } from '../data/concentration-map';
import { escapeHtml } from '../lib/escape-html';
import { mountExploreNav } from '../lib/explore-nav';

const stackEl = document.querySelector<HTMLElement>('#materials-stack')!;

const layers = [...concentrationMap.layers].sort((a, b) => a.stackOrder - b.stackOrder);

stackEl.innerHTML = layers
  .map((layer) => {
    const ord = String(layer.stackOrder).padStart(2, '0');
    const inspectUrl = `../?mode=layer&layer=${encodeURIComponent(layer.id)}`;
    return `
      <article class="materials-layer" id="layer-${escapeHtml(layer.id)}">
        <header class="materials-layer-head">
          <span class="materials-ord">${ord}</span>
          <div>
            <h2>${escapeHtml(layer.name)}</h2>
            <span class="materials-cat">${escapeHtml(layer.category)}</span>
          </div>
          <a class="materials-inspect" href="${inspectUrl}">Inspect in stack →</a>
        </header>
        <p class="materials-what"><strong>Physical inputs:</strong> ${escapeHtml(layer.whatItIs)}</p>
        <p class="materials-why">${escapeHtml(layer.whyItMatters)}</p>
        ${
          layer.subcomponents?.length
            ? `<ul class="materials-sub">${layer.subcomponents
                .map(
                  (s) =>
                    `<li><strong>${escapeHtml(s.name)}</strong> · ${escapeHtml(s.country)}${s.note ? ` · ${escapeHtml(s.note)}` : ''}</li>`,
                )
                .join('')}</ul>`
            : ''
        }
      </article>`;
  })
  .join('');

mountExploreNav(document.querySelector('#explore-nav'), 'materials', '../');
