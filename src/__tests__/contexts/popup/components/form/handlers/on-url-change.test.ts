import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import popupHtml from '@package/popup.html?raw';

describe('form/handlers/on-url-change', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let onUrlChange: typeof import('@/contexts/popup/components/form/handlers/on-url-change').onUrlChange;

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;
    vi.stubGlobal('chrome', { i18n: { getMessage: (key: string) => key } });

    ({ UI } = await import('@/contexts/popup/constants'));
    ({ onUrlChange } = await import('@/contexts/popup/components/form/handlers/on-url-change'));
  });

  beforeEach(() => {
    UI.urlInput.value = '';
    UI.matchTypeSelect.value = 'prefix';
  });

  it('ignores events whose currentTarget is not an input element', () => {
    onUrlChange({ currentTarget: document.createElement('select') } as unknown as Event);

    expect(UI.urlInput.value).toBe('');
  });

  it('fills in the https scheme when it was omitted, for matchType: prefix', () => {
    UI.urlInput.value = 'heppokofrontend.dev';

    onUrlChange({ currentTarget: UI.urlInput } as unknown as Event);

    expect(UI.urlInput.value).toBe('https://heppokofrontend.dev');
  });

  it('leaves the value as-is when it cannot be normalized', () => {
    UI.urlInput.value = 'not a url at all!!';

    onUrlChange({ currentTarget: UI.urlInput } as unknown as Event);

    expect(UI.urlInput.value).toBe('not a url at all!!');
  });

  it('does nothing when matchType is url, since an exact URL is expected to already include a scheme', () => {
    UI.matchTypeSelect.value = 'url';
    UI.urlInput.value = 'heppokofrontend.dev';

    onUrlChange({ currentTarget: UI.urlInput } as unknown as Event);

    expect(UI.urlInput.value).toBe('heppokofrontend.dev');
  });
});
