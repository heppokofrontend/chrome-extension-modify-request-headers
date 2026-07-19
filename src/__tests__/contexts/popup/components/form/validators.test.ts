import { describe, it, expect } from 'vitest';

import { isValidHeaderName } from '@/contexts/popup/components/form/validators';

describe('isValidHeaderName', () => {
  it('accepts a token consisting of ASCII letters/digits', () => {
    expect(isValidHeaderName('Authorization')).toBe(true);
    expect(isValidHeaderName('X-Custom-Header')).toBe(true);
  });

  it('rejects a name containing non-ASCII characters', () => {
    expect(isValidHeaderName('X-ヘッダー')).toBe(false);
  });

  it('rejects a name containing delimiters like space, colon, or CRLF', () => {
    expect(isValidHeaderName('Bad Header')).toBe(false);
    expect(isValidHeaderName('Bad:Header')).toBe(false);
    expect(isValidHeaderName('Bad\r\nHeader')).toBe(false);
  });

  it('rejects empty or whitespace-only input', () => {
    expect(isValidHeaderName('')).toBe(false);
    expect(isValidHeaderName('   ')).toBe(false);
  });
});
