import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import type { HeaderRule, SaveDataType } from '@/types';
import popupHtml from '@package/popup.html?raw';

const formState: SaveDataType['formState'] = {
  matchType: 'url',
  operation: 'set',
};
const makeRule = (
  overrides: Partial<HeaderRule> & Pick<HeaderRule, 'id' | 'matchType'>,
): HeaderRule => ({
  url: '',
  origin: '',
  regexp: '',
  headerName: 'X-Test',
  operation: 'set',
  value: '',
  isActive: true,
  ...overrides,
});

describe('form/handlers/on-delete-click', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let STATE: typeof import('@/contexts/popup/state').STATE;
  let onDeleteClick: typeof import('@/contexts/popup/components/form/handlers/on-delete-click').onDeleteClick;

  const storageGetMock = vi.fn();
  const storageSetMock = vi.fn();
  const tabsQueryMock = vi.fn();

  const click = () => onDeleteClick({ preventDefault: vi.fn() } as unknown as Event);

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;

    // jsdom does not implement HTMLDialogElement's showModal/close; confirmModal (used by
    // onDeleteClick) depends only on the `open` attribute, so polyfill that much.
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
    ({ onDeleteClick } = await import('@/contexts/popup/components/form/handlers/on-delete-click'));
  });

  beforeEach(() => {
    // setSaveData は STATE.saveData ではなく storage の実値を previous として読み直すため、
    // storage は常に STATE.saveData を反映している体でモックする。
    storageGetMock.mockReset().mockImplementation(() => ({ saveData: STATE.saveData }));
    storageSetMock.mockReset().mockResolvedValue(undefined);
    tabsQueryMock.mockReset().mockResolvedValue([]);
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    STATE.editingId = '';
    STATE.saveData = { rules: [], formState };
    UI.form.dataset['mode'] = 'edit';
  });

  it('does nothing when there is no rule currently being edited', async () => {
    await click();

    expect(storageSetMock).not.toHaveBeenCalled();
  });

  it('does nothing when the rule being edited no longer exists', async () => {
    STATE.saveData = {
      rules: [makeRule({ id: 'other', matchType: 'origin', origin: 'https://other.com' })],
      formState,
    };
    STATE.editingId = 'missing';

    await click();

    expect(storageSetMock).not.toHaveBeenCalled();
    expect(STATE.saveData.rules).toHaveLength(1);
  });

  it('does not delete when the confirmation is cancelled', async () => {
    STATE.saveData = {
      rules: [makeRule({ id: 'target', matchType: 'origin', origin: 'https://example.com' })],
      formState,
    };
    STATE.editingId = 'target';

    const promise = click();

    const [, cancelButton] = UI.modalButtonsContainer
      .children as HTMLCollectionOf<HTMLButtonElement>;
    cancelButton?.click();
    await promise;

    expect(STATE.saveData.rules).toHaveLength(1);
    expect(storageSetMock).not.toHaveBeenCalled();
  });

  it('deletes the rule being edited once the confirmation is accepted', async () => {
    STATE.saveData = {
      rules: [
        makeRule({ id: 'target', matchType: 'origin', origin: 'https://example.com' }),
        makeRule({ id: 'other', matchType: 'origin', origin: 'https://other.com' }),
      ],
      formState,
    };
    STATE.editingId = 'target';

    const promise = click();

    const [okButton] = UI.modalButtonsContainer.children as HTMLCollectionOf<HTMLButtonElement>;
    okButton?.click();
    await promise;

    expect(STATE.saveData.rules.map((rule) => rule.id)).toStrictEqual(['other']);
    expect(storageSetMock).toHaveBeenCalledWith({ saveData: STATE.saveData });
    expect(STATE.editingId).toBe('');
    expect(UI.form.dataset['mode']).toBe('create');
  });

  it('rolls back and stays in edit mode when the delete save fails', async () => {
    STATE.saveData = {
      rules: [makeRule({ id: 'target', matchType: 'origin', origin: 'https://example.com' })],
      formState,
    };
    STATE.editingId = 'target';
    const original = STATE.saveData;

    storageSetMock.mockRejectedValueOnce(new Error('quota exceeded'));

    const promise = click();

    const [okButton] = UI.modalButtonsContainer.children as HTMLCollectionOf<HTMLButtonElement>;
    okButton?.click();
    await promise;

    expect(STATE.saveData).toStrictEqual(original);
    expect(STATE.editingId).toBe('target');
    expect(UI.form.dataset['mode']).toBe('edit');
    expect(window.alert).toHaveBeenCalledWith('form_errSaveFailed');
  });
});
