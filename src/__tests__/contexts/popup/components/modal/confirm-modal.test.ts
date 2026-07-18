import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import enMessages from '@package/_locales/en/messages.json';
import popupHtml from '@package/popup.html?raw';

describe('confirmModal', () => {
  let confirmModal: typeof import('@/contexts/popup/components/modal').confirmModal;
  let UI: typeof import('@/contexts/popup/constants').UI;

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;

    // jsdom does not implement HTMLDialogElement's showModal/close at runtime
    // (despite the DOM types declaring them), so polyfill the minimal behavior
    // confirmModal() depends on (the `open` attribute).
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };

    vi.stubGlobal('chrome', {
      i18n: {
        getMessage: (key: string) =>
          (enMessages as Record<string, { message: string }>)[key]?.message ?? '',
      },
    });
    ({ confirmModal } = await import('@/contexts/popup/components/modal'));
    ({ UI } = await import('@/contexts/popup/constants'));
  });

  beforeEach(() => {
    UI.modal.close();
    UI.modalButtonsContainer.replaceChildren();
    UI.modalData.replaceChildren();
  });

  it('shows the modal with the given message and opens it', () => {
    void confirmModal('Are you sure?');

    expect(UI.modal.open).toBe(true);
    expect(UI.modalMessage.textContent).toBe('Are you sure?');
  });

  it('renders an OK button and a Cancel button', () => {
    void confirmModal('Are you sure?');

    const labels = [...UI.modalButtonsContainer.children].map((el) => el.textContent);

    expect(labels).toStrictEqual(['OK', 'Cancel']);
  });

  it('resolves true, closes the modal, and clears the buttons when OK is clicked', async () => {
    const promise = confirmModal('Are you sure?');

    const [okButton] = UI.modalButtonsContainer.children as HTMLCollectionOf<HTMLButtonElement>;
    okButton?.click();

    await expect(promise).resolves.toBe(true);
    expect(UI.modal.open).toBe(false);
    expect(UI.modalButtonsContainer.children).toHaveLength(0);
  });

  it('resolves false when Cancel is clicked', async () => {
    const promise = confirmModal('Are you sure?');

    const [, cancelButton] = UI.modalButtonsContainer
      .children as HTMLCollectionOf<HTMLButtonElement>;
    cancelButton?.click();

    await expect(promise).resolves.toBe(false);
    expect(UI.modal.open).toBe(false);
  });

  it('renders the data via renderData before showing the modal', () => {
    void confirmModal('Are you sure?', { asIs: 'X-Old', toBe: 'X-New' });

    expect(UI.modalData.textContent).toBe('Current: X-OldNew: X-New');
  });
});
