import { applyEditMode } from '@/contexts/popup/components/form';
import {
  onDeleteAllButtonClick,
  onToggleActiveButtonClick,
} from '@/contexts/popup/components/rules/handlers';
import { escapeHtml } from '@/contexts/popup/components/rules/utils';
import { BTN_EDIT_CLASS, UI } from '@/contexts/popup/constants';
import { STATE } from '@/contexts/popup/state';
import { getMatchValue } from '@/contexts/popup/utils';
import type { HeaderRule, MatchType } from '@/types';
import { getMessage } from '@/utils';

const getMatchLabel = (rule: HeaderRule) =>
  rule.matchType === 'regexp' ? `/${rule.regexp}/` : getMatchValue(rule);

/** matchType + 照合値（＝「パターン」）でルールをグルーピングするためのキー。 */
export const getGroupKey = (rule: HeaderRule) => `${rule.matchType}::${getMatchValue(rule)}`;

const groupRules = (rules: HeaderRule[]) => {
  const groups = new Map<string, HeaderRule[]>();

  for (const rule of rules) {
    const key = getGroupKey(rule);
    const group = groups.get(key);

    if (group) {
      group.push(rule);
    } else {
      groups.set(key, [rule]);
    }
  }

  return [...groups.values()];
};

const matchTypeMessageKey: Record<MatchType, string> = {
  url: 'form_matchTypeUrl',
  origin: 'form_matchTypeOrigin',
  regexp: 'form_matchTypeRegexp',
};

const getMatchTypeLabel = (matchType: MatchType) => getMessage(matchTypeMessageKey[matchType]);

const getPatternTarget = (matchType: MatchType, ruleLabel: string) =>
  `${getMatchTypeLabel(matchType)}${getMessage('rule_header_patternSeparator')}${ruleLabel}`;

const createRuleRow = (rule: HeaderRule) => {
  const tr = document.createElement('tr');

  tr.dataset['active'] = String(rule.isActive);

  const th = document.createElement('th');
  const button = document.createElement('button');
  const typeCell = document.createElement('td');
  const valueCell = document.createElement('td');

  th.scope = 'row';

  const statusIcon = document.createElement('span');

  statusIcon.setAttribute('aria-hidden', 'true');
  statusIcon.textContent = rule.isActive ? '✅' : '❌';

  const statusText = getMessage(rule.isActive ? 'rule_table_active' : 'rule_table_inactive');

  button.type = 'button';
  button.className = BTN_EDIT_CLASS;
  button.dataset['id'] = rule.id;
  button.setAttribute(
    'aria-label',
    getMessage('rule_table_edit', `${rule.headerName}${statusText}`),
  );
  button.append(statusIcon, ` ${rule.headerName}`);
  button.addEventListener('click', () => {
    applyEditMode.start(rule);
  });
  th.append(button);

  typeCell.textContent = rule.operation;

  if (rule.operation === 'remove') {
    valueCell.textContent = '-';
    valueCell.className = 'of-remove';
  } else {
    valueCell.textContent = rule.value;
  }

  tr.append(th, typeCell, valueCell);

  return tr;
};

/** グループ見出し（h3）＋一括操作ボタン（有効/無効トグル・一括削除）。 */
const createGroupHeader = (rules: HeaderRule[], firstRule: HeaderRule, ruleLabel: string) => {
  const header = document.createElement('div');
  const heading = document.createElement('h3');
  const actions = document.createElement('p');
  const toggleActiveButton = document.createElement('button');
  const deleteAllButton = document.createElement('button');

  header.className = 'rule__header';

  heading.insertAdjacentHTML(
    'afterbegin',
    getPatternTarget(firstRule.matchType, `<code>${escapeHtml(ruleLabel)}</code>`),
  );

  const ids = rules.map((rule) => rule.id);

  toggleActiveButton.type = 'button';
  toggleActiveButton.dataset['action'] = 'all-toggle-active';
  toggleActiveButton.className = 'of-toggle';
  toggleActiveButton.setAttribute(
    'aria-label',
    getMessage('rule_header_toggleActiveLabel', getPatternTarget(firstRule.matchType, ruleLabel)),
  );
  toggleActiveButton.insertAdjacentHTML(
    'afterbegin',
    `<span class="active">✅</span><span class="inactive">❌</span>`,
  );
  toggleActiveButton.addEventListener('click', onToggleActiveButtonClick(rules, ids));

  const deleteAllIcon = document.createElement('img');

  deleteAllIcon.src = 'images/icon-trash.svg';
  deleteAllIcon.alt = '';
  deleteAllIcon.width = 16;
  deleteAllIcon.height = 16;

  deleteAllButton.type = 'button';
  deleteAllButton.dataset['action'] = 'all-delete';
  deleteAllButton.setAttribute(
    'aria-label',
    getMessage(
      'rule_header_allDeleteButtonLabel',
      getPatternTarget(firstRule.matchType, ruleLabel),
    ),
  );
  deleteAllButton.append(deleteAllIcon);
  deleteAllButton.insertAdjacentHTML(
    'beforeend',
    `<span>${getMessage('rule_header_allDeleteButton')}</span>`,
  );
  deleteAllButton.addEventListener('click', onDeleteAllButtonClick(ids, ruleLabel));

  actions.append(toggleActiveButton, deleteAllButton);
  header.append(heading, actions);

  return {
    header,
  };
};

const createGroupSection = (rules: HeaderRule[]) => {
  const section = document.createElement('section');
  const [firstRule] = rules;

  if (!firstRule) {
    return section;
  }

  const ruleLabel = getMatchLabel(firstRule);

  section.className = 'rule';
  section.dataset['rule'] = ruleLabel;
  // セクション内が全部 active / 全部 inactive / 混在 のどれかを出しておき、
  // フィルタの有効/無効セレクトでセクションごと隠せるようにする。
  section.dataset['groupStatus'] = rules.every((rule) => rule.isActive)
    ? 'active'
    : rules.every((rule) => !rule.isActive)
      ? 'inactive'
      : 'mixed';
  const { header } = createGroupHeader(rules, firstRule, ruleLabel);
  section.append(header);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  const tbody = document.createElement('tbody');

  for (const label of ['Header name', 'Type', 'Value']) {
    const th = document.createElement('th');

    th.textContent = label;
    th.scope = 'col';
    headRow.append(th);
  }

  thead.append(headRow);

  for (const rule of rules) {
    tbody.append(createRuleRow(rule));
  }

  table.className = 'rule__table';
  table.append(thead, tbody);
  section.append(table);

  return section;
};

/**
 * 保存済みルールの一覧を、matchType + 照合値ごとのセクションに分けて描画する。
 * セクション内はヘッダー名クリックでそのルールの編集モードに入る。
 */
export const renderRules = () => {
  UI.rules.replaceChildren();

  for (const group of groupRules(STATE.saveData.rules)) {
    UI.rules.append(createGroupSection(group));
  }
};
