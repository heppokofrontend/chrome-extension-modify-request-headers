import { setFilterResultDefault } from '@/contexts/popup/components/filter';
import { getGroupKey } from '@/contexts/popup/components/rules';
import { UI } from '@/contexts/popup/constants';
import { STATE } from '@/contexts/popup/state';
import { getMessage, isMatchedRule } from '@/utils';

/**
 * 「パターン数（matchType + 照合値の異なり数）」「ルール数（総数、うち有効な件数）」は
 * フィルタ未適用時の #filter-result のデフォルト表示に、「このタブに実際に送信される
 * ルール数（有効なルールのうち今のタブURLにマッチするもの）」は #status に出す。
 * 送信数は worker のバッジと同じ isMatchedRule を使うので、バッジの数字と一致する。
 */
export const renderStatus = async () => {
  const { rules } = STATE.saveData;
  const patternCount = new Set(rules.map(getGroupKey)).size;
  const activeCount = rules.filter((rule) => rule.isActive).length;

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

  setFilterResultDefault(
    getMessage('status_patternsAndRules', [
      String(patternCount),
      String(rules.length),
      String(activeCount),
    ]),
  );
  UI.status.textContent = getMessage('status_sending', [String(sendingCount)]);
};
