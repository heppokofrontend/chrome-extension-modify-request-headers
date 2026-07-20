import { FILTER_STATE } from '@/contexts/popup/components/filter';
import { escapeAttrValue } from '@/contexts/popup/components/filter/utils';
// rules バレル経由だと rules/effects.ts → filter バレル → ここ、で循環importになるため、
// getPatternGroupKey の定義ファイルを直接参照する。
import { getPatternGroupKey } from '@/contexts/popup/components/rules/renderers/render-rules/utils';
import { UI } from '@/contexts/popup/constants';
import { STATE } from '@/contexts/popup/state';
import { getMessage } from '@/utils';

let styleElement: HTMLStyleElement | undefined;

const getStyleElement = () => {
  styleElement ??= document.head.appendChild(document.createElement('style'));

  return styleElement;
};

const buildStyle = () => {
  const rules: string[] = [];
  const { textValue, statusValue } = FILTER_STATE;

  if (textValue) {
    const matchSelector = `[data-rule*="${escapeAttrValue(textValue)}"]`;

    rules.push(`[data-rule]:not(${matchSelector}) { display: none; }`);
  }

  if (statusValue === 'active' || statusValue === 'inactive') {
    const activeAttr = statusValue === 'active' ? 'true' : 'false';
    const oppositeGroupStatus = statusValue === 'active' ? 'inactive' : 'active';

    rules.push(
      // 行単位: マッチしない行は視覚的に消す（表の列幅は保つ）。
      `tr[data-active]:not([data-active="${activeAttr}"]) { visibility: collapse; }`,
      // セクション単位: 中身が全部逆状態なら、空の見出しだけ残らないようセクションごと隠す。
      `section[data-group-status="${oppositeGroupStatus}"] { display: none; }`,
    );
  }

  return rules.join('\n');
};

/** テキスト・ステータス両方の条件を満たす行数を数える（CSSではなくJS側の実データで判定）。 */
const countMatchingRows = () => {
  const { textValue, statusValue } = FILTER_STATE;
  const rows = UI.rules.querySelectorAll<HTMLTableRowElement>('tr[data-active]');
  let count = 0;

  for (const row of rows) {
    if (statusValue !== 'all' && row.dataset['active'] !== String(statusValue === 'active')) {
      continue;
    }

    if (textValue) {
      const section = row.closest<HTMLElement>('[data-rule]');

      if (section?.dataset['rule']?.includes(textValue) !== true) {
        continue;
      }
    }

    count += 1;
  }

  return count;
};

/** フィルタ未適用時に #filter-result へ出すデフォルト文言（パターン数/ルール数/有効数）を STATE.rules から組み立てる。 */
const getDefaultResultText = () => {
  const { rules } = STATE;
  const patternCount = new Set(rules.map(getPatternGroupKey)).size;
  const activeCount = rules.filter((rule) => rule.isActive).length;

  return getMessage('status_patternsAndRules', [
    String(patternCount),
    String(rules.length),
    String(activeCount),
  ]);
};

export const applyFilter = () => {
  const { textValue, statusValue, defaultResultText } = FILTER_STATE;

  getStyleElement().textContent = buildStyle();

  UI.filterResult.textContent =
    textValue || statusValue !== 'all'
      ? getMessage('filter_resultCount', String(countMatchingRows()))
      : defaultResultText;
};

/** ルールの追加・削除・有効/無効切替のたびに呼ばれる。#filter-result のデフォルト文言を STATE.rules から再計算する。 */
export const refreshFilterResultDefault = () => {
  const text = getDefaultResultText();

  FILTER_STATE.defaultResultText = text;

  if (!FILTER_STATE.textValue && FILTER_STATE.statusValue === 'all') {
    UI.filterResult.textContent = text;
  }
};
