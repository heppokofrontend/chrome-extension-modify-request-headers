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
    // setStorage は STATE ではなく storage の実値を previous として読み直すため、
    // storage は常に STATE の該当 key を反映している体でモックする。
    storageGetMock.mockReset().mockImplementation((key: keyof SaveData) => ({ [key]: STATE[key] }));
    storageSetMock.mockReset().mockResolvedValue(undefined);
    tabsQueryMock.mockReset().mockResolvedValue([]);
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    STATE.editingId = '';
    Object.assign(STATE, { rules: [], formState });
    UI.form.dataset['mode'] = 'edit';
  });

  it('does nothing when there is no rule currently being edited', async () => {
    await click();

    expect(storageSetMock).not.toHaveBeenCalled();
  });

  it('does nothing when the rule being edited no longer exists', async () => {
    STATE.rules = [makeRule({ id: 'other', matchType: 'prefix', url: 'https://other.com' })];
    STATE.editingId = 'missing';

    await click();

    expect(storageSetMock).not.toHaveBeenCalled();
    expect(STATE.rules).toHaveLength(1);
  });

  it('does not delete when the confirmation is cancelled', async () => {
    STATE.rules = [makeRule({ id: 'target', matchType: 'prefix', url: 'https://example.com' })];
    STATE.editingId = 'target';

    const promise = click();

    const [, cancelButton] = UI.modalButtonsContainer
      .children as HTMLCollectionOf<HTMLButtonElement>;
    cancelButton?.click();
    await promise;

    expect(STATE.rules).toHaveLength(1);
    expect(storageSetMock).not.toHaveBeenCalled();
  });

  it('deletes the rule being edited once the confirmation is accepted', async () => {
    STATE.rules = [
      makeRule({ id: 'target', matchType: 'prefix', url: 'https://example.com' }),
      makeRule({ id: 'other', matchType: 'prefix', url: 'https://other.com' }),
    ];
    STATE.editingId = 'target';

    const promise = click();

    const [okButton] = UI.modalButtonsContainer.children as HTMLCollectionOf<HTMLButtonElement>;
    okButton?.click();
    await promise;

    expect(STATE.rules.map((rule) => rule.id)).toStrictEqual(['other']);
    expect(storageSetMock).toHaveBeenCalledWith({ rules: STATE.rules });
    expect(STATE.editingId).toBe('');
    expect(UI.form.dataset['mode']).toBe('create');
  });

  it('rolls back and stays in edit mode when the delete save fails', async () => {
    STATE.rules = [makeRule({ id: 'target', matchType: 'prefix', url: 'https://example.com' })];
    STATE.editingId = 'target';
    const original = STATE.rules;

    storageSetMock.mockRejectedValueOnce(new Error('quota exceeded'));

    const promise = click();

    const [okButton] = UI.modalButtonsContainer.children as HTMLCollectionOf<HTMLButtonElement>;
    okButton?.click();
    await promise;

    expect(STATE.rules).toStrictEqual(original);
    expect(STATE.editingId).toBe('target');
    expect(UI.form.dataset['mode']).toBe('edit');
    expect(window.alert).toHaveBeenCalledWith('form_errSaveFailed');
  });
});
