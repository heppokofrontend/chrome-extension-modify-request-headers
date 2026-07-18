import { describe, it, expect, vi, beforeEach } from 'vitest';

import { updateBadge } from '@/contexts/worker/badge/update-badge';
import type { HeaderRule, SaveDataType } from '@/types';

const tabsGetMock = vi.fn();
const setBadgeTextMock = vi.fn().mockResolvedValue(undefined);
const setIconMock = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  tabsGetMock.mockReset();
  setBadgeTextMock.mockReset().mockResolvedValue(undefined);
  setIconMock.mockReset().mockResolvedValue(undefined);

  vi.stubGlobal('chrome', {
    tabs: { get: tabsGetMock },
    action: { setBadgeText: setBadgeTextMock, setIcon: setIconMock },
  });
});

const makeRule = (overrides: Partial<HeaderRule> & Pick<HeaderRule, 'matchType'>): HeaderRule => ({
  id: 'test-id',
  url: '',
  origin: '',
  regexp: '',
  headerName: 'X-Test',
  operation: 'set',
  value: '',
  isActive: true,
  ...overrides,
});

const saveData = (rules: HeaderRule[]): Required<SaveDataType> => ({
  rules,
  formState: { matchType: 'url', operation: 'set' },
});

describe('updateBadge', () => {
  it('falls back to count 0 when the tab has no url', async () => {
    tabsGetMock.mockResolvedValue({ id: 1 });

    await updateBadge(
      1,
      saveData([makeRule({ matchType: 'origin', origin: 'https://example.com' })]),
    );

    expect(setBadgeTextMock).toHaveBeenCalledWith({ tabId: 1, text: '' });
    expect(setIconMock).toHaveBeenCalledWith({ tabId: 1, path: 'images/icon.png' });
  });

  it('falls back to count 0 when chrome.tabs.get rejects', async () => {
    tabsGetMock.mockRejectedValue(new Error('No tab with id: 1'));

    await updateBadge(1, saveData([]));

    expect(setBadgeTextMock).toHaveBeenCalledWith({ tabId: 1, text: '' });
    expect(setIconMock).toHaveBeenCalledWith({ tabId: 1, path: 'images/icon.png' });
  });

  it('falls back to count 0 when the tab url cannot be parsed', async () => {
    tabsGetMock.mockResolvedValue({ id: 1, url: '' });

    await updateBadge(1, saveData([]));

    expect(setBadgeTextMock).toHaveBeenCalledWith({ tabId: 1, text: '' });
    expect(setIconMock).toHaveBeenCalledWith({ tabId: 1, path: 'images/icon.png' });
  });

  it('counts only active rules that match the current tab url', async () => {
    tabsGetMock.mockResolvedValue({ id: 1, url: 'https://api.example.com/path' });

    await updateBadge(
      1,
      saveData([
        makeRule({ matchType: 'origin', origin: 'https://api.example.com', isActive: true }),
        makeRule({ matchType: 'origin', origin: 'https://api.example.com', isActive: false }),
        makeRule({ matchType: 'origin', origin: 'https://other.example.com', isActive: true }),
      ]),
    );

    expect(setBadgeTextMock).toHaveBeenCalledWith({ tabId: 1, text: '1' });
    expect(setIconMock).toHaveBeenCalledWith({ tabId: 1, path: 'images/icon-active.png' });
  });
});
