import { queueApplyHeaderRules } from '@/contexts/worker/apply-header-rules';
import { refreshActiveTabBadges, updateBadge } from '@/contexts/worker/badge';
import { getStorage } from '@/utils';

const init = async () => {
  const saveData = await getStorage();

  await queueApplyHeaderRules(saveData.rules);
  await chrome.action.setBadgeBackgroundColor({ color: '#f7e500' });
  await refreshActiveTabBadges(saveData.rules);
};

void init();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes['rules']) {
    return;
  }

  void getStorage().then((saveData) =>
    // ルール変更直後は、開いている全ウィンドウのアクティブタブのバッジも出し直す。
    Promise.all([queueApplyHeaderRules(saveData.rules), refreshActiveTabBadges(saveData.rules)]),
  );
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') {
    return;
  }

  void getStorage().then((saveData) => updateBadge({ tabId, rules: saveData.rules }));
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void getStorage().then((saveData) => updateBadge({ tabId, rules: saveData.rules }));
});
