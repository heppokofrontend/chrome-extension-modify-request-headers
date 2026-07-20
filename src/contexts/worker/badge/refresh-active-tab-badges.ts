import type { HeaderRule } from '@/types';

import { updateBadge } from './update-badge';

/** 開いている全ウィンドウのアクティブタブのバッジを更新する */
export const refreshActiveTabBadges = async (rules: HeaderRule[]) => {
  const tabs = await chrome.tabs.query({ active: true });

  const tabIds = tabs.map((tab) => tab.id).filter((tabId): tabId is number => tabId !== undefined);

  await Promise.all(tabIds.map((tabId) => updateBadge({ tabId, rules })));
};
