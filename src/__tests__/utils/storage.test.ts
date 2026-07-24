import { describe, it, expect, vi, afterEach } from 'vitest';

import { getDefaultLastInput, getStorage, setStorage } from '@/utils';

const getDefaultSaveData = () => ({ rules: [], lastInput: getDefaultLastInput() });

const mockStoredData = (data: Record<string, unknown>) => {
  const get = vi.fn().mockImplementation((keys: unknown) => {
    if (typeof keys === 'string') {
      return Promise.resolve(keys in data ? { [keys]: data[keys] } : {});
    }
    return Promise.resolve(data);
  });

  vi.stubGlobal('chrome', { storage: { local: { get } } });
};

describe('getStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to defaults when nothing is stored', async () => {
    mockStoredData({});
    expect(await getStorage()).toStrictEqual(getDefaultSaveData());
  });

  it('falls back to defaults for null stored values', async () => {
    mockStoredData({ rules: null, lastInput: null });
    expect(await getStorage()).toStrictEqual(getDefaultSaveData());
  });

  it('merges saved fields with defaults, keeping unset fields at their default', async () => {
    const rules = [
      {
        id: 'rule-1',
        matchType: 'prefix' as const,
        url: 'https://api.example.com',
        regexp: '',
        headerName: 'Authorization',
        operation: 'set' as const,
        value: 'Bearer xxx',
        isActive: true,
      },
    ];

    mockStoredData({ rules });
    expect(await getStorage()).toStrictEqual({ ...getDefaultSaveData(), rules });
  });

  it('falls back to default rules when rules is not an array, while keeping a valid lastInput', async () => {
    mockStoredData({
      rules: { 'https://api.example.com': { headerName: 'X-Debug' } },
      lastInput: { matchType: 'regexp', operation: 'append' },
    });

    expect(await getStorage()).toStrictEqual({
      rules: [],
      lastInput: { matchType: 'regexp', operation: 'append' },
    });
  });

  it('falls back to default lastInput when the stored value is null or malformed', async () => {
    mockStoredData({
      rules: [],
      lastInput: null,
    });

    expect(await getStorage()).toStrictEqual(getDefaultSaveData());
  });

  it('falls back per-field to defaults when lastInput fields are present but not valid values', async () => {
    mockStoredData({
      rules: [],
      lastInput: { matchType: 'bogus', operation: 'append' },
    });

    expect(await getStorage()).toStrictEqual({
      rules: [],
      lastInput: { matchType: 'url', operation: 'append' },
    });

    mockStoredData({
      rules: [],
      lastInput: { matchType: 'prefix', operation: 'bogus' },
    });

    expect(await getStorage()).toStrictEqual({
      rules: [],
      lastInput: { matchType: 'prefix', operation: 'set' },
    });
  });

  it('drops malformed rule elements but keeps the well-formed ones', async () => {
    const validRule = {
      id: 'rule-1',
      matchType: 'url' as const,
      url: 'https://api.example.com',
      regexp: '',
      headerName: 'Authorization',
      operation: 'set' as const,
      value: 'Bearer xxx',
      isActive: true,
    };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    mockStoredData({
      rules: [validRule, { id: 'broken' }, 'not-an-object', null],
    });

    expect(await getStorage()).toStrictEqual({ ...getDefaultSaveData(), rules: [validRule] });
    expect(warnSpy).toHaveBeenCalledTimes(3);

    warnSpy.mockRestore();
  });

  it('returns fresh defaults instead of sharing nested references', async () => {
    mockStoredData({});

    const result = await getStorage();
    result.lastInput.matchType = 'regexp';
    result.rules.push({
      id: 'rule-1',
      matchType: 'url',
      url: 'https://api.example.com',
      regexp: '',
      headerName: 'Authorization',
      operation: 'set',
      value: 'Bearer xxx',
      isActive: true,
    });

    mockStoredData({});
    expect(await getStorage()).toStrictEqual(getDefaultSaveData());
  });

  it('reads only the requested key when called with a key argument', async () => {
    const rules = [
      {
        id: 'rule-1',
        matchType: 'url' as const,
        url: 'https://api.example.com',
        regexp: '',
        headerName: 'Authorization',
        operation: 'set' as const,
        value: 'Bearer xxx',
        isActive: true,
      },
    ];

    mockStoredData({ rules });
    expect(await getStorage('rules')).toStrictEqual(rules);
    expect(await getStorage('lastInput')).toStrictEqual(getDefaultSaveData().lastInput);
  });
});

