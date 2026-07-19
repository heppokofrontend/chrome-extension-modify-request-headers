import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import enMessages from '@package/_locales/en/messages.json';
import popupHtml from '@package/popup.html?raw';

describe('renderConfirmModalContent', () => {
  let renderConfirmModalContent: typeof import('@/contexts/popup/components/modal/renderers').renderConfirmModalContent;
  let UI: typeof import('@/contexts/popup/constants').UI;

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;
    vi.stubGlobal('chrome', {
      i18n: {
        getMessage: (key: string) =>
          (enMessages as Record<string, { message: string }>)[key]?.message ?? '',
      },
    });
    ({ renderConfirmModalContent } = await import('@/contexts/popup/components/modal/renderers'));
    ({ UI } = await import('@/contexts/popup/constants'));
  });

  beforeEach(() => {
    UI.modalMessage.textContent = '';
    UI.modalData.replaceChildren();
    UI.modalButtonsContainer.replaceChildren();
  });

  it('sets the message text and clears any previously rendered content when data is undefined', () => {
    UI.modalData.append(document.createElement('p'));
    UI.modalButtonsContainer.append(document.createElement('button'));

    renderConfirmModalContent({ message: 'are you sure?', data: undefined });

    expect(UI.modalMessage.textContent).toBe('are you sure?');
    expect(UI.modalData.children).toHaveLength(0);
    expect(UI.modalButtonsContainer.children).toHaveLength(0);
  });

  it('renders a single paragraph with the raw text when data is a string', () => {
    renderConfirmModalContent({ message: 'are you sure?', data: 'plain message' });

    expect(UI.modalData.children).toHaveLength(1);
    expect(UI.modalData.textContent).toBe('plain message');
  });

  it('renders asIs/toBe paragraphs when data is an object', () => {
    renderConfirmModalContent({
      message: 'are you sure?',
      data: { asIs: 'X-Old', toBe: 'X-New' },
    });

    const [asIs, toBe] = UI.modalData.children;

    expect(UI.modalData.children).toHaveLength(2);
    expect(asIs?.textContent).toBe('Current: X-Old');
    expect(toBe?.textContent).toBe('New: X-New');
  });
});
