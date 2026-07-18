import { describe, it, expect } from 'vitest';

import { getMatchValue } from '@/contexts/popup/utils';
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
