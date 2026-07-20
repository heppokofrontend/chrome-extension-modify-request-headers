/** 末尾スラッシュを1つだけ取り除く。origin 比較・正規化で「同一対象なのに見た目だけ違う」を防ぐための共通処理。 */
export const stripTrailingSlash = (value: string) =>
  value.endsWith('/') ? value.slice(0, -1) : value;
