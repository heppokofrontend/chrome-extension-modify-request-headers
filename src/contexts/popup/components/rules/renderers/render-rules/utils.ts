import { getCanonicalMatchValue } from '@/contexts/popup/utils';
import type { HeaderRule } from '@/types';

/**
 * matchType + 照合値でグルーピングするためのキー。url/originは
 * getCanonicalMatchValue（`new URL()` 通過後の値）で比較するため、raw値が
 * punycode表記/unicode表記/末尾スラッシュの有無で食い違っていても同一グループになる。
 */
export const getPatternGroupKey = (
  params: Pick<HeaderRule, 'matchType' | 'url' | 'origin' | 'regexp'>,
) => `${getCanonicalMatchValue(params)}::${params.matchType}`;
