const tryParseUrl = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
};

/**
 * `url.origin` はパス・クエリ・ハッシュ・認証情報を黙って切り捨てるため、それらを
 * 入力してしまった場合に「実は無視されている」ことに気づけない。ここでは
 * scheme + host（+ port）だけの純粋な origin であることを要求し、それ以外は弾く。
 */
// http/https 以外（例: `ht://d`）は non-special scheme として URL のパース自体は通ってしまうが、
// `url.origin` が opaque origin を表す文字列 "null" になってしまうため、scheme をここで絞る。
const isPureOrigin = (url: URL) =>
  (url.protocol === 'http:' || url.protocol === 'https:') &&
  (url.pathname === '' || url.pathname === '/') &&
  url.search === '' &&
  url.hash === '' &&
  url.username === '' &&
  url.password === '';

/**
 * `new URL()` はスキームなしの入力（例: `heppokofrontend.dev`）を例外にする。
 * スキーム省略時は https を補って救済し、それでも不正なら undefined を返す。
 */
export const getNormalizedUrl = {
  /**
   * `chrome.declarativeNetRequest` の urlFilter は `|...^|` で前後アンカーする
   * （worker側の `toCondition` 参照）。比較対象の実リクエストURLは常にブラウザ正規化済み
   * （オリジンのみのURLには末尾に `/` が付く等）。入力をそのまま保存すると、見た目は同じでも
   * 末尾スラッシュの有無だけで一致しなくなるため、ここで `new URL().href` を通して同じ形に揃える。
   */
  asHref: (input: string) => {
    const trimmed = input.trim();

    if (trimmed === '') {
      return undefined;
    }

    return tryParseUrl(trimmed)?.href;
  },
  asOrigin: (input: string) => {
    const trimmed = input.trim();

    if (trimmed === '') {
      return undefined;
    }

    const url = tryParseUrl(trimmed) ?? tryParseUrl(`https://${trimmed}`);

    return url && isPureOrigin(url) ? url.origin : undefined;
  },
};
