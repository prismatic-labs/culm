import { escapeHtml } from './escape-html';
import { datasetCitation } from './dataset-meta';
import { concentrationMap } from '../data/concentration-map';

export function renderAboutHtml(): string {
  const citation = datasetCitation(concentrationMap.datasetVersion);
  return `
    <h2 id="about-heading">About Culm</h2>
    <p class="about-lead">
      Culm maps physical concentration in the AI hardware stack: eight layers from materials to cloud,
      with sourced metrics, confidence tags, and export-control context. It won the
      <strong>Breaking Barriers to AI Safety</strong> hackathon (LISA × BlueDot Impact, June 2026).
    </p>
    <p>
      The AI safety angle is structural, not prescriptive. Each chokepoint is both a single point of
      failure and a place where a few hands can restrict or prioritize frontier AI — as
      <a href="controls/">export controls already show</a>. Culm reports facts; what to do about them
      is your call.
    </p>
    <p class="about-meta">
      Open dataset · Apache-2.0 · maintained by
      <a href="https://prismaticlabs.ai" target="_blank" rel="noopener noreferrer">Prismatic Labs</a>
    </p>
    <p class="about-cite"><span class="about-cite-label">Cite as:</span> ${escapeHtml(citation)}</p>
  `;
}
