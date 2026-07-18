import { describe, it, expect, vi, afterEach } from 'vitest';

import { getDefaultSaveData, getSaveData, setSaveData } from '@/utils';

const mockStoredSaveData = (value: unknown) => {
  const get = vi.fn().mockResolvedValue({ saveData: value });

  vi.stubGlobal('chrome', { storage: { local: { get } } });
};

describe('getSaveData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to defaults for undefined or non-object stored value', async () => {
    mockStoredSaveData(undefined);
    expect(await getSaveData()).toStrictEqual(getDefaultSaveData());

    mockStoredSaveData(null);
    expect(await getSaveData()).toStrictEqual(getDefaultSaveData());
  });

  it('merges saved fields with defaults, keeping unset fields at their default', async () => {
    const rules = [
      {
        id: 'rule-1',
        matchType: 'origin' as const,
        origin: 'https://api.example.com',
        url: '',
        regexp: '',
        headerName: 'Authorization',
        operation: 'set' as const,
        value: 'Bearer xxx',
        isActive: true,
      },
    ];

    mockStoredSaveData({ rules });
    expect(await getSaveData()).toStrictEqual({ ...getDefaultSaveData(), rules });
  });

  it('falls back to default rules when rules is not an array, while keeping a valid formState', async () => {
    mockStoredSaveData({
      rules: { 'https://api.example.com': { headerName: 'X-Debug' } },
      formState: { matchType: 'regexp', operation: 'append' },
    });

    expect(await getSaveData()).toStrictEqual({
      rules: [],
      formState: { matchType: 'regexp', operation: 'append' },
    });
  });

  it('falls back to default formState when the stored value is null or malformed', async () => {
    mockStoredSaveData({
      rules: [],
      formState: null,
    });

    expect(await getSaveData()).toStrictEqual(getDefaultSaveData());
  });

  it('falls back per-field to defaults when formState fields are present but not valid values', async () => {
    mockStoredSaveData({
      rules: [],
      formState: { matchType: 'bogus', operation: 'append' },
    });

    expect(await getSaveData()).toStrictEqual({
      rules: [],
      formState: { matchType: 'url', operation: 'append' },
    });

    mockStoredSaveData({
      rules: [],
      formState: { matchType: 'origin', operation: 'bogus' },
    });

    expect(await getSaveData()).toStrictEqual({
      rules: [],
      formState: { matchType: 'origin', operation: 'set' },
    });
  });

  it('drops malformed rule elements but keeps the well-formed ones', async () => {
    const validRule = {
      id: 'rule-1',
      matchType: 'origin' as const,
      origin: 'https://api.example.com',
      url: '',
      regexp: '',
      headerName: 'Authorization',
      operation: 'set' as const,
      value: 'Bearer xxx',
      isActive: true,
    };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    mockStoredSaveData({
      rules: [validRule, { id: 'broken' }, 'not-an-object', null],
    });

    expect(await getSaveData()).toStrictEqual({ ...getDefaultSaveData(), rules: [validRule] });
    expect(warnSpy).toHaveBeenCalledTimes(3);

    warnSpy.mockRestore();
  });

  it('returns fresh defaults instead of sharing nested references', async () => {
    mockStoredSaveData(undefined);

    const result = await getSaveData();
    result.formState.matchType = 'regexp';
    result.rules.push({
      id: 'rule-1',
      matchType: 'origin',
      origin: 'https://api.example.com',
      url: '',
      regexp: '',
      headerName: 'Authorization',
      operation: 'set',
      value: 'Bearer xxx',
      isActive: true,
    });

    mockStoredSaveData(undefined);
    expect(await getSaveData()).toStrictEqual(getDefaultSaveData());
  });
});

const makeRule = (id: string) => ({
  id,
  matchType: 'url' as const,
  origin: '',
  url: 'https://api.example.com/v1/users',
  regexp: '',
  headerName: 'X-Debug',
  operation: 'remove' as const,
  value: '',
  isActive: true,
});

describe('setSaveData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes the storage value into the updater, writes its result to storage, and returns it on success', async () => {
    const storedValue = { ...getDefaultSaveData(), rules: [makeRule('rule-1')] };
    const get = vi.fn().mockResolvedValue({ saveData: storedValue });
    const set = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', { storage: { local: { get, set } } });

    const value = { ...getDefaultSaveData(), rules: [makeRule('rule-2')] };
    const updater = vi.fn().mockReturnValue(value);
    const result = await setSaveData(updater);

    expect(updater).toHaveBeenCalledWith(storedValue);
    expect(set).toHaveBeenCalledWith({ saveData: value });
    expect(result).toBe(value);
  });

  it('alerts, logs, and returns null without writing when storage.local.set rejects', async () => {
    const storedValue = { ...getDefaultSaveData(), rules: [makeRule('rule-1')] };
    const get = vi.fn().mockResolvedValue({ saveData: storedValue });
    const set = vi.fn().mockRejectedValue(new Error('quota exceeded'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    vi.stubGlobal('chrome', {
      storage: { local: { get, set } },
      i18n: { getMessage: (key: string) => key },
    });

    const result = await setSaveData((current) => ({ ...current, rules: [] }));

    expect(alertSpy).toHaveBeenCalledWith('form_errSaveFailed');
    expect(errorSpy).toHaveBeenCalled();
    expect(result).toBeNull();

    alertSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('rejects the caller but keeps the write queue usable for subsequent calls when reading the current value throws', async () => {
    const get = vi.fn().mockRejectedValueOnce(new Error('storage unavailable'));
    vi.stubGlobal('chrome', { storage: { local: { get } } });

    await expect(setSaveData((current) => current)).rejects.toThrow('storage unavailable');

    const storedValue = { ...getDefaultSaveData(), rules: [makeRule('rule-1')] };
    const get2 = vi.fn().mockResolvedValue({ saveData: storedValue });
    const set2 = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', { storage: { local: { get: get2, set: set2 } } });

    const result = await setSaveData((current) => current);

    expect(result).toStrictEqual(storedValue);
  });

  it('serializes concurrent calls so each updater sees the previous call’s result instead of stale storage', async () => {
    let stored = getDefaultSaveData();
    const get = vi.fn().mockImplementation(() => ({ saveData: stored }));
    const set = vi.fn().mockImplementation(({ saveData }: { saveData: typeof stored }) => {
      stored = saveData;
    });
    vi.stubGlobal('chrome', { storage: { local: { get, set } } });

    const [firstResult, secondResult] = await Promise.all([
      setSaveData((current) => ({ ...current, rules: [makeRule('first')] })),
      setSaveData((current) => ({
        ...current,
        rules: [...current.rules, makeRule('second')],
      })),
    ]);

    expect(firstResult && firstResult.rules.map((rule) => rule.id)).toStrictEqual(['first']);
    expect(secondResult && secondResult.rules.map((rule) => rule.id)).toStrictEqual([
      'first',
      'second',
    ]);
    expect(stored.rules.map((rule) => rule.id)).toStrictEqual(['first', 'second']);
  });
});
