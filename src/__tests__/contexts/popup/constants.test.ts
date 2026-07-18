import { describe, it, expect, beforeAll } from 'vitest';

import popupHtml from '@package/popup.html?raw';

describe('popup/constants.ts UI', () => {
  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;
    await import('@/contexts/popup/constants');
  });

  it('resolves every UI element defined in constants.ts against popup.html', async () => {
    const { UI } = await import('@/contexts/popup/constants');

    for (const [key, element] of Object.entries(UI)) {
      expect(element, `UI.${key} was not found in popup.html`).not.toBeNull();
    }
  });
});
