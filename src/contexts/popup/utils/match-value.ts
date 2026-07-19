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

/**
 * グルーピング・重複判定用に照合値を正規化した値を返す。url/originは生データのまま
 * 保存されている（punycode化していない）ため、同じ対象でも punycode表記/unicode表記/
 * 末尾スラッシュの有無で raw 文字列が食い違うことがある。isMatchedRule と同じく
 * `new URL()` を通してから比較できる形にする。パース不能な場合は raw 値のまま返す
 * （不正な値同士は raw 一致でグルーピングされる＝従来の挙動を維持）。
 */
export const getCanonicalMatchValue = (
  params: Pick<HeaderRule, 'matchType' | 'url' | 'origin' | 'regexp'>,
) => {
  // isMatchedUrl（末尾スラッシュの有無を同一URL扱い）と揃える。揃えないと、
  // 一致判定上は同じ扱いのURLが表示上は別グループに分かれてしまう。
  const stripTrailingSlash = (value: string) => (value.endsWith('/') ? value.slice(0, -1) : value);

  switch (params.matchType) {
    case 'url':
      try {
        return stripTrailingSlash(new URL(params.url).href);
      } catch {
        return params.url;
      }
    case 'origin':
      try {
        return new URL(params.origin).origin;
      } catch {
        return params.origin;
      }
    case 'regexp':
      return params.regexp;
  }
};
