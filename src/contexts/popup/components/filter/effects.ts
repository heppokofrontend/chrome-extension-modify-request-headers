import { FILTER_STATE } from '@/contexts/popup/components/filter';
import { escapeAttrValue } from '@/contexts/popup/components/filter/utils';
import { UI } from '@/contexts/popup/constants';
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

export const applyFilter = () => {
  const { textValue, statusValue, defaultResultText } = FILTER_STATE;

  getStyleElement().textContent = buildStyle();

  UI.filterResult.textContent =
    textValue || statusValue !== 'all'
      ? getMessage('filter_resultCount', String(countMatchingRows()))
      : defaultResultText;
};

/** status/renderers.ts から呼ばれる。フィルタ未適用時に #filter-result に出すデフォルト文言を更新する。 */
export const setFilterResultDefault = (text: string) => {
  FILTER_STATE.defaultResultText = text;

  if (!FILTER_STATE.textValue && FILTER_STATE.statusValue === 'all') {
    UI.filterResult.textContent = text;
  }
};
