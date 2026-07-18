import { queueApplyHeaderRules } from '@/contexts/worker/apply-header-rules';
import { refreshActiveTabBadges, updateBadge } from '@/contexts/worker/badge';
import { getSaveData } from '@/utils';

const init = async () => {
  const saveData = await getSaveData();

  await queueApplyHeaderRules(saveData.rules);
  await chrome.action.setBadgeBackgroundColor({ color: '#f7e500' });
  await refreshActiveTabBadges(saveData);
};

void init();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes['saveData']) {
    return;
  }

  void getSaveData().then((saveData) =>
    // ルール変更直後は、開いている全ウィンドウのアクティブタブのバッジも出し直す。
    Promise.all([queueApplyHeaderRules(saveData.rules), refreshActiveTabBadges(saveData)]),
  );
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') {
    return;
  }

  void getSaveData().then((saveData) => updateBadge(tabId, saveData));
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void getSaveData().then((saveData) => updateBadge(tabId, saveData));
});
