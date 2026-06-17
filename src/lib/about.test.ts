import { describe, expect, it } from 'vitest';
import { renderAboutHtml } from './about';

describe('about section', () => {
  it('mentions the hackathon and AI safety framing', () => {
    const html = renderAboutHtml();
    expect(html).toContain('Breaking Barriers to AI Safety');
    expect(html).toContain('Culm reports facts');
    expect(html).toContain('export controls');
  });
});
