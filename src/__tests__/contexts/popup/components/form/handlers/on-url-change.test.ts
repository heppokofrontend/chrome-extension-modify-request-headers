import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import popupHtml from '@package/popup.html?raw';

describe('form/handlers/on-url-change', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let onUrlChange: typeof import('@/contexts/popup/components/form/handlers/on-url-change').onUrlChange;
  let onFieldInput: typeof import('@/contexts/popup/components/form/handlers/on-field-input').onFieldInput;

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;
    vi.stubGlobal('chrome', { i18n: { getMessage: (key: string) => key } });

    ({ UI } = await import('@/contexts/popup/constants'));
    ({ onUrlChange } = await import('@/contexts/popup/components/form/handlers/on-url-change'));
    ({ onFieldInput } = await import('@/contexts/popup/components/form/handlers/on-field-input'));

    UI.urlInput.addEventListener('input', onFieldInput);
  });

  beforeEach(() => {
    UI.urlInput.value = '';
    UI.matchTypeSelect.value = 'prefix';
  });

  it('ignores events whose currentTarget is not an input element', () => {
    onUrlChange({ currentTarget: document.createElement('select') } as unknown as Event);

    expect(UI.urlInput.value).toBe('');
  });

  it('fills in the https scheme and a trailing slash when it was omitted, for matchType: prefix', () => {
    UI.urlInput.value = 'heppokofrontend.dev';

    onUrlChange({ currentTarget: UI.urlInput } as unknown as Event);

    expect(UI.urlInput.value).toBe('https://heppokofrontend.dev/');
  });

  it('leaves the value as-is when it cannot be normalized', () => {
    UI.urlInput.value = 'not a url at all!!';

    onUrlChange({ currentTarget: UI.urlInput } as unknown as Event);

    expect(UI.urlInput.value).toBe('not a url at all!!');
  });

  it('fills in the https scheme and a trailing slash when it was omitted, for matchType: url', () => {
    UI.matchTypeSelect.value = 'url';
    UI.urlInput.value = 'heppokofrontend.dev';

    onUrlChange({ currentTarget: UI.urlInput } as unknown as Event);

    expect(UI.urlInput.value).toBe('https://heppokofrontend.dev/');
  });

  it('does nothing when matchType is regexp, since that matchType uses a separate input', () => {
    UI.matchTypeSelect.value = 'regexp';
    UI.urlInput.value = 'heppokofrontend.dev';

    onUrlChange({ currentTarget: UI.urlInput } as unknown as Event);

    expect(UI.urlInput.value).toBe('heppokofrontend.dev');
  });

  it('clears a custom validity message left over from typing the value before it was normalized', () => {
    UI.matchTypeSelect.value = 'prefix';
    UI.urlInput.value = 'heppokofrontend.dev';
    UI.urlInput.dispatchEvent(new InputEvent('input'));
    expect(UI.urlInput.validationMessage).not.toBe('');

    onUrlChange({ currentTarget: UI.urlInput } as unknown as Event);

    expect(UI.urlInput.value).toBe('https://heppokofrontend.dev/');
    expect(UI.urlInput.validationMessage).toBe('');
  });
});
