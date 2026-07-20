import { STATE } from '@/contexts/popup/state';
import { getMatchValue } from '@/contexts/popup/utils/match-value';
import type { HeaderRule } from '@/types';

/**
 * matchType + 照合値 + headerName が一致する既存ルール（自分自身は除く）を探す。
 * 同じ対象・同じヘッダーへの重複設定を保存前に弾くための判定用。
 */
export const findDuplicateRule = (rule: HeaderRule) =>
  STATE.rules.find(
    (existing) =>
      existing.id !== rule.id &&
      existing.matchType === rule.matchType &&
      getMatchValue(existing) === getMatchValue(rule) &&
      existing.headerName.toLowerCase() === rule.headerName.toLowerCase(),
  );
