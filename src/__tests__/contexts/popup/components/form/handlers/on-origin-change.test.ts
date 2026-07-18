import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import popupHtml from '@package/popup.html?raw';

describe('form/handlers/on-origin-change', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let onOriginChange: typeof import('@/contexts/popup/components/form/handlers/on-origin-change').onOriginChange;

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;
    vi.stubGlobal('chrome', { i18n: { getMessage: (key: string) => key } });

    ({ UI } = await import('@/contexts/popup/constants'));
    ({ onOriginChange } =
      await import('@/contexts/popup/components/form/handlers/on-origin-change'));
  });

  beforeEach(() => {
    UI.originInput.value = '';
  });

  it('ignores events whose currentTarget is not an input element', () => {
    onOriginChange({ currentTarget: document.createElement('select') } as unknown as Event);

    expect(UI.originInput.value).toBe('');
  });

  it('fills in the https scheme when it was omitted', () => {
    UI.originInput.value = 'heppokofrontend.dev';

    onOriginChange({ currentTarget: UI.originInput } as unknown as Event);

    expect(UI.originInput.value).toBe('https://heppokofrontend.dev');
  });

  it('leaves the value as-is when it cannot be normalized (e.g. contains a path)', () => {
    UI.originInput.value = 'https://example.com/some/path';

    onOriginChange({ currentTarget: UI.originInput } as unknown as Event);

    expect(UI.originInput.value).toBe('https://example.com/some/path');
  });
});
