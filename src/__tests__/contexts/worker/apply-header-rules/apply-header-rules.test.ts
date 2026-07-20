import { describe, it, expect, vi, beforeEach } from 'vitest';

import { applyHeaderRules } from '@/contexts/worker/apply-header-rules/apply-header-rules';
import type { HeaderRule } from '@/types';

const { getDynamicRulesMock, updateDynamicRulesMock } = vi.hoisted(() => {
  const getDynamicRulesMock = vi.fn();
  const updateDynamicRulesMock = vi.fn();

  vi.stubGlobal('chrome', {
    declarativeNetRequest: {
      HeaderOperation: { SET: 'set', APPEND: 'append', REMOVE: 'remove' },
      RuleActionType: { MODIFY_HEADERS: 'modifyHeaders' },
      ResourceType: { MAIN_FRAME: 'main_frame' },
      getDynamicRules: getDynamicRulesMock,
      updateDynamicRules: updateDynamicRulesMock,
    },
  });

  return { getDynamicRulesMock, updateDynamicRulesMock };
});

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

beforeEach(() => {
  getDynamicRulesMock.mockReset().mockResolvedValue([]);
  updateDynamicRulesMock.mockReset().mockResolvedValue(undefined);
});

describe('applyHeaderRules', () => {
  it('excludes inactive rules and assigns ids by original array position (1-based)', async () => {
    await applyHeaderRules([
      makeRule({ id: 'a', matchType: 'prefix', url: 'https://a.example.com', isActive: false }),
      makeRule({ id: 'b', matchType: 'prefix', url: 'https://b.example.com', isActive: true }),
    ]);

    expect(updateDynamicRulesMock).toHaveBeenCalledTimes(1);
    const { addRules } = updateDynamicRulesMock.mock.calls[0]?.[0] as {
      addRules: { id: number }[];
    };

    // 除外された1件目を数えずには振り直さない: 元配列の登場順（index+1）のまま。
    expect(addRules).toHaveLength(1);
    expect(addRules[0]?.id).toBe(2);
  });

  it('excludes rules whose condition cannot be built (e.g. unparsable url)', async () => {
    await applyHeaderRules([makeRule({ id: 'a', matchType: 'prefix', url: 'not-a-url' })]);

    const { addRules } = updateDynamicRulesMock.mock.calls[0]?.[0] as { addRules: unknown[] };

    expect(addRules).toHaveLength(0);
  });

  it('omits the value field from requestHeaders when operation is remove', async () => {
    await applyHeaderRules([
      makeRule({
        id: 'a',
        matchType: 'prefix',
        url: 'https://example.com',
        operation: 'remove',
        headerName: 'X-Remove-Me',
        value: 'should-not-appear',
      }),
    ]);

    const { addRules } = updateDynamicRulesMock.mock.calls[0]?.[0] as {
      addRules: { action: { requestHeaders: { header: string; value?: string }[] } }[];
    };

    expect(addRules[0]?.action.requestHeaders[0]).toStrictEqual({
      header: 'X-Remove-Me',
      operation: 'remove',
    });
  });

  it('passes the existing dynamic rule ids through as removeRuleIds, even with nothing to add', async () => {
    getDynamicRulesMock.mockResolvedValue([{ id: 10 }, { id: 11 }]);

    await applyHeaderRules([]);

    expect(updateDynamicRulesMock).toHaveBeenCalledTimes(1);
    expect(updateDynamicRulesMock).toHaveBeenCalledWith({ removeRuleIds: [10, 11], addRules: [] });
  });

  it('drops the rejected rule id reported by Chrome and retries with the rest', async () => {
    updateDynamicRulesMock
      .mockRejectedValueOnce(new Error('Rule with id 2 has an invalid header name.'))
      .mockResolvedValueOnce(undefined);

    await applyHeaderRules([
      makeRule({ id: 'a', matchType: 'prefix', url: 'https://a.example.com' }),
      makeRule({ id: 'b', matchType: 'prefix', url: 'https://b.example.com' }),
      makeRule({ id: 'c', matchType: 'prefix', url: 'https://c.example.com' }),
    ]);

    expect(updateDynamicRulesMock).toHaveBeenCalledTimes(2);

    const retry = updateDynamicRulesMock.mock.calls[1]?.[0] as { addRules: { id: number }[] };

    expect(retry.addRules.map((rule) => rule.id)).toStrictEqual([1, 3]);
  });

  it('rethrows immediately when the error is not a recognizable rejected-rule message', async () => {
    const unrelatedError = new Error('quota exceeded');

    updateDynamicRulesMock.mockRejectedValueOnce(unrelatedError);

    await expect(
      applyHeaderRules([makeRule({ id: 'a', matchType: 'prefix', url: 'https://example.com' })]),
    ).rejects.toBe(unrelatedError);
    expect(updateDynamicRulesMock).toHaveBeenCalledTimes(1);
  });

  it('rethrows immediately when the rejection is not an Error instance', async () => {
    updateDynamicRulesMock.mockRejectedValueOnce('not an Error');

    await expect(
      applyHeaderRules([makeRule({ id: 'a', matchType: 'prefix', url: 'https://example.com' })]),
    ).rejects.toBe('not an Error');
    expect(updateDynamicRulesMock).toHaveBeenCalledTimes(1);
  });

  it('rethrows instead of retrying when the rejected id is not one of the rules being added', async () => {
    const staleIdError = new Error('Rule with id 99 has an invalid header name.');

    updateDynamicRulesMock.mockRejectedValueOnce(staleIdError);

    await expect(
      applyHeaderRules([makeRule({ id: 'a', matchType: 'prefix', url: 'https://example.com' })]),
    ).rejects.toBe(staleIdError);
    expect(updateDynamicRulesMock).toHaveBeenCalledTimes(1);
  });
});
