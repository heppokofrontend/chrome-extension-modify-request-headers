import { describe, it, expect } from 'vitest';

import type { HeaderRule } from '@/types';
import { isMatchedRule } from '@/utils';

const makeRule = (overrides: Partial<HeaderRule> & Pick<HeaderRule, 'matchType'>): HeaderRule => ({
  url: '',
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
    const rule = makeRule({ matchType: 'prefix', url: 'chrome://extensions' });

    expect(isMatchedRule({ rule, url: new URL('chrome://extensions') })).toBe(false);
  });

  it('rejects protected hostnames (Chrome Web Store) even when the rule would otherwise match', () => {
    const rule = makeRule({ matchType: 'prefix', url: 'https://chromewebstore.google.com' });

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

    it('matches a raw (non-normalized) non-ASCII rule url against the browser-normalized tab url', () => {
      const rule = makeRule({ matchType: 'url', url: 'https://例え.com/' });

      expect(isMatchedRule({ rule, url: new URL('https://xn--r8jz45g.com/') })).toBe(true);
    });

    it('returns false instead of throwing when the rule url is not parseable', () => {
      const rule = makeRule({ matchType: 'url', url: 'not-a-url' });

      expect(isMatchedRule({ rule, url: new URL('https://example.com/') })).toBe(false);
    });

    it.each([
      ['a bare trailing slash', 'https://example.co/', true],
      ['an empty query string', 'https://example.co/?', false],
      ['an empty fragment', 'https://example.co/#', false],
      ['an additional path segment', 'https://example.co/hoge', false],
      ['an explicit port', 'https://example.co:8888', false],
    ])(
      'treats the target url with %s as %s against a bare-domain rule url',
      (_label, target, expected) => {
        const rule = makeRule({ matchType: 'url', url: 'https://example.co' });

        expect(isMatchedRule({ rule, url: new URL(target) })).toBe(expected);
      },
    );
  });

  describe('matchType: prefix', () => {
    it('matches when the tab url starts with the rule url', () => {
      const rule = makeRule({ matchType: 'prefix', url: 'https://example.com/api' });

      expect(isMatchedRule({ rule, url: new URL('https://example.com/api/v1/users') })).toBe(true);
      expect(isMatchedRule({ rule, url: new URL('https://example.com/other') })).toBe(false);
    });

    it('does not require an exact match unlike matchType: url', () => {
      const rule = makeRule({ matchType: 'prefix', url: 'https://example.com/api' });

      expect(isMatchedRule({ rule, url: new URL('https://example.com/api') })).toBe(true);
      expect(isMatchedRule({ rule, url: new URL('https://example.com/api2') })).toBe(true);
    });

    it('matches a raw (non-normalized) non-ASCII rule url against the browser-normalized tab url', () => {
      const rule = makeRule({ matchType: 'prefix', url: 'https://例え.com/' });

      expect(isMatchedRule({ rule, url: new URL('https://xn--r8jz45g.com/anything') })).toBe(true);
    });

    it('returns false instead of throwing when the rule url is not parseable', () => {
      const rule = makeRule({ matchType: 'prefix', url: 'not-a-url' });

      expect(isMatchedRule({ rule, url: new URL('https://example.com/') })).toBe(false);
    });

    it('matches when the port explicitly matches', () => {
      const rule = makeRule({ matchType: 'prefix', url: 'http://localhost:3000' });

      expect(isMatchedRule({ rule, url: new URL('http://localhost:3000/') })).toBe(true);
    });

    it('does not match a different domain that happens to share the rule url as a literal string prefix (e.g. .co vs .com)', () => {
      const rule = makeRule({ matchType: 'prefix', url: 'https://example.co/' });

      expect(isMatchedRule({ rule, url: new URL('https://example.com/') })).toBe(false);
    });

    it('matches the bare domain with or without a trailing slash, regardless of whether the rule url has one', () => {
      const withSlash = makeRule({ matchType: 'prefix', url: 'https://example.co/' });
      const withoutSlash = makeRule({ matchType: 'prefix', url: 'https://example.co' });

      expect(isMatchedRule({ rule: withSlash, url: new URL('https://example.co') })).toBe(true);
      expect(isMatchedRule({ rule: withSlash, url: new URL('https://example.co/') })).toBe(true);
      expect(isMatchedRule({ rule: withoutSlash, url: new URL('https://example.co') })).toBe(true);
      expect(isMatchedRule({ rule: withoutSlash, url: new URL('https://example.co/') })).toBe(true);
    });

    it.each([
      ['a subdomain of the rule prefix', 'https://example.com', 'https://sub.example.com/'],
      ['an unrelated hostname or superstring', 'https://example.com', 'https://notexample.com/'],
      ['a different scheme on the same host', 'https://example.com', 'http://example.com/'],
      [
        'a different port on the same host (e.g. localhost)',
        'http://localhost:3000',
        'http://localhost:4000/',
      ],
      ['a rule url that is not a valid URL', 'not-a-url', 'https://example.com/'],
    ])('does not match %s', (_label, prefix, url) => {
      const rule = makeRule({ matchType: 'prefix', url: prefix });

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
