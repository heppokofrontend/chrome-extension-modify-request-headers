import { buildHeader } from '@/contexts/popup/components/rules/renderers/render-rules/build-header';
import { buildTable } from '@/contexts/popup/components/rules/renderers/render-rules/build-table';
import { getMatchValue } from '@/contexts/popup/utils';
import type { HeaderRule } from '@/types';
import { isAscii } from '@/validators';

/**
 * regexpを `/pattern/` 形式のリテラル表記にする。RegExp#toString は source 中の
 * 素の `/` を `\/` にエスケープして返すため、値が `/` だけのルールでも `///` のような
 * 区切りと本体の区別がつかない表記にならない。保存前のバリデーション（isValidRegexp）
 * を通っていない旧データ等で構築に失敗した場合はエスケープなしの素朴な表記にフォールバックする。
 */
const getRegexpLabel = (pattern: string) => {
  try {
    return new RegExp(pattern).toString();
  } catch {
    return `/${pattern}/`;
  }
};

/**
 * グループの見出しラベル。グループ内にpunycode表記（旧データ）とunicode表記
 * （新データ）が混在する場合、人間可読なunicode表記側を優先する。該当がなければ
 * 先頭ルールを使う。regexpは `/pattern/` 形式のパターン表記にする。
 */
const getMatchLabel = ({ rules, firstRule }: { rules: HeaderRule[]; firstRule: HeaderRule }) => {
  const rule = rules.find((candidate) => !isAscii(getMatchValue(candidate))) ?? firstRule;

  return rule.matchType === 'regexp' ? getRegexpLabel(rule.regexp) : getMatchValue(rule);
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
