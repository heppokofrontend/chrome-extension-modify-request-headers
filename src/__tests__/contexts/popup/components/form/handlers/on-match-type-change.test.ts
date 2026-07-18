import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import type { SaveDataType } from '@/types';
import popupHtml from '@package/popup.html?raw';

const formState: SaveDataType['formState'] = {
  matchType: 'url',
  operation: 'set',
};

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
    // setSaveData は STATE.saveData ではなく storage の実値を previous として読み直すため、
    // storage は常に STATE.saveData を反映している体でモックする。
    storageGetMock.mockReset().mockImplementation(() => ({ saveData: STATE.saveData }));
    storageSetMock.mockReset().mockResolvedValue(undefined);

    STATE.saveData = { rules: [], formState };
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
    UI.matchTypeSelect.value = 'origin';

    onMatchTypeChange({ currentTarget: UI.matchTypeSelect } as unknown as Event);

    expect(UI.form.dataset['matchType']).toBe('origin');
    expect(UI.originInput.required).toBe(true);
    expect(UI.urlInput.required).toBe(false);

    await vi.waitFor(() => {
      expect(storageSetMock).toHaveBeenCalled();
    });

    expect(STATE.saveData.formState.matchType).toBe('origin');
    expect(storageSetMock).toHaveBeenCalledWith({ saveData: STATE.saveData });
  });

  it('leaves STATE.saveData untouched when persisting fails', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    storageSetMock.mockReset().mockRejectedValue(new Error('quota exceeded'));

    UI.matchTypeSelect.value = 'origin';
    const saveDataBefore = STATE.saveData;

    onMatchTypeChange({ currentTarget: UI.matchTypeSelect } as unknown as Event);

    await vi.waitFor(() => {
      expect(storageSetMock).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    expect(STATE.saveData).toBe(saveDataBefore);

    alertSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
