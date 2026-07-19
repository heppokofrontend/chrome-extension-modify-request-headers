import {
  onDeleteAllButtonClick,
  onToggleActiveButtonClick,
} from '@/contexts/popup/components/rules/handlers';
import { escapeHtml } from '@/contexts/popup/components/rules/utils';
import type { HeaderRule, MatchType } from '@/types';
import { getMessage } from '@/utils';

const matchTypeMessageKey: Record<MatchType, string> = {
  url: 'form_matchTypeUrl',
  origin: 'form_matchTypeOrigin',
  regexp: 'form_matchTypeRegexp',
};

const getMatchTypeLabel = (matchType: MatchType) => getMessage(matchTypeMessageKey[matchType]);

const getPatternTarget = (matchType: MatchType, ruleLabel: string) =>
  `${getMatchTypeLabel(matchType)}${getMessage('rule_header_patternSeparator')}${ruleLabel}`;

/** グループ見出し（h3）＋一括操作ボタン（有効/無効トグル・一括削除）。 */
export const buildHeader = (rules: HeaderRule[], firstRule: HeaderRule, ruleLabel: string) => {
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

  actions.className = 'rule__actions';
  actions.append(toggleActiveButton, deleteAllButton);
  header.append(heading, actions);

  return header;
};
