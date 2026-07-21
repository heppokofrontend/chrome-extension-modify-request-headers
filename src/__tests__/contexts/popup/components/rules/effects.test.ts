import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import type { HeaderRule, SaveData } from '@/types';
import popupHtml from '@package/popup.html?raw';

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

describe('rules/effects', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let STATE: typeof import('@/contexts/popup/state').STATE;
  let toggleGroupActive: typeof import('@/contexts/popup/components/rules/effects').toggleGroupActive;
  let deleteGroup: typeof import('@/contexts/popup/components/rules/effects').deleteGroup;

  const storageGetMock = vi.fn();
  const storageSetMock = vi.fn();
  const tabsQueryMock = vi.fn();

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;

    // jsdom does not implement HTMLDialogElement's showModal/close; confirmModal (used by
    // deleteGroup) depends only on the `open` attribute, so polyfill that much.
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
    ({ toggleGroupActive, deleteGroup } =
      await import('@/contexts/popup/components/rules/effects'));
  });

  beforeEach(() => {
    // setStorage は STATE ではなく storage の実値を previous として読み直すため、
    // storage は常に STATE の該当 key を反映している体でモックする。
    storageGetMock
      .mockReset()
      .mockImplementation((key: keyof SaveData) =>
        key === 'lastInput' ? { lastInput: STATE.formState } : { [key]: STATE[key] },
      );
    storageSetMock.mockReset().mockResolvedValue(undefined);
    tabsQueryMock.mockReset().mockResolvedValue([]);
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    Object.assign(STATE, {
      rules: [
        makeRule({ id: 'a', matchType: 'prefix', url: 'https://example.com', isActive: true }),
        makeRule({ id: 'b', matchType: 'prefix', url: 'https://example.com', isActive: true }),
      ],
      formState: { ...lastInput, editingId: '', isDirty: false },
    });
  });

  describe('toggleGroupActive', () => {
    it('sets isActive for the given ids, persists, and re-renders the list', async () => {
      await toggleGroupActive(['a'], false);

      expect(STATE.rules.find((rule) => rule.id === 'a')?.isActive).toBe(false);
      expect(STATE.rules.find((rule) => rule.id === 'b')?.isActive).toBe(true);
      expect(storageSetMock).toHaveBeenCalledWith({ rules: STATE.rules });
      expect(UI.rules.querySelector('section.rule')).not.toBeNull();
    });

    it('rolls back the saved data cache and alerts on save failure, without re-rendering', async () => {
      const original = STATE.rules;

      storageSetMock.mockRejectedValueOnce(new Error('quota exceeded'));

      await toggleGroupActive(['a'], false);

      expect(STATE.rules).toStrictEqual(original);
      expect(window.alert).toHaveBeenCalledWith('form_errSaveFailed');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('deleteGroup', () => {
    it('does nothing when the confirmation is cancelled', async () => {
      const promise = deleteGroup(['a'], 'https://example.com');

      const [, cancelButton] = UI.modalButtonsContainer
        .children as HTMLCollectionOf<HTMLButtonElement>;
      cancelButton?.click();
      await promise;

      expect(STATE.rules.map((rule) => rule.id)).toStrictEqual(['a', 'b']);
      expect(storageSetMock).not.toHaveBeenCalled();
    });

    it('removes the ids, persists, and re-renders when confirmed', async () => {
      const promise = deleteGroup(['a'], 'https://example.com');

      const [okButton] = UI.modalButtonsContainer.children as HTMLCollectionOf<HTMLButtonElement>;
      okButton?.click();
      await promise;

      expect(STATE.rules.map((rule) => rule.id)).toStrictEqual(['b']);
      expect(storageSetMock).toHaveBeenCalledWith({ rules: STATE.rules });
    });

    it('exits edit mode when the deleted ids include the rule currently being edited', async () => {
      STATE.formState.editingId = 'a';

      const promise = deleteGroup(['a'], 'https://example.com');

      const [okButton] = UI.modalButtonsContainer.children as HTMLCollectionOf<HTMLButtonElement>;
      okButton?.click();
      await promise;

      expect(STATE.formState.editingId).toBe('');
      expect(UI.form.dataset['mode']).toBe('create');
    });

    it('does not touch edit mode when the deleted ids do not include the rule being edited', async () => {
      STATE.formState.editingId = 'b';

      const promise = deleteGroup(['a'], 'https://example.com');

      const [okButton] = UI.modalButtonsContainer.children as HTMLCollectionOf<HTMLButtonElement>;
      okButton?.click();
      await promise;

      expect(STATE.formState.editingId).toBe('b');
    });

    it('rolls back the saved data cache and alerts on save failure, without exiting edit mode', async () => {
      const original = STATE.rules;

      STATE.formState.editingId = 'a';
      storageSetMock.mockRejectedValueOnce(new Error('quota exceeded'));

      const promise = deleteGroup(['a'], 'https://example.com');

      const [okButton] = UI.modalButtonsContainer.children as HTMLCollectionOf<HTMLButtonElement>;
      okButton?.click();
      await promise;

      expect(STATE.rules).toStrictEqual(original);
      expect(STATE.formState.editingId).toBe('a');
      expect(window.alert).toHaveBeenCalledWith('form_errSaveFailed');
    });
  });
});
