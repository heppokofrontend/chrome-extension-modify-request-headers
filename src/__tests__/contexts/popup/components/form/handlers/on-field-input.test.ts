import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import popupHtml from '@package/popup.html?raw';

describe('form/handlers/on-field-input', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let onFieldInput: typeof import('@/contexts/popup/components/form/handlers/on-field-input').onFieldInput;

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;
    vi.stubGlobal('chrome', { i18n: { getMessage: (key: string) => key } });

    ({ UI } = await import('@/contexts/popup/constants'));
    ({ onFieldInput } = await import('@/contexts/popup/components/form/handlers/on-field-input'));
  });

  beforeEach(() => {
    UI.matchTypeSelect.value = 'url';
    UI.urlInput.value = '';
    UI.headerNameInput.value = '';
  });

  it('delegates to setCustomValidities so a stale validation message reflects the new input', () => {
    UI.urlInput.value = 'not a url';
    onFieldInput();
    expect(UI.urlInput.validationMessage).toBe('form_errInvalidUrl');

    UI.urlInput.value = 'https://example.com/path';
    onFieldInput();
    expect(UI.urlInput.validationMessage).toBe('');
  });
});
