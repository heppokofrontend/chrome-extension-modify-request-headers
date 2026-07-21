import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import popupHtml from '@package/popup.html?raw';

describe('form/handlers/on-edit-abort-click', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let STATE: typeof import('@/contexts/popup/state').STATE;
  let CLASS_NAMES: typeof import('@/contexts/popup/constants').CLASS_NAMES;
  let onEditAbortClick: typeof import('@/contexts/popup/components/form/handlers/on-edit-abort-click').onEditAbortClick;

  const click = () => {
    onEditAbortClick({ preventDefault: vi.fn() } as unknown as Event);
  };

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;
    vi.stubGlobal('chrome', { i18n: { getMessage: (key: string) => key } });

    ({ UI, CLASS_NAMES } = await import('@/contexts/popup/constants'));
    ({ STATE } = await import('@/contexts/popup/state'));
    ({ onEditAbortClick } =
      await import('@/contexts/popup/components/form/handlers/on-edit-abort-click'));
  });

  beforeEach(() => {
    STATE.formState.editingId = '';
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
    STATE.formState.editingId = 'target';

    const button = document.createElement('button');
    button.className = CLASS_NAMES.ruleEditButton;
    button.dataset['id'] = 'target';
    button.setAttribute('aria-pressed', 'true');
    UI.rules.append(button);

    click();

    expect(STATE.formState.editingId).toBe('');
    expect(UI.form.dataset['mode']).toBe('create');
    expect(UI.matchTypeSelect.value).toBe('url');
    expect(UI.urlInput.value).toBe('');
    expect(UI.headerNameInput.value).toBe('');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(document.activeElement).toBe(button);
  });
});
