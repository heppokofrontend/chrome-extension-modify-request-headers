import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import type { SaveData } from '@/types';
import popupHtml from '@package/popup.html?raw';

const formState: SaveData['formState'] = {
  matchType: 'url',
  operation: 'set',
};

describe('form/handlers/on-form-submit/on-form-submit', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let STATE: typeof import('@/contexts/popup/state').STATE;
  let applyMatchTypeVisibility: typeof import('@/contexts/popup/components/form/effects').applyMatchTypeVisibility;
  let submitForm: typeof import('@/contexts/popup/components/form/handlers/on-form-submit/on-form-submit').submitForm;

  const storageGetMock = vi.fn();
  const storageSetMock = vi.fn();
  const tabsQueryMock = vi.fn();
  const isRegexSupportedMock = vi.fn();

  const submit = () => submitForm();

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;

    vi.stubGlobal('chrome', {
      i18n: { getMessage: (key: string) => key },
      storage: { local: { get: storageGetMock, set: storageSetMock } },
      tabs: { query: tabsQueryMock },
      declarativeNetRequest: { isRegexSupported: isRegexSupportedMock },
    });

    ({ UI } = await import('@/contexts/popup/constants'));
    ({ STATE } = await import('@/contexts/popup/state'));
    ({ applyMatchTypeVisibility } = await import('@/contexts/popup/components/form/effects'));
    ({ submitForm } =
      await import('@/contexts/popup/components/form/handlers/on-form-submit/on-form-submit'));
  });

  beforeEach(() => {
    // setStorage は STATE ではなく storage の実値を previous として読み直すため、
    // storage は常に STATE の該当 key を反映している体でモックする。
    storageGetMock.mockReset().mockImplementation((key: keyof SaveData) => ({ [key]: STATE[key] }));
    storageSetMock.mockReset().mockResolvedValue(undefined);
    tabsQueryMock.mockReset().mockResolvedValue([]);
    isRegexSupportedMock.mockReset().mockResolvedValue({ isSupported: true });

    STATE.editingId = '';
    Object.assign(STATE, { rules: [], formState });

    UI.matchTypeSelect.value = 'url';
    applyMatchTypeVisibility('url');
    UI.urlInput.value = '';
    UI.regexpInput.value = '';
    UI.headerNameInput.value = '';
    UI.operationSelect.value = 'set';
    UI.valueInput.value = '';
    UI.isActiveSelect.value = 'true';
  });

  it('does not save when matchType is not recognized', async () => {
    UI.matchTypeSelect.innerHTML += '<option value="bogus" selected>bogus</option>';
    UI.headerNameInput.value = 'X-Foo';

    await submit();

    expect(STATE.rules).toHaveLength(0);
    expect(storageSetMock).not.toHaveBeenCalled();
  });

  it('does not save when a required field (e.g. url) is left empty', async () => {
    UI.headerNameInput.value = 'X-Foo';

    await submit();

    expect(STATE.rules).toHaveLength(0);
    expect(storageSetMock).not.toHaveBeenCalled();
  });

  it('does not save when the header name is whitespace-only (passes required, but trims to empty)', async () => {
    UI.urlInput.value = 'https://example.com/path';
    UI.headerNameInput.value = '   ';

    await submit();

    expect(STATE.rules).toHaveLength(0);
    expect(storageSetMock).not.toHaveBeenCalled();
  });

  it('does not save when url is whitespace-only (passes required, but is not a safe url)', async () => {
    UI.urlInput.value = '   ';
    UI.headerNameInput.value = 'X-Foo';

    await submit();

    expect(STATE.rules).toHaveLength(0);
    expect(storageSetMock).not.toHaveBeenCalled();
  });

  it('does not save when url is whitespace-only when matchType is prefix', async () => {
    UI.matchTypeSelect.value = 'prefix';
    applyMatchTypeVisibility('prefix');
    UI.urlInput.value = '   ';
    UI.headerNameInput.value = 'X-Foo';

    await submit();

    expect(STATE.rules).toHaveLength(0);
    expect(storageSetMock).not.toHaveBeenCalled();
  });

  it('does not save when regexp is whitespace-only when matchType is regexp', async () => {
    UI.matchTypeSelect.value = 'regexp';
    applyMatchTypeVisibility('regexp');
    UI.regexpInput.value = '   ';
    UI.headerNameInput.value = 'X-Foo';

    await submit();

    expect(STATE.rules).toHaveLength(0);
    expect(storageSetMock).not.toHaveBeenCalled();
    expect(isRegexSupportedMock).not.toHaveBeenCalled();
  });

  it('builds a candidate from the current form values and saves it as a new rule', async () => {
    UI.matchTypeSelect.value = 'url';
    UI.urlInput.value = 'https://example.com/path';
    UI.headerNameInput.value = 'X-New';
    UI.operationSelect.value = 'append';
    UI.valueInput.value = 'hello';
    UI.isActiveSelect.value = 'false';

    await submit();

    expect(STATE.rules).toHaveLength(1);
    expect(STATE.rules[0]).toMatchObject({
      matchType: 'url',
      url: 'https://example.com/path',
      headerName: 'X-New',
      operation: 'append',
      value: 'hello',
      isActive: false,
    });
  });

  it('keeps the raw url input as-is, without adding a trailing slash (normalization happens at match/apply time)', async () => {
    UI.matchTypeSelect.value = 'url';
    UI.urlInput.value = 'https://heppokofrontend.dev';
    UI.headerNameInput.value = 'X-New';

    await submit();

    expect(STATE.rules[0]?.url).toBe('https://heppokofrontend.dev');
  });

  it('keeps a non-ASCII url input human-readable instead of saving the punycode-normalized form', async () => {
    UI.matchTypeSelect.value = 'url';
    UI.urlInput.value = 'https://例え.com';
    UI.headerNameInput.value = 'X-New';

    await submit();

    expect(STATE.rules[0]?.url).toBe('https://例え.com');
  });

  it('reuses STATE.editingId as the saved rule id instead of generating a new one', async () => {
    STATE.rules = [
      {
        id: 'existing-id',
        matchType: 'url',
        url: 'https://old.example.com/',
        regexp: '',
        headerName: 'X-Old',
        operation: 'set',
        value: 'old',
        isActive: true,
      },
    ];
    STATE.editingId = 'existing-id';

    UI.matchTypeSelect.value = 'url';
    UI.urlInput.value = 'https://new.example.com/';
    UI.headerNameInput.value = 'X-New';
    UI.valueInput.value = 'new';

    await submit();

    expect(STATE.rules.map((rule) => rule.id)).toStrictEqual(['existing-id']);
    expect(STATE.rules[0]?.url).toBe('https://new.example.com/');
  });

  it('saves a prefix rule using the raw url input, without normalization', async () => {
    UI.matchTypeSelect.value = 'prefix';
    applyMatchTypeVisibility('prefix');
    UI.urlInput.value = 'https://example.com/api';
    UI.headerNameInput.value = 'X-New';

    await submit();

    expect(STATE.rules).toHaveLength(1);
    expect(STATE.rules[0]).toMatchObject({
      matchType: 'prefix',
      url: 'https://example.com/api',
    });
  });

  it('saves a regexp rule once chrome.declarativeNetRequest.isRegexSupported confirms RE2 support', async () => {
    isRegexSupportedMock.mockResolvedValue({ isSupported: true });

    UI.matchTypeSelect.value = 'regexp';
    applyMatchTypeVisibility('regexp');
    UI.regexpInput.value = '^https://example\\.com/';
    UI.headerNameInput.value = 'X-New';

    await submit();

    expect(isRegexSupportedMock).toHaveBeenCalledWith({ regex: '^https://example\\.com/' });
    expect(STATE.rules).toHaveLength(1);
  });

  it('rejects a regexp rule that JS accepts but RE2 does not support, without saving', async () => {
    isRegexSupportedMock.mockResolvedValue({ isSupported: false, reason: 'syntaxError' });

    UI.matchTypeSelect.value = 'regexp';
    applyMatchTypeVisibility('regexp');
    UI.regexpInput.value = '(?<=foo)bar';
    UI.headerNameInput.value = 'X-New';

    await submit();

    expect(STATE.rules).toHaveLength(0);
    expect(storageSetMock).not.toHaveBeenCalled();
  });
});
