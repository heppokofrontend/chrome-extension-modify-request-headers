import { buildHeader } from '@/contexts/popup/components/rules/renderers/render-rules/build-header';
import { buildTable } from '@/contexts/popup/components/rules/renderers/render-rules/build-table';
import { getMatchValue } from '@/contexts/popup/utils';
import type { HeaderRule } from '@/types';
import { isAscii } from '@/validators';

/**
 * グループの見出しラベル。グループ内にpunycode表記（旧データ）とunicode表記
 * （新データ）が混在する場合、人間可読なunicode表記側を優先する。該当がなければ
 * 先頭ルールを使う。regexpはそのままパターン表記にする。
 */
const getMatchLabel = ({ rules, firstRule }: { rules: HeaderRule[]; firstRule: HeaderRule }) => {
  const rule = rules.find((candidate) => !isAscii(getMatchValue(candidate))) ?? firstRule;

  return rule.matchType === 'regexp' ? `/${rule.regexp}/` : getMatchValue(rule);
};

export const buildSection = ({ rules }: { rules: HeaderRule[] }) => {
  const [firstRule] = rules;

  if (firstRule === undefined) {
    return null;
  }

  const section = document.createElement('section');
  const ruleLabel = getMatchLabel({ rules, firstRule });

  section.className = 'rule';
  section.dataset['rule'] = ruleLabel;
  // フィルタの有効/無効セレクトでセクションごと隠せるようにする。
  section.dataset['groupStatus'] = (() => {
    if (rules.every((rule) => rule.isActive)) {
      return 'active';
    }

    if (rules.every((rule) => !rule.isActive)) {
      return 'inactive';
    }

    return 'mixed';
  })();

  const header = buildHeader(rules, firstRule, ruleLabel);
  const table = buildTable(rules);

  section.append(header, table);

  return section;
};
