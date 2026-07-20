import { URL_ALLOWED_SCHEMES } from '@/constants';

/**
 * urlFilter/regexFilter は非ASCIIが1件でも混じると updateDynamicRules がバッチ全体を
 * 拒否し、他の正常なルールも巻き添えで消える。保存前にここで弾く。
 */
// eslint-disable-next-line no-control-regex
export const isAscii = (value: string) => /^[\x00-\x7F]*$/.test(value);

/**
 * `new URL().href` は非ASCII文字を必ず punycode/パーセントエンコードでASCII化するため
 * （Chrome公式ドキュメントでも urlFilter は正規化後の状態にマッチすると明記）、生入力の
 * ASCII判定は不要で「正規化できるか」だけを見ればよい。isAscii(href) は理論上常にtrueに
 * なるはずだが、ブラウザ実装差異に対する安全網として残している。
 * なお urlFilter が特別扱いする `*`/`|`/`^` をエスケープする手段は無いため、正規化後の
 * URLにこれらがリテラルに含まれる場合の意図しないマッチは未解決。
 */
export const isSafeUrl = (url: string) => {
  try {
    const { protocol, href } = new URL(url);
    return URL_ALLOWED_SCHEMES.has(protocol) && isAscii(href);
  } catch {
    return false;
  }
};

/**
 * regexFilter は RE2 構文だが、ここでは JS RegExp としてコンパイルできるか・ASCIIか・
 * 空でないかだけを見る簡易チェック。RE2固有の非互換は isRegexSupportedByEngine が見る。
 */
export const isValidRegexp = (pattern: string) => {
  if (!pattern.trim() || !isAscii(pattern)) {
    return false;
  }

  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
};

/**
 * isValidRegexp は JS の RegExp 構文しか見ておらず、lookbehind・後方参照など
 * RE2 では拒否されるケースを見逃す。保存前に検証専用APIで最終確認する。
 */
export const isRegexSupportedByEngine = async (pattern: string) => {
  const { isSupported } = await chrome.declarativeNetRequest.isRegexSupported({
    regex: pattern,
  });
  return isSupported;
};
