import type { HeaderRule } from '@/types';

/** ルールの matchType に応じた実際の照合値（url / origin / regexp のいずれか）を返す。 */
export const getMatchValue = (rule: HeaderRule) => {
  switch (rule.matchType) {
    case 'url':
      return rule.url;
    case 'origin':
      return rule.origin;
    case 'regexp':
      return rule.regexp;
  }
};
