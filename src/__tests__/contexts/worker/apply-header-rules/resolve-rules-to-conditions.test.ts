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
  origin: '',
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

    it('excludes a rule with a non-ASCII url', () => {
      const rule = makeRule({ matchType: 'url', url: 'https://例え.com/' });

      expect(resolveCondition(rule)).toBeUndefined();
    });
  });

  describe('matchType: origin', () => {
    it('builds a urlFilter anchored to the full origin', () => {
      const rule = makeRule({ matchType: 'origin', origin: 'https://api.example.com' });

      expect(resolveCondition(rule)).toStrictEqual({
        urlFilter: '|https://api.example.com/',
        resourceTypes: RESOURCE_TYPES,
      });
    });

    it('keeps the port in the urlFilter, so different ports on the same host are distinct rules', () => {
      const rule = makeRule({ matchType: 'origin', origin: 'http://localhost:3000' });

      expect(resolveCondition(rule)).toStrictEqual({
        urlFilter: '|http://localhost:3000/',
        resourceTypes: RESOURCE_TYPES,
      });
    });

    it('ends the urlFilter with a literal "/" rather than "^", since "^" also matches ":" and would swallow a different port', () => {
      const port3000 = makeRule({ matchType: 'origin', origin: 'http://localhost:3000' });
      const port4000 = makeRule({ matchType: 'origin', origin: 'http://localhost:4000' });

      expect(resolveCondition(port3000)).not.toStrictEqual(resolveCondition(port4000));
      expect(resolveCondition(port3000)?.urlFilter).not.toContain('^');
    });

    it('keeps the scheme in the urlFilter, so http and https on the same host are distinct rules', () => {
      const httpRule = makeRule({ matchType: 'origin', origin: 'http://example.com' });
      const httpsRule = makeRule({ matchType: 'origin', origin: 'https://example.com' });

      expect(resolveCondition(httpRule)).not.toStrictEqual(resolveCondition(httpsRule));
    });

    it('excludes a rule whose origin is not a parseable URL', () => {
      const rule = makeRule({ matchType: 'origin', origin: 'not-a-url' });

      expect(resolveCondition(rule)).toBeUndefined();
    });

    it('excludes a rule whose origin contains more than scheme + host + port (e.g. a path)', () => {
      const rule = makeRule({ matchType: 'origin', origin: 'https://example.com/path' });

      expect(resolveCondition(rule)).toBeUndefined();
    });
  });

  describe('matchType: regexp', () => {
    it('passes the pattern through as regexFilter', () => {
      const rule = makeRule({ matchType: 'regexp', regexp: '^https://.*\\.example\\.com/' });

      expect(resolveCondition(rule)).toStrictEqual({
        regexFilter: '^https://.*\\.example\\.com/',
        resourceTypes: RESOURCE_TYPES,
      });
    });

    it('excludes a rule with an invalid regexp', () => {
      const rule = makeRule({ matchType: 'regexp', regexp: '(unterminated' });

      expect(resolveCondition(rule)).toBeUndefined();
    });
  });
});
