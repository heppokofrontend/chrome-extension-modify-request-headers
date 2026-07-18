import type { SaveDataType } from '@/types';

import { updateBadge } from './update-badge';

/** 開いている全ウィンドウのアクティブタブのバッジを更新する */
export const refreshActiveTabBadges = async (saveData: Required<SaveDataType>) => {
  const tabs = await chrome.tabs.query({ active: true });

  const tabIds = tabs.map((tab) => tab.id).filter((tabId): tabId is number => tabId !== undefined);

  await Promise.all(tabIds.map((tabId) => updateBadge(tabId, saveData)));
};
