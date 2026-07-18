import { describe, it, expect, vi, beforeEach } from 'vitest';

import { queueApplyHeaderRules } from '@/contexts/worker/apply-header-rules';

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

beforeEach(() => {
  getDynamicRulesMock.mockReset().mockResolvedValue([]);
  updateDynamicRulesMock.mockReset().mockResolvedValue(undefined);
});

describe('queueApplyHeaderRules', () => {
  it('does not start the next call until the previous one settles', async () => {
    let resolveFirst: () => void = () => {};

    getDynamicRulesMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = () => {
            resolve([]);
          };
        }),
    );

    const firstCall = queueApplyHeaderRules([]);
    const secondCall = queueApplyHeaderRules([]);

    await Promise.resolve();
    await Promise.resolve();
    expect(getDynamicRulesMock).toHaveBeenCalledTimes(1);

    resolveFirst();
    await firstCall;
    await secondCall;

    expect(getDynamicRulesMock).toHaveBeenCalledTimes(2);
  });

  it('still runs the next call even if the previous one rejects', async () => {
    updateDynamicRulesMock.mockRejectedValueOnce(new Error('quota exceeded'));

    const firstCall = queueApplyHeaderRules([]);
    const secondCall = queueApplyHeaderRules([]);

    await expect(firstCall).rejects.toThrow('quota exceeded');
    await expect(secondCall).resolves.toBeUndefined();
    expect(getDynamicRulesMock).toHaveBeenCalledTimes(2);
  });
});
