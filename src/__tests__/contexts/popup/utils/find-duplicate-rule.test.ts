import { describe, it, expect, beforeEach } from 'vitest';

import { STATE } from '@/contexts/popup/state';
import { findDuplicateRule } from '@/contexts/popup/utils';
import type { HeaderRule, SaveData } from '@/types';

const lastInput: SaveData['lastInput'] = {
  matchType: 'url',
  operation: 'set',
};
const makeRule = (
  overrides: Partial<HeaderRule> & Pick<HeaderRule, 'id' | 'matchType'>,
): HeaderRule => ({
  url: '',
  regexp: '',
  headerName: 'X-Test',
  operation: 'set',
  value: '',
  isActive: true,
  ...overrides,
});

describe('findDuplicateRule', () => {
  beforeEach(() => {
    Object.assign(STATE, { rules: [], formState: lastInput });
  });

  it('finds an existing rule with the same matchType, matching value, and headerName', () => {
    const existing = makeRule({
      id: 'a',
      matchType: 'prefix',
      url: 'https://example.com',
      headerName: 'X-Foo',
    });
    Object.assign(STATE, { rules: [existing], formState: lastInput });

    const candidate = makeRule({
      id: 'b',
      matchType: 'prefix',
      url: 'https://example.com',
      headerName: 'X-Foo',
    });

    expect(findDuplicateRule(candidate)).toBe(existing);
  });

  it('excludes the rule itself (same id) from being reported as its own duplicate', () => {
    const rule = makeRule({
      id: 'a',
      matchType: 'prefix',
      url: 'https://example.com',
      headerName: 'X-Foo',
    });
    Object.assign(STATE, { rules: [rule], formState: lastInput });

    expect(findDuplicateRule(rule)).toBeNull();
  });

  it('does not match when matchType differs, even with the same matching value', () => {
    Object.assign(STATE, {
      rules: [
        makeRule({ id: 'a', matchType: 'url', url: 'https://example.com', headerName: 'X-Foo' }),
      ],
      formState: lastInput,
    });

    const candidate = makeRule({
      id: 'b',
      matchType: 'prefix',
      url: 'https://example.com',
      headerName: 'X-Foo',
    });

    expect(findDuplicateRule(candidate)).toBeNull();
  });

  it('does not match when the matching value differs', () => {
    Object.assign(STATE, {
      rules: [
        makeRule({
          id: 'a',
          matchType: 'prefix',
          url: 'https://a.example.com',
          headerName: 'X-Foo',
        }),
      ],
      formState: lastInput,
    });

    const candidate = makeRule({
      id: 'b',
      matchType: 'prefix',
      url: 'https://b.example.com',
      headerName: 'X-Foo',
    });

    expect(findDuplicateRule(candidate)).toBeNull();
  });

  it('does not match when headerName differs', () => {
    Object.assign(STATE, {
      rules: [
        makeRule({
          id: 'a',
          matchType: 'prefix',
          url: 'https://example.com',
          headerName: 'X-Foo',
        }),
      ],
      formState: lastInput,
    });

    const candidate = makeRule({
      id: 'b',
      matchType: 'prefix',
      url: 'https://example.com',
      headerName: 'X-Bar',
    });

    expect(findDuplicateRule(candidate)).toBeNull();
  });

  it('matches a trailing-slash url and its slash-less form as the same target', () => {
    const existing = makeRule({
      id: 'a',
      matchType: 'url',
      url: 'https://example.com/path',
      headerName: 'X-Foo',
    });
    Object.assign(STATE, { rules: [existing], formState: lastInput });

    const candidate = makeRule({
      id: 'b',
      matchType: 'url',
      url: 'https://example.com/path/',
      headerName: 'X-Foo',
    });

    expect(findDuplicateRule(candidate)).toBe(existing);
  });

  it('matches a non-ASCII prefix and its punycode-encoded form as the same target', () => {
    const existing = makeRule({
      id: 'a',
      matchType: 'prefix',
      url: 'https://xn--r8jz45g.com',
      headerName: 'X-Foo',
    });
    Object.assign(STATE, { rules: [existing], formState: lastInput });

    const candidate = makeRule({
      id: 'b',
      matchType: 'prefix',
      url: 'https://例え.com',
      headerName: 'X-Foo',
    });

    expect(findDuplicateRule(candidate)).toBe(existing);
  });
});
