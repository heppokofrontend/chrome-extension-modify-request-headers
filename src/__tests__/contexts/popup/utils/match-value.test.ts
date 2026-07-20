import { describe, it, expect } from 'vitest';

import { getCanonicalMatchValue, getMatchValue } from '@/contexts/popup/utils';
import type { HeaderRule } from '@/types';

const makeRule = (overrides: Partial<HeaderRule> & Pick<HeaderRule, 'matchType'>): HeaderRule => ({
  id: 'a',
  url: '',
  origin: '',
  regexp: '',
  headerName: 'X-Test',
  operation: 'set',
  value: '',
  isActive: true,
  ...overrides,
});

describe('getMatchValue', () => {
  it('returns url when matchType is url', () => {
    const rule = makeRule({ matchType: 'url', url: 'https://example.com/path' });

    expect(getMatchValue(rule)).toBe('https://example.com/path');
  });

  it('returns origin when matchType is origin', () => {
    const rule = makeRule({ matchType: 'origin', origin: 'https://example.com' });

    expect(getMatchValue(rule)).toBe('https://example.com');
  });

  it('returns regexp when matchType is regexp', () => {
    const rule = makeRule({ matchType: 'regexp', regexp: '^https://.*\\.example\\.com/' });

    expect(getMatchValue(rule)).toBe('^https://.*\\.example\\.com/');
  });

  it('ignores the values of the fields that do not match the current matchType', () => {
    const rule = makeRule({
      matchType: 'origin',
      url: 'https://unused-url.example.com',
      origin: 'https://example.com',
      regexp: 'unused-regexp',
    });

    expect(getMatchValue(rule)).toBe('https://example.com');
  });
});

describe('getCanonicalMatchValue', () => {
  it('normalizes a non-ASCII url to its punycode-encoded href', () => {
    const rule = makeRule({ matchType: 'url', url: 'https://例え.com/path' });

    expect(getCanonicalMatchValue(rule)).toBe('https://xn--r8jz45g.com/path');
  });

  it('normalizes a non-ASCII origin to its punycode-encoded origin', () => {
    const rule = makeRule({ matchType: 'origin', origin: 'https://例え.com' });

    expect(getCanonicalMatchValue(rule)).toBe('https://xn--r8jz45g.com');
  });

  it('treats a trailing-slash url and its slash-less form as the same canonical value', () => {
    const withSlash = makeRule({ matchType: 'url', url: 'https://example.com/path/' });
    const withoutSlash = makeRule({ matchType: 'url', url: 'https://example.com/path' });

    expect(getCanonicalMatchValue(withSlash)).toBe(getCanonicalMatchValue(withoutSlash));
  });

  it('returns the regexp as-is, since regexp has no notion of canonicalization', () => {
    const rule = makeRule({ matchType: 'regexp', regexp: '^https://.*\\.example\\.com/' });

    expect(getCanonicalMatchValue(rule)).toBe('^https://.*\\.example\\.com/');
  });

  it('falls back to the raw value when the origin is not parseable', () => {
    const rule = makeRule({ matchType: 'origin', origin: 'not-a-url' });

    expect(getCanonicalMatchValue(rule)).toBe('not-a-url');
  });

  it('falls back to the raw value when the url is not parseable', () => {
    const rule = makeRule({ matchType: 'url', url: 'not-a-url' });

    expect(getCanonicalMatchValue(rule)).toBe('not-a-url');
  });
});
