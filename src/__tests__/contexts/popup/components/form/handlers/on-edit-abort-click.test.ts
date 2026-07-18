import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import popupHtml from '@package/popup.html?raw';

describe('form/handlers/on-edit-abort-click', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let STATE: typeof import('@/contexts/popup/state').STATE;
  let BTN_EDIT_CLASS: typeof import('@/contexts/popup/constants').BTN_EDIT_CLASS;
  let onEditAbortClick: typeof import('@/contexts/popup/components/form/handlers/on-edit-abort-click').onEditAbortClick;

  const click = () => {
    onEditAbortClick({ preventDefault: vi.fn() } as unknown as Event);
  };

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;
    vi.stubGlobal('chrome', { i18n: { getMessage: (key: string) => key } });

    ({ UI, BTN_EDIT_CLASS } = await import('@/contexts/popup/constants'));
    ({ STATE } = await import('@/contexts/popup/state'));
    ({ onEditAbortClick } =
      await import('@/contexts/popup/components/form/handlers/on-edit-abort-click'));
  });

  beforeEach(() => {
    STATE.editingId = '';
    UI.form.dataset['mode'] = 'edit';
    UI.matchTypeSelect.value = 'regexp';
    UI.urlInput.value = 'https://example.com';
    UI.headerNameInput.value = 'X-Foo';
    UI.rules.innerHTML = '';
  });

  it('does nothing when there is no rule currently being edited', () => {
    click();

    expect(UI.form.dataset['mode']).toBe('edit');
    expect(UI.matchTypeSelect.value).toBe('regexp');
  });

  it('resets the fields, ends edit mode, and returns focus to the rule button being edited', () => {
    STATE.editingId = 'target';

    const button = document.createElement('button');
    button.className = BTN_EDIT_CLASS;
    button.dataset['id'] = 'target';
    button.setAttribute('data-edit', 'true');
    UI.rules.append(button);

    click();

    expect(STATE.editingId).toBe('');
    expect(UI.form.dataset['mode']).toBe('create');
    expect(UI.matchTypeSelect.value).toBe('url');
    expect(UI.urlInput.value).toBe('');
    expect(UI.headerNameInput.value).toBe('');
    expect(button.hasAttribute('data-edit')).toBe(false);
    expect(document.activeElement).toBe(button);
  });
});
