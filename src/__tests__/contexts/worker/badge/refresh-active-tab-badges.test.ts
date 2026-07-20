import { describe, it, expect, vi, beforeEach } from 'vitest';

import { refreshActiveTabBadges } from '@/contexts/worker/badge/refresh-active-tab-badges';
import type { HeaderRule } from '@/types';

const tabsQueryMock = vi.fn();
const tabsGetMock = vi.fn();
const setBadgeTextMock = vi.fn().mockResolvedValue(undefined);
const setIconMock = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  tabsQueryMock.mockReset();
  tabsGetMock.mockReset().mockResolvedValue({ id: 1 });
  setBadgeTextMock.mockReset().mockResolvedValue(undefined);
  setIconMock.mockReset().mockResolvedValue(undefined);

  vi.stubGlobal('chrome', {
    tabs: { query: tabsQueryMock, get: tabsGetMock },
    action: { setBadgeText: setBadgeTextMock, setIcon: setIconMock },
  });
});

const rules: HeaderRule[] = [];

describe('refreshActiveTabBadges', () => {
  it('queries only active tabs and updates a badge for each one', async () => {
    tabsQueryMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await refreshActiveTabBadges(rules);

    expect(tabsQueryMock).toHaveBeenCalledWith({ active: true });
    expect(tabsGetMock).toHaveBeenCalledWith(1);
    expect(tabsGetMock).toHaveBeenCalledWith(2);
  });

  it('skips tabs without an id', async () => {
    tabsQueryMock.mockResolvedValue([{ id: undefined }, { id: 3 }]);

    await refreshActiveTabBadges(rules);

    expect(tabsGetMock).toHaveBeenCalledTimes(1);
    expect(tabsGetMock).toHaveBeenCalledWith(3);
  });
});
