import { describe, it, expect } from 'vitest';

import { escapeHtml } from '@/contexts/popup/components/rules/utils';

describe('escapeHtml', () => {
  it('escapes &, <, >, ", and \' individually', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
  });

  it('escapes a mix of special characters in a single string, left to right', () => {
    expect(escapeHtml(`<img src=x onerror="alert('xss')">`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;',
    );
  });

  it('leaves strings without special characters untouched', () => {
    expect(escapeHtml('X-Custom-Header')).toBe('X-Custom-Header');
  });

  it('does not double-escape an already-escaped ampersand', () => {
    // & は最初に置換されるため、後続の置換対象がその出力（&amp; など）に紛れ込んでも
    // 二重エスケープにはならないことを確認する。
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });
});
