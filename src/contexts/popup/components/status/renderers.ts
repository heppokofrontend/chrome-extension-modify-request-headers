import { UI } from '@/contexts/popup/constants';
import { STATE } from '@/contexts/popup/state';
import { getMessage, isMatchedRule } from '@/utils';

// chrome.tabs.query の解決順序は呼び出し順と一致する保証がないため、renderStatus が
// 短時間に連続で呼ばれると古い呼び出しが後から解決して新しい結果を上書きしうる。
// 呼び出しごとに発行するトークンで「自分が最新の呼び出しか」を確認し、そうでなければ
// 描画を諦めることでこれを防ぐ。
let latestRequestId = 0;

/**
 * #status に「このタブに実際に送信されるルール数（有効なルールのうち今のタブURLに
 * マッチするもの）」を出す。
 */
export const renderStatus = async () => {
  const requestId = ++latestRequestId;
  const { rules } = STATE;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (requestId !== latestRequestId) {
    return;
  }

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

  UI.status.textContent = getMessage('status_sending', sendingCount);
};
