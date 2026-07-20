import type { HeaderRule } from '@/types';
import { isMatchedRule } from '@/utils';

const applyIconAndBadge = async (tabId: number, count: number) => {
  await Promise.all([
    chrome.action.setBadgeText({ tabId, text: count > 0 ? String(count) : '' }),
    chrome.action.setIcon({
      tabId,
      path: count > 0 ? 'images/icon-active.png' : 'images/icon.png',
    }),
  ]);
};

interface Params {
  tabId: number;
  rules: HeaderRule[];
}

export const updateBadge = async ({ tabId, rules }: Params) => {
  const tab = await chrome.tabs.get(tabId).catch(() => undefined);

  if (tab?.url === undefined || tab.url === '') {
    await applyIconAndBadge(tabId, 0);
    return;
  }

  let url: URL;

  try {
    url = new URL(tab.url);
  } catch {
    await applyIconAndBadge(tabId, 0);
    return;
  }

  const matchedRules = rules.filter((rule) => {
    return (
      rule.isActive &&
      isMatchedRule({
        rule,
        url,
      })
    );
  });

  await applyIconAndBadge(tabId, matchedRules.length);
};