const makeRule = (id: string) => ({
  id,
  matchType: 'url' as const,
  url: 'https://api.example.com/v1/users',
  regexp: '',
  headerName: 'X-Debug',
  operation: 'remove' as const,
  value: '',
  isActive: true,
});

describe('setStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes the current value for the key into the updater, writes only that key, and returns the result', async () => {
    const storedRules = [makeRule('rule-1')];
    const get = vi.fn().mockResolvedValue({ rules: storedRules });
    const set = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', { storage: { local: { get, set } } });

    const nextRules = [makeRule('rule-2')];
    const updater = vi.fn().mockReturnValue(nextRules);
    const result = await setStorage('rules', updater);

    expect(get).toHaveBeenCalledWith('rules');
    expect(updater).toHaveBeenCalledWith(storedRules);
    expect(set).toHaveBeenCalledWith({ rules: nextRules });
    expect(result).toBe(nextRules);
  });

  it('writes the value directly without reading the current value when it is not a function', async () => {
    const get = vi.fn();
    const set = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', { storage: { local: { get, set } } });

    const nextRules = [makeRule('rule-2')];
    const result = await setStorage('rules', nextRules);

    expect(get).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith({ rules: nextRules });
    expect(result).toBe(nextRules);
  });

  it('alerts, logs, and returns null without writing when storage.local.set rejects', async () => {
    const set = vi.fn().mockRejectedValue(new Error('quota exceeded'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    vi.stubGlobal('chrome', {
      storage: { local: { set } },
      i18n: { getMessage: (key: string) => key },
    });

    const result = await setStorage('rules', []);

    expect(alertSpy).toHaveBeenCalledWith('form_errSaveFailed');
    expect(errorSpy).toHaveBeenCalled();
    expect(result).toBeNull();

    alertSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('rejects the caller but keeps the write queue usable for subsequent calls when reading the current value throws', async () => {
    const get = vi.fn().mockRejectedValueOnce(new Error('storage unavailable'));
    vi.stubGlobal('chrome', { storage: { local: { get } } });

    await expect(setStorage('rules', (current) => current)).rejects.toThrow('storage unavailable');

    const storedRules = [makeRule('rule-1')];
    const get2 = vi.fn().mockResolvedValue({ rules: storedRules });
    const set2 = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', { storage: { local: { get: get2, set: set2 } } });

    const result = await setStorage('rules', (current) => current);

    expect(result).toStrictEqual(storedRules);
  });

  it('serializes concurrent calls to the same key so each updater sees the previous call’s result instead of stale storage', async () => {
    let storedRules: ReturnType<typeof makeRule>[] = [];
    const get = vi.fn().mockImplementation(() => Promise.resolve({ rules: storedRules }));
    const set = vi.fn().mockImplementation(({ rules }: { rules: typeof storedRules }) => {
      storedRules = rules;
    });
    vi.stubGlobal('chrome', { storage: { local: { get, set } } });

    const [firstResult, secondResult] = await Promise.all([
      setStorage('rules', [makeRule('first')]),
      setStorage('rules', (current) => [...current, makeRule('second')]),
    ]);

    expect(firstResult?.map((rule) => rule.id)).toStrictEqual(['first']);
    expect(secondResult?.map((rule) => rule.id)).toStrictEqual(['first', 'second']);
    expect(storedRules.map((rule) => rule.id)).toStrictEqual(['first', 'second']);
  });

  it('does not serialize writes to different keys', async () => {
    const events: string[] = [];
    let releaseRulesSet: () => void = () => undefined;

    const set = vi.fn().mockImplementation((items: Record<string, unknown>) => {
      if ('rules' in items) {
        events.push('rules:start');
        return new Promise<void>((resolve) => {
          releaseRulesSet = () => {
            events.push('rules:end');
            resolve();
          };
        });
      }

      events.push('lastInput:start');
      events.push('lastInput:end');
      return Promise.resolve();
    });
    vi.stubGlobal('chrome', { storage: { local: { get: vi.fn(), set } } });

    const rulesWrite = setStorage('rules', []);
    const lastInputWrite = setStorage('lastInput', { ...getDefaultSaveData().lastInput });

    await lastInputWrite;
    expect(events).toStrictEqual(['rules:start', 'lastInput:start', 'lastInput:end']);

    releaseRulesSet();
    await rulesWrite;
    expect(events).toStrictEqual(['rules:start', 'lastInput:start', 'lastInput:end', 'rules:end']);
  });
});
