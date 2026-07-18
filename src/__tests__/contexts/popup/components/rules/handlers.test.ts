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

describe('rules/handlers', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let STATE: typeof import('@/contexts/popup/state').STATE;
  let onDeleteAllButtonClick: typeof import('@/contexts/popup/components/rules/handlers/on-delete-all-button-click').onDeleteAllButtonClick;
  let onToggleActiveButtonClick: typeof import('@/contexts/popup/components/rules/handlers/on-toggle-active-button-click').onToggleActiveButtonClick;

  const storageGetMock = vi.fn();
  const storageSetMock = vi.fn();
  const tabsQueryMock = vi.fn();

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;

    // jsdom does not implement HTMLDialogElement's showModal/close; confirmModal (used by
    // deleteGroup via onDeleteAllButtonClick) depends only on the `open` attribute, so
    // polyfill that much.
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
    ({ onDeleteAllButtonClick } =
      await import('@/contexts/popup/components/rules/handlers/on-delete-all-button-click'));
    ({ onToggleActiveButtonClick } =
      await import('@/contexts/popup/components/rules/handlers/on-toggle-active-button-click'));
  });

  beforeEach(() => {
    // setSaveData は STATE.saveData ではなく storage の実値を previous として読み直すため、
    // storage は常に STATE.saveData を反映している体でモックする。
    storageGetMock.mockReset().mockImplementation(() => ({ saveData: STATE.saveData }));
    storageSetMock.mockReset().mockResolvedValue(undefined);
    tabsQueryMock.mockReset().mockResolvedValue([]);

    STATE.editingId = '';
    STATE.saveData = {
      rules: [
        makeRule({ id: 'a', matchType: 'origin', origin: 'https://example.com', isActive: true }),
        makeRule({ id: 'b', matchType: 'origin', origin: 'https://example.com', isActive: true }),
      ],
      formState,
    };
  });

  describe('onDeleteAllButtonClick', () => {
    it('deletes every rule in the group once the confirmation is accepted', async () => {
      const modalButtonsContainer = UI.modalButtonsContainer;

      onDeleteAllButtonClick(['a', 'b'], 'https://example.com')();

      const [okButton] = modalButtonsContainer.children as HTMLCollectionOf<HTMLButtonElement>;
      okButton?.click();
      await vi.waitFor(() => {
        expect(storageSetMock).toHaveBeenCalled();
      });

      expect(STATE.saveData.rules).toHaveLength(0);
    });

    it('does nothing when the confirmation is cancelled', async () => {
      const modalButtonsContainer = UI.modalButtonsContainer;

      onDeleteAllButtonClick(['a', 'b'], 'https://example.com')();

      const [, cancelButton] =
        modalButtonsContainer.children as HTMLCollectionOf<HTMLButtonElement>;
      cancelButton?.click();
      await Promise.resolve();

      expect(STATE.saveData.rules).toHaveLength(2);
      expect(storageSetMock).not.toHaveBeenCalled();
    });
  });

  describe('onToggleActiveButtonClick', () => {
    it('switches every rule in the group to inactive when they are all currently active', async () => {
      onToggleActiveButtonClick(STATE.saveData.rules, ['a', 'b'])();

      await vi.waitFor(() => {
        expect(storageSetMock).toHaveBeenCalled();
      });

      expect(STATE.saveData.rules.every((rule) => !rule.isActive)).toBe(true);
    });

    it('switches every rule in the group to active when at least one is currently inactive', async () => {
      STATE.saveData = {
        rules: [
          makeRule({
            id: 'a',
            matchType: 'origin',
            origin: 'https://example.com',
            isActive: false,
          }),
          makeRule({ id: 'b', matchType: 'origin', origin: 'https://example.com', isActive: true }),
        ],
        formState,
      };

      onToggleActiveButtonClick(STATE.saveData.rules, ['a', 'b'])();

      await vi.waitFor(() => {
        expect(storageSetMock).toHaveBeenCalled();
      });

      expect(STATE.saveData.rules.every((rule) => rule.isActive)).toBe(true);
    });
  });
});
