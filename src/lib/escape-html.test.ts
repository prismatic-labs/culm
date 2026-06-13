import { describe, expect, it } from 'vitest';
import { escapeAttr, escapeHtml, isSafeHttpUrl } from './escape-html';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml(`<script>"x"&</script>`)).toBe(
      '&lt;script&gt;&quot;x&quot;&amp;&lt;/script&gt;',
    );
  });

  it('escapeAttr matches escapeHtml', () => {
    expect(escapeAttr('a "b"')).toBe('a &quot;b&quot;');
  });
});

describe('isSafeHttpUrl', () => {
  it('accepts http and https', () => {
    expect(isSafeHttpUrl('https://epoch.ai/data')).toBe(true);
    expect(isSafeHttpUrl('http://example.com')).toBe(true);
  });

  it('rejects javascript and malformed URLs', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('not a url')).toBe(false);
  });
});
