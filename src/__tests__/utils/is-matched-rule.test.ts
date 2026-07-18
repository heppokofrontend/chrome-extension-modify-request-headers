import { describe, it, expect } from 'vitest';

import type { HeaderRule } from '@/types';
import { isMatchedRule } from '@/utils';

const makeRule = (overrides: Partial<HeaderRule> & Pick<HeaderRule, 'matchType'>): HeaderRule => ({
  url: '',
  origin: '',
  regexp: '',
  headerName: 'X-Test',
  operation: 'set',
  value: '',
  isActive: true,
  id: 'test-id',
  ...overrides,
});

describe('isMatchedRule', () => {
  it('rejects non-http(s) urls even when the rule would otherwise match', () => {
    const rule = makeRule({ matchType: 'origin', origin: 'chrome://extensions' });

    expect(isMatchedRule({ rule, url: new URL('chrome://extensions') })).toBe(false);
  });

  it('rejects protected hostnames (Chrome Web Store) even when the rule would otherwise match', () => {
    const rule = makeRule({ matchType: 'origin', origin: 'https://chromewebstore.google.com' });

    expect(
      isMatchedRule({ rule, url: new URL('https://chromewebstore.google.com/detail/foo') }),
    ).toBe(false);
  });

  describe('matchType: url', () => {
    it('matches on exact href equality', () => {
      const rule = makeRule({ matchType: 'url', url: 'https://example.com/path' });

      expect(isMatchedRule({ rule, url: new URL('https://example.com/path') })).toBe(true);
      expect(isMatchedRule({ rule, url: new URL('https://example.com/other') })).toBe(false);
    });

    it('treats a trailing slash difference as the same URL', () => {
      const withSlash = makeRule({ matchType: 'url', url: 'https://example.com/path/' });
      const withoutSlash = makeRule({ matchType: 'url', url: 'https://example.com/path' });

      expect(isMatchedRule({ rule: withSlash, url: new URL('https://example.com/path') })).toBe(
        true,
      );
      expect(isMatchedRule({ rule: withoutSlash, url: new URL('https://example.com/path/') })).toBe(
        true,
      );
    });
  });

  describe('matchType: origin', () => {
    it('matches the exact origin regardless of path', () => {
      const rule = makeRule({ matchType: 'origin', origin: 'https://api.example.com' });

      expect(isMatchedRule({ rule, url: new URL('https://api.example.com/anything') })).toBe(true);
    });

    it('matches when the port explicitly matches', () => {
      const rule = makeRule({ matchType: 'origin', origin: 'http://localhost:3000' });

      expect(isMatchedRule({ rule, url: new URL('http://localhost:3000/') })).toBe(true);
    });

    it.each([
      ['a subdomain of the rule origin', 'https://example.com', 'https://sub.example.com/'],
      ['an unrelated hostname or superstring', 'https://example.com', 'https://notexample.com/'],
      ['a different scheme on the same host', 'https://example.com', 'http://example.com/'],
      [
        'a different port on the same host (e.g. localhost)',
        'http://localhost:3000',
        'http://localhost:4000/',
      ],
      ['a rule origin that is not a valid URL', 'not-a-url', 'https://example.com/'],
    ])('does not match %s', (_label, origin, url) => {
      const rule = makeRule({ matchType: 'origin', origin });

      expect(isMatchedRule({ rule, url: new URL(url) })).toBe(false);
    });
  });

  describe('matchType: regexp', () => {
    it('matches when the pattern tests true against the href', () => {
      const rule = makeRule({ matchType: 'regexp', regexp: '^https://.*\\.example\\.com/' });

      expect(isMatchedRule({ rule, url: new URL('https://api.example.com/') })).toBe(true);
      expect(isMatchedRule({ rule, url: new URL('https://example.org/') })).toBe(false);
    });

    it('swallows invalid regexp patterns and returns false', () => {
      const rule = makeRule({ matchType: 'regexp', regexp: '(unterminated' });

      expect(isMatchedRule({ rule, url: new URL('https://example.com/') })).toBe(false);
    });
  });
});
