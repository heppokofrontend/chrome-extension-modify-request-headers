import { UI } from '@/contexts/popup/constants';
import { STATE } from '@/contexts/popup/state';
import { getMessage, isMatchedRule } from '@/utils';

/**
 * #status に「このタブに実際に送信されるルール数（有効なルールのうち今のタブURLに
 * マッチするもの）」を出す。
 */
export const renderStatus = async () => {
  const { rules } = STATE;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = tab?.url ?? '';

  let sendingCount = 0;

  if (currentUrl) {
    try {
      const url = new URL(currentUrl);

      sendingCount = rules.filter((rule) => rule.isActive && isMatchedRule({ rule, url })).length;
    } catch {
      sendingCount = 0;
    }
  }

  UI.status.textContent = getMessage('status_sending', [String(sendingCount)]);
};
