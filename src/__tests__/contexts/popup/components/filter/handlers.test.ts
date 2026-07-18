import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import popupHtml from '@package/popup.html?raw';

describe('filter/handlers', () => {
  let onFilterInput: typeof import('@/contexts/popup/components/filter/handlers').onFilterInput;
  let onFilterStatusChange: typeof import('@/contexts/popup/components/filter/handlers').onFilterStatusChange;
  let FILTER_STATE: typeof import('@/contexts/popup/components/filter/constants').FILTER_STATE;

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;
    vi.stubGlobal('chrome', { i18n: { getMessage: () => '' } });

    ({ onFilterInput, onFilterStatusChange } =
      await import('@/contexts/popup/components/filter/handlers'));
    ({ FILTER_STATE } = await import('@/contexts/popup/components/filter/constants'));
  });

  beforeEach(() => {
    FILTER_STATE.textValue = '';
    FILTER_STATE.statusValue = 'all';
  });

  it('onFilterInput stores the input value in FILTER_STATE.textValue', () => {
    const input = document.createElement('input');
    input.value = 'X-Foo';
    input.addEventListener('input', onFilterInput);

    input.dispatchEvent(new Event('input'));

    expect(FILTER_STATE.textValue).toBe('X-Foo');
  });

  it('onFilterInput ignores events whose currentTarget is not an input', () => {
    onFilterInput({ currentTarget: document.createElement('select') } as unknown as Event);

    expect(FILTER_STATE.textValue).toBe('');
  });

  it('onFilterStatusChange ignores events whose currentTarget is not a select', () => {
    onFilterStatusChange({ currentTarget: document.createElement('input') } as unknown as Event);

    expect(FILTER_STATE.statusValue).toBe('all');
  });

  it('onFilterStatusChange stores the select value in FILTER_STATE.statusValue', () => {
    const select = document.createElement('select');
    select.innerHTML = '<option value="active" selected>active</option>';
    select.addEventListener('change', onFilterStatusChange);

    select.dispatchEvent(new Event('change'));

    expect(FILTER_STATE.statusValue).toBe('active');
  });

  it('ignores an unrecognized select value', () => {
    const select = document.createElement('select');
    select.innerHTML = '<option value="bogus" selected>bogus</option>';
    select.addEventListener('change', onFilterStatusChange);

    select.dispatchEvent(new Event('change'));

    expect(FILTER_STATE.statusValue).toBe('all');
  });
});
