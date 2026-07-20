import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import type { HeaderRule, SaveData } from '@/types';
import popupHtml from '@package/popup.html?raw';

const formState: SaveData['formState'] = {
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

describe('status/renderers', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let STATE: typeof import('@/contexts/popup/state').STATE;
  let renderStatus: typeof import('@/contexts/popup/components/status').renderStatus;

  const tabsQueryMock = vi.fn();
  const getMessageMock = vi.fn(
    (key: string, substitutions?: string | string[]) =>
      `${key}:${Array.isArray(substitutions) ? substitutions.join(',') : (substitutions ?? '')}`,
  );

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;
    vi.stubGlobal('chrome', {
      i18n: { getMessage: getMessageMock },
      tabs: { query: tabsQueryMock },
    });

    ({ UI } = await import('@/contexts/popup/constants'));
    ({ STATE } = await import('@/contexts/popup/state'));
    ({ renderStatus } = await import('@/contexts/popup/components/status'));
  });

  beforeEach(() => {
    tabsQueryMock.mockReset().mockResolvedValue([]);
    getMessageMock.mockClear();

    Object.assign(STATE, {
      rules: [
        makeRule({ id: 'a', matchType: 'prefix', url: 'https://a.example.com', isActive: true }),
        makeRule({
          id: 'b',
          matchType: 'prefix',
          url: 'https://a.example.com',
          isActive: false,
        }),
        makeRule({ id: 'c', matchType: 'prefix', url: 'https://b.example.com', isActive: true }),
      ],
      formState,
    });
  });

  it('queries the active tab in the current window', async () => {
    await renderStatus();

    expect(tabsQueryMock).toHaveBeenCalledWith({ active: true, currentWindow: true });
  });

  it('falls back to sendingCount 0 when there is no active tab', async () => {
    tabsQueryMock.mockResolvedValue([]);

    await renderStatus();

    expect(UI.status.textContent).toBe('status_sending:0');
  });

  it('falls back to sendingCount 0 when the active tab has no url', async () => {
    tabsQueryMock.mockResolvedValue([{ id: 1 }]);

    await renderStatus();

    expect(UI.status.textContent).toBe('status_sending:0');
  });

  it('falls back to sendingCount 0 when the active tab url cannot be parsed', async () => {
    tabsQueryMock.mockResolvedValue([{ id: 1, url: '' }]);

    await renderStatus();

    expect(UI.status.textContent).toBe('status_sending:0');
  });

  it('falls back to sendingCount 0 when the active tab url is non-empty but unparsable', async () => {
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'not a valid url' }]);

    await renderStatus();

    expect(UI.status.textContent).toBe('status_sending:0');
  });

  it('counts only active rules matching the active tab url as sendingCount', async () => {
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://a.example.com/path' }]);

    await renderStatus();

    // a.example.com グループは2件中1件だけ isActive: true。
    expect(UI.status.textContent).toBe('status_sending:1');
  });

  it('discards a stale call that resolves after a newer call', async () => {
    let resolveStale: (tabs: unknown[]) => void = () => {};
    const stale = new Promise<unknown[]>((resolve) => {
      resolveStale = resolve;
    });

    tabsQueryMock.mockReturnValueOnce(stale);
    const stalePromise = renderStatus();

    tabsQueryMock.mockResolvedValueOnce([{ id: 2, url: 'https://a.example.com/path' }]);
    await renderStatus();

    expect(UI.status.textContent).toBe('status_sending:1');

    resolveStale([{ id: 1, url: 'https://b.example.com/path' }]);
    await stalePromise;

    // 後発の呼び出しが先に解決していた表示を、先発（古い）呼び出しの結果で上書きしないこと。
    expect(UI.status.textContent).toBe('status_sending:1');
  });
});
