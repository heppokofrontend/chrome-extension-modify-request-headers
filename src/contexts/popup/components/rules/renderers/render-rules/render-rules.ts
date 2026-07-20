import { buildSection } from '@/contexts/popup/components/rules/renderers/render-rules/build-section';
import { getPatternGroupKey } from '@/contexts/popup/components/rules/renderers/render-rules/utils';
import { UI } from '@/contexts/popup/constants';
import { STATE } from '@/contexts/popup/state';
import type { HeaderRule } from '@/types';

/**
 * 保存済みルールの一覧を、matchType + 照合値ごとのセクションに分けて描画する。
 * セクション内はヘッダー名クリックでそのルールの編集モードに入る。
 */
export const renderRules = () => {
  UI.rules.replaceChildren();

  /** @example { "https://example.com/::prefix": [ ... ] } */
  const groups = new Map<string, HeaderRule[]>();

  for (const rule of STATE.rules) {
    const key = getPatternGroupKey(rule);
    const group = groups.get(key);

    if (Array.isArray(group)) {
      group.push(rule);
    } else {
      groups.set(key, [rule]);
    }
  }

  for (const [, rules] of groups) {
    const section = buildSection({ rules });

    if (section instanceof HTMLElement) {
      UI.rules.append(section);
    }
  }
};
