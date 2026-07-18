/**
 * declarativeNetRequest の urlFilter / regexFilter は ASCII のみ許可。1件でも非ASCII文字が
 * 混じると updateDynamicRules がバッチ全体を拒否し、他の正常なルールまで巻き添えで
 * 消えてしまう事故につながるため、popup（保存時）・worker（適用時）の両方でここを使って弾く。
 */
// eslint-disable-next-line no-control-regex
export const isAscii = (value: string) => /^[\x00-\x7F]*$/.test(value);

/**
 * declarativeNetRequest の regexFilter は RE2 構文だが、こちらは簡易チェックとして
 * JS の RegExp でコンパイルできるか・ASCIIか・空でないかだけを見る
 * （明らかに壊れた入力を弾ければ十分なため）。
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
 * isValidRegexp は JS の RegExp が通るかしか見ておらず、lookbehind・後方参照など
 * JS では合法でも RE2（declarativeNetRequest の regexFilter が使う構文）では拒否される
 * ケースを見逃す。その場合 worker 側の resilient ループが該当ルールを黙ってスキップし、
 * 「保存できるのに効かない」状態になるため、保存前に検証専用APIで最終チェックする。
 */
export const isRegexSupportedByEngine = async (pattern: string) => {
  const { isSupported } = await chrome.declarativeNetRequest.isRegexSupported({
    regex: pattern,
  });
  return isSupported;
};
