import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import type { HeaderRule, SaveData } from '@/types';
import popupHtml from '@package/popup.html?raw';

const lastInput: SaveData['lastInput'] = {
  matchType: 'url',
  operation: 'set',
};

const makeRule = (
  overrides: Partial<HeaderRule> & Pick<HeaderRule, 'id' | 'matchType'>,
): HeaderRule => ({
  url: '',
  regexp: '',
  headerName: 'X-Test',
  operation: 'set',
  value: '',
  isActive: true,
  ...overrides,
});

describe('form/handlers/on-match-type-change', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let STATE: typeof import('@/contexts/popup/state').STATE;
  let onMatchTypeChange: typeof import('@/contexts/popup/components/form/handlers/on-match-type-change').onMatchTypeChange;

  const storageGetMock = vi.fn();
  const storageSetMock = vi.fn();

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;

    vi.stubGlobal('chrome', {
      i18n: { getMessage: (key: string) => key },
      storage: { local: { get: storageGetMock, set: storageSetMock } },
    });

    ({ UI } = await import('@/contexts/popup/constants'));
    ({ STATE } = await import('@/contexts/popup/state'));
    ({ onMatchTypeChange } =
      await import('@/contexts/popup/components/form/handlers/on-match-type-change'));
  });

  beforeEach(() => {
    // setStorage は STATE ではなく storage の実値を previous として読み直すため、
    // storage は常に STATE.formState を反映している体でモックする。
    // SaveData の key は 'lastInput' だが STATE 側の対応するプロパティ名は
    // 'formState'（editingId/isDirty も含む広い概念）なので、ここだけ key 名を読み替える。
    storageGetMock
      .mockReset()
      .mockImplementation((key: keyof SaveData) =>
        key === 'lastInput' ? { lastInput: STATE.formState } : { [key]: STATE[key] },
      );
    storageSetMock.mockReset().mockResolvedValue(undefined);

    Object.assign(STATE, { rules: [], formState: lastInput });
    UI.matchTypeSelect.value = 'url';
  });

  it('ignores events whose currentTarget is not a select element', () => {
    onMatchTypeChange({ currentTarget: document.createElement('input') } as unknown as Event);

    expect(storageSetMock).not.toHaveBeenCalled();
  });

  it('ignores an unrecognized select value', () => {
    const select = document.createElement('select');
    select.innerHTML = '<option value="bogus" selected>bogus</option>';

    onMatchTypeChange({ currentTarget: select } as unknown as Event);

    expect(storageSetMock).not.toHaveBeenCalled();
  });

  it('applies visibility for the new matchType and persists it to formState', async () => {
    STATE.rules = [
      makeRule({ id: 'a', matchType: 'regexp', regexp: '^https://.*\\.example\\.com/' }),
    ];
    UI.matchTypeSelect.value = 'regexp';

    onMatchTypeChange({ currentTarget: UI.matchTypeSelect } as unknown as Event);

    expect(UI.form.dataset['matchType']).toBe('regexp');
    expect(UI.regexpInput.required).toBe(true);
    expect(UI.urlInput.required).toBe(false);
    expect([...UI.regexpDatalist.options].map((option) => option.value)).toEqual([
      '^https://.*\\.example\\.com/',
    ]);
    expect(UI.urlDatalist.options).toHaveLength(0);

    await vi.waitFor(() => {
      expect(storageSetMock).toHaveBeenCalled();
    });

    expect(STATE.formState.matchType).toBe('regexp');
    expect(storageSetMock).toHaveBeenCalledWith({ lastInput: STATE.formState });
  });

  it('leaves STATE.formState untouched when persisting fails', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    storageSetMock.mockReset().mockRejectedValue(new Error('quota exceeded'));

    UI.matchTypeSelect.value = 'regexp';
    const formStateBefore = STATE.formState;

    onMatchTypeChange({ currentTarget: UI.matchTypeSelect } as unknown as Event);

    await vi.waitFor(() => {
      expect(storageSetMock).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    expect(STATE.formState).toBe(formStateBefore);

    alertSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
