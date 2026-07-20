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
  origin: '',
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
  let FILTER_STATE: typeof import('@/contexts/popup/components/filter').FILTER_STATE;
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
    ({ FILTER_STATE } = await import('@/contexts/popup/components/filter'));
    ({ renderStatus } = await import('@/contexts/popup/components/status'));
  });

  beforeEach(() => {
    tabsQueryMock.mockReset().mockResolvedValue([]);
    getMessageMock.mockClear();
    FILTER_STATE.textValue = '';
    FILTER_STATE.statusValue = 'all';

    Object.assign(STATE, {
      rules: [
        makeRule({ id: 'a', matchType: 'origin', origin: 'https://a.example.com', isActive: true }),
        makeRule({
          id: 'b',
          matchType: 'origin',
          origin: 'https://a.example.com',
          isActive: false,
        }),
        makeRule({ id: 'c', matchType: 'origin', origin: 'https://b.example.com', isActive: true }),
      ],
      formState,
    });
  });

  it('queries the active tab in the current window', async () => {
    await renderStatus();

    expect(tabsQueryMock).toHaveBeenCalledWith({ active: true, currentWindow: true });
  });

  it('reports pattern count (distinct groups) and rule/active counts via #filter-result default text', async () => {
    await renderStatus();

    // 3ルール中2グループ（a.example.com, b.example.com）、有効2件/全3件。
    expect(UI.filterResult.textContent).toBe('status_patternsAndRules:2,3,2');
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
});
