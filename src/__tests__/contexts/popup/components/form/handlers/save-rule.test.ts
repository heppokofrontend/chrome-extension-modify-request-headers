import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import type { HeaderRule, SaveData } from '@/types';
import popupHtml from '@package/popup.html?raw';

const formState: SaveData['formState'] = {
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

describe('form/handlers/on-form-submit/save-rule', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let STATE: typeof import('@/contexts/popup/state').STATE;
  let saveRule: typeof import('@/contexts/popup/components/form/handlers/on-form-submit/save-rule').saveRule;

  const storageGetMock = vi.fn();
  const storageSetMock = vi.fn();
  const tabsQueryMock = vi.fn();

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;

    // jsdom does not implement HTMLDialogElement's showModal/close; confirmModal (used by
    // saveRule on duplicate detection) depends only on the `open` attribute, so polyfill that much.
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };

    vi.stubGlobal('chrome', {
      i18n: { getMessage: (key: string) => key },
      storage: { local: { get: storageGetMock, set: storageSetMock } },
      tabs: { query: tabsQueryMock },
    });

    ({ UI } = await import('@/contexts/popup/constants'));
    ({ STATE } = await import('@/contexts/popup/state'));
    ({ saveRule } =
      await import('@/contexts/popup/components/form/handlers/on-form-submit/save-rule'));
  });

  beforeEach(() => {
    // setStorage は STATE ではなく storage の実値を previous として読み直すため、
    // storage は常に STATE の該当 key を反映している体でモックする。
    storageGetMock.mockReset().mockImplementation((key: keyof SaveData) => ({ [key]: STATE[key] }));
    storageSetMock.mockReset().mockResolvedValue(undefined);
    tabsQueryMock.mockReset().mockResolvedValue([]);
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    STATE.editingId = '';
    Object.assign(STATE, { rules: [], formState: { ...formState, isDirty: true } });
    UI.headerNameInput.value = 'stale';
    UI.form.dataset['mode'] = 'edit';
  });

  it('saves a new rule as-is when there is no duplicate', async () => {
    const candidate = makeRule({
      id: 'new-id',
      matchType: 'prefix',
      url: 'https://example.com',
      headerName: 'X-New',
      value: 'v',
    });

    await saveRule(candidate);

    expect(STATE.rules.map((rule) => rule.id)).toStrictEqual(['new-id']);
    expect(storageSetMock).toHaveBeenCalledWith({ rules: STATE.rules });
  });

  it('resets the header fields after saving', async () => {
    const candidate = makeRule({
      id: 'new-id',
      matchType: 'prefix',
      url: 'https://example.com',
      headerName: 'X-New',
    });

    await saveRule(candidate);

    expect(UI.headerNameInput.value).toBe('');
  });

  it('exits edit mode after a successful save', async () => {
    STATE.editingId = 'new-id';

    const candidate = makeRule({
      id: 'new-id',
      matchType: 'prefix',
      url: 'https://example.com',
    });

    await saveRule(candidate);

    expect(STATE.editingId).toBe('');
    expect(UI.form.dataset['mode']).toBe('create');
  });

  it('updates the matching rule in place by id while leaving unrelated rules untouched', async () => {
    STATE.rules = [
      makeRule({
        id: 'a',
        matchType: 'prefix',
        url: 'https://a.example.com',
        headerName: 'X-A',
      }),
      makeRule({
        id: 'b',
        matchType: 'prefix',
        url: 'https://b.example.com',
        headerName: 'X-B',
      }),
    ];
    STATE.editingId = 'a';

    const candidate = makeRule({
      id: 'a',
      matchType: 'prefix',
      url: 'https://a.example.com',
      headerName: 'X-A',
      value: 'updated',
    });

    await saveRule(candidate);

    expect(STATE.rules.map((rule) => rule.id)).toStrictEqual(['a', 'b']);
    expect(STATE.rules[0]?.value).toBe('updated');
    expect(STATE.rules[1]?.headerName).toBe('X-B');
  });

  it('does nothing when a duplicate is detected and the confirmation is cancelled', async () => {
    STATE.rules = [
      makeRule({
        id: 'dup-1',
        matchType: 'prefix',
        url: 'https://example.com',
        headerName: 'X-Dup',
      }),
    ];

    const candidate = makeRule({
      id: 'candidate-1',
      matchType: 'prefix',
      url: 'https://example.com',
      headerName: 'X-Dup',
      value: 'new-value',
    });

    const promise = saveRule(candidate);

    const [, cancelButton] = UI.modalButtonsContainer
      .children as HTMLCollectionOf<HTMLButtonElement>;
    cancelButton?.click();
    await promise;

    expect(STATE.rules).toStrictEqual([
      makeRule({
        id: 'dup-1',
        matchType: 'prefix',
        url: 'https://example.com',
        headerName: 'X-Dup',
      }),
    ]);
    expect(storageSetMock).not.toHaveBeenCalled();
  });

  it('overwrites the existing rule under the duplicate id when the confirmation is accepted', async () => {
    STATE.rules = [
      makeRule({
        id: 'dup-1',
        matchType: 'prefix',
        url: 'https://example.com',
        headerName: 'X-Dup',
      }),
    ];

    const candidate = makeRule({
      id: 'candidate-1',
      matchType: 'prefix',
      url: 'https://example.com',
      headerName: 'X-Dup',
      value: 'new-value',
    });

    const promise = saveRule(candidate);

    const [okButton] = UI.modalButtonsContainer.children as HTMLCollectionOf<HTMLButtonElement>;
    okButton?.click();
    await promise;

    expect(STATE.rules.map((rule) => rule.id)).toStrictEqual(['dup-1']);
    expect(STATE.rules[0]?.value).toBe('new-value');
  });

  it('removes the rule being renamed away from when the save target turns out to be a different, pre-existing duplicate', async () => {
    STATE.rules = [
      makeRule({
        id: 'editing-id',
        matchType: 'prefix',
        url: 'https://other.com',
        headerName: 'X-Dup',
      }),
      makeRule({
        id: 'dup-1',
        matchType: 'prefix',
        url: 'https://example.com',
        headerName: 'X-Dup',
      }),
    ];
    STATE.editingId = 'editing-id';

    const candidate = makeRule({
      id: 'editing-id',
      matchType: 'prefix',
      url: 'https://example.com',
      headerName: 'X-Dup',
      value: 'new-value',
    });

    const promise = saveRule(candidate);

    const [okButton] = UI.modalButtonsContainer.children as HTMLCollectionOf<HTMLButtonElement>;
    okButton?.click();
    await promise;

    expect(STATE.rules.map((rule) => rule.id)).toStrictEqual(['dup-1']);
    expect(STATE.rules[0]?.value).toBe('new-value');
  });

  it('rolls back the saved data cache and alerts on save failure, without exiting edit mode', async () => {
    STATE.rules = [
      makeRule({ id: 'existing', matchType: 'prefix', url: 'https://kept.example.com' }),
    ];
    STATE.editingId = 'x';
    const original = STATE.rules;

    storageSetMock.mockRejectedValueOnce(new Error('quota exceeded'));

    const candidate = makeRule({
      id: 'new-id',
      matchType: 'prefix',
      url: 'https://example.com',
    });

    await saveRule(candidate);

    expect(STATE.rules).toStrictEqual(original);
    expect(STATE.editingId).toBe('x');
    expect(window.alert).toHaveBeenCalledWith('form_errSaveFailed');
    expect(console.error).toHaveBeenCalled();
  });

  describe('formState.isDirty', () => {
    it('resets isDirty to false after saving a new rule in create mode', async () => {
      const candidate = makeRule({
        id: 'new-id',
        matchType: 'prefix',
        url: 'https://example.com',
      });

      await saveRule(candidate);

      expect(STATE.formState.isDirty).toBe(false);
    });

    it('resets isDirty to false after overwriting an existing rule in edit mode', async () => {
      STATE.rules = [makeRule({ id: 'a', matchType: 'prefix', url: 'https://a.example.com' })];
      STATE.editingId = 'a';

      const candidate = makeRule({
        id: 'a',
        matchType: 'prefix',
        url: 'https://a.example.com',
        value: 'updated',
      });

      await saveRule(candidate);

      expect(STATE.formState.isDirty).toBe(false);
    });

    it('keeps isDirty true when the save fails', async () => {
      STATE.rules = [
        makeRule({ id: 'existing', matchType: 'prefix', url: 'https://kept.example.com' }),
      ];
      STATE.editingId = 'x';

      storageSetMock.mockRejectedValueOnce(new Error('quota exceeded'));

      const candidate = makeRule({
        id: 'new-id',
        matchType: 'prefix',
        url: 'https://example.com',
      });

      await saveRule(candidate);

      expect(STATE.formState.isDirty).toBe(true);
    });
  });
});
