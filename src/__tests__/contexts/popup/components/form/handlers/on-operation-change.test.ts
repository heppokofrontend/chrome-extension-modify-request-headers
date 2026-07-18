import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import type { SaveDataType } from '@/types';
import popupHtml from '@package/popup.html?raw';

const formState: SaveDataType['formState'] = {
  matchType: 'url',
  operation: 'set',
};

describe('form/handlers/on-operation-change', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let STATE: typeof import('@/contexts/popup/state').STATE;
  let onOperationChange: typeof import('@/contexts/popup/components/form/handlers/on-operation-change').onOperationChange;

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
    ({ onOperationChange } =
      await import('@/contexts/popup/components/form/handlers/on-operation-change'));
  });

  beforeEach(() => {
    // setSaveData は STATE.saveData ではなく storage の実値を previous として読み直すため、
    // storage は常に STATE.saveData を反映している体でモックする。
    storageGetMock.mockReset().mockImplementation(() => ({ saveData: STATE.saveData }));
    storageSetMock.mockReset().mockResolvedValue(undefined);

    STATE.saveData = { rules: [], formState };
    UI.operationSelect.value = 'set';
  });

  it('ignores events whose currentTarget is not a select element', () => {
    onOperationChange({ currentTarget: document.createElement('input') } as unknown as Event);

    expect(storageSetMock).not.toHaveBeenCalled();
  });

  it('ignores an unrecognized select value', () => {
    const select = document.createElement('select');
    select.innerHTML = '<option value="bogus" selected>bogus</option>';

    onOperationChange({ currentTarget: select } as unknown as Event);

    expect(storageSetMock).not.toHaveBeenCalled();
  });

  it('applies visibility for the new operation and persists it to formState', async () => {
    UI.operationSelect.value = 'remove';

    onOperationChange({ currentTarget: UI.operationSelect } as unknown as Event);

    expect(UI.form.dataset['operation']).toBe('remove');

    await vi.waitFor(() => {
      expect(storageSetMock).toHaveBeenCalled();
    });

    expect(STATE.saveData.formState.operation).toBe('remove');
    expect(storageSetMock).toHaveBeenCalledWith({ saveData: STATE.saveData });
  });

  it('leaves STATE.saveData untouched when persisting fails', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    storageSetMock.mockReset().mockRejectedValue(new Error('quota exceeded'));

    UI.operationSelect.value = 'remove';
    const saveDataBefore = STATE.saveData;

    onOperationChange({ currentTarget: UI.operationSelect } as unknown as Event);

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
