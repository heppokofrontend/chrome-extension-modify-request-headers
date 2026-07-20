import { describe, it, expect, vi } from 'vitest';

import { resolveRulesToConditions } from '@/contexts/worker/apply-header-rules/resolve-rules-to-conditions';
import type { HeaderRule } from '@/types';

vi.hoisted(() => {
  vi.stubGlobal('chrome', {
    declarativeNetRequest: {
      HeaderOperation: { SET: 'set', APPEND: 'append', REMOVE: 'remove' },
      RuleActionType: { MODIFY_HEADERS: 'modifyHeaders' },
      ResourceType: { MAIN_FRAME: 'main_frame', SUB_FRAME: 'sub_frame' },
    },
  });
});

const RESOURCE_TYPES = ['main_frame', 'sub_frame'];

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

const resolveCondition = (rule: HeaderRule) => resolveRulesToConditions([rule])[0]?.condition;

describe('resolveRulesToConditions', () => {
  describe('matchType: url', () => {
    it('builds a urlFilter anchored to the full url, trailing slash optional', () => {
      const rule = makeRule({ matchType: 'url', url: 'https://example.com/path' });

      expect(resolveCondition(rule)).toStrictEqual({
        urlFilter: '|https://example.com/path^|',
        resourceTypes: RESOURCE_TYPES,
        isUrlFilterCaseSensitive: true,
      });
    });

    it('produces the same urlFilter whether or not the saved url has a trailing slash', () => {
      const withSlash = makeRule({ matchType: 'url', url: 'https://example.com/path/' });
      const withoutSlash = makeRule({ matchType: 'url', url: 'https://example.com/path' });

      expect(resolveCondition(withSlash)).toStrictEqual(resolveCondition(withoutSlash));
    });

    it('excludes a rule with a blank url', () => {
      const rule = makeRule({ matchType: 'url', url: '   ' });

      expect(resolveCondition(rule)).toBeUndefined();
    });

    it('builds a urlFilter from the punycode-normalized form of a non-ASCII url', () => {
      const rule = makeRule({ matchType: 'url', url: 'https://例え.com/' });

      expect(resolveCondition(rule)).toStrictEqual({
        urlFilter: '|https://xn--r8jz45g.com^|',
        resourceTypes: RESOURCE_TYPES,
        isUrlFilterCaseSensitive: true,
      });
    });

    it('excludes a rule whose scheme declarativeNetRequest cannot intervene on', () => {
      const rule = makeRule({ matchType: 'url', url: 'ftp://example.com/path' });

      expect(resolveCondition(rule)).toBeUndefined();
    });
  });

  describe('matchType: prefix', () => {
    it('builds a urlFilter anchored to the start of the url, with no end anchor', () => {
      const rule = makeRule({ matchType: 'prefix', url: 'https://api.example.com' });

      expect(resolveCondition(rule)).toStrictEqual({
        urlFilter: '|https://api.example.com/',
        resourceTypes: RESOURCE_TYPES,
        isUrlFilterCaseSensitive: true,
      });
    });

    it('keeps the port in the urlFilter, so different ports on the same host are distinct rules', () => {
      const rule = makeRule({ matchType: 'prefix', url: 'http://localhost:3000' });

      expect(resolveCondition(rule)).toStrictEqual({
        urlFilter: '|http://localhost:3000/',
        resourceTypes: RESOURCE_TYPES,
        isUrlFilterCaseSensitive: true,
      });
    });

    it('does not use the "^" token, since prefix matching has no end anchor to speak of', () => {
      const port3000 = makeRule({ matchType: 'prefix', url: 'http://localhost:3000' });
      const port4000 = makeRule({ matchType: 'prefix', url: 'http://localhost:4000' });

      expect(resolveCondition(port3000)).not.toStrictEqual(resolveCondition(port4000));
      expect(resolveCondition(port3000)?.urlFilter).not.toContain('^');
    });

    it('keeps the scheme in the urlFilter, so http and https on the same host are distinct rules', () => {
      const httpRule = makeRule({ matchType: 'prefix', url: 'http://example.com' });
      const httpsRule = makeRule({ matchType: 'prefix', url: 'https://example.com' });

      expect(resolveCondition(httpRule)).not.toStrictEqual(resolveCondition(httpsRule));
    });

    it('builds a urlFilter from the punycode-normalized form of a non-ASCII url', () => {
      const rule = makeRule({ matchType: 'prefix', url: 'https://例え.com' });

      expect(resolveCondition(rule)).toStrictEqual({
        urlFilter: '|https://xn--r8jz45g.com/',
        resourceTypes: RESOURCE_TYPES,
        isUrlFilterCaseSensitive: true,
      });
    });

    it('excludes a rule whose url is not a parseable URL', () => {
      const rule = makeRule({ matchType: 'prefix', url: 'not-a-url' });

      expect(resolveCondition(rule)).toBeUndefined();
    });

    it('produces the same urlFilter (with trailing slash) whether or not the saved bare-domain url has one', () => {
      const withSlash = makeRule({ matchType: 'prefix', url: 'https://example.co/' });
      const withoutSlash = makeRule({ matchType: 'prefix', url: 'https://example.co' });

      expect(resolveCondition(withSlash)).toStrictEqual(resolveCondition(withoutSlash));
      expect(resolveCondition(withSlash)?.urlFilter).toBe('|https://example.co/');
    });

    it('does not produce a urlFilter that would also prefix-match an unrelated domain (e.g. .co vs .com)', () => {
      const coRule = makeRule({ matchType: 'prefix', url: 'https://example.co' });
      const comRule = makeRule({ matchType: 'prefix', url: 'https://example.com' });

      expect(resolveCondition(coRule)?.urlFilter).not.toBe(resolveCondition(comRule)?.urlFilter);
      expect(
        'https://example.com/'.startsWith(resolveCondition(coRule)?.urlFilter?.slice(1) ?? ''),
      ).toBe(false);
    });

    it('keeps a path in the urlFilter, since prefix (unlike origin) is meant to match by path prefix too', () => {
      const rule = makeRule({ matchType: 'prefix', url: 'https://example.com/api' });

      expect(resolveCondition(rule)).toStrictEqual({
        urlFilter: '|https://example.com/api',
        resourceTypes: RESOURCE_TYPES,
        isUrlFilterCaseSensitive: true,
      });
    });
  });

  describe('matchType: regexp', () => {
    it('passes the pattern through as regexFilter', () => {
      const rule = makeRule({ matchType: 'regexp', regexp: '^https://.*\\.example\\.com/' });

      expect(resolveCondition(rule)).toStrictEqual({
        regexFilter: '^https://.*\\.example\\.com/',
        resourceTypes: RESOURCE_TYPES,
        isUrlFilterCaseSensitive: true,
      });
    });

    it('marks the condition case-sensitive, since popup-side matching is case-sensitive and Chrome 118+ defaults regexFilter to case-insensitive', () => {
      const rule = makeRule({ matchType: 'regexp', regexp: '/API/' });

      expect(resolveCondition(rule)).toMatchObject({ isUrlFilterCaseSensitive: true });
    });

    it('excludes a rule with an invalid regexp', () => {
      const rule = makeRule({ matchType: 'regexp', regexp: '(unterminated' });

      expect(resolveCondition(rule)).toBeUndefined();
    });
  });
});
