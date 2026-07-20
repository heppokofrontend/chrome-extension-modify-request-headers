import type { HeaderRule } from '@/types';

import { stripTrailingSlash } from './strip-trailing-slash';

const PROTECTED_HOSTNAMES = new Set(['chrome.google.com', 'chromewebstore.google.com']);

const isMatchedUrl = (ruleUrl: HeaderRule['url'], url: URL) => {
  // worker側の resolveRulesToConditions と同じ基準（末尾スラッシュの有無を同一URL扱い）に揃える。
  try {
    // rule.url は表示用に生入力のまま保存されている（punycode / パーセントエンコード
    // 正規化はしていない）。比較対象の url.href はブラウザ正規化済み（常にASCII）のため、
    // ここで rule 側も `new URL().href` を通してから比較する。
    return stripTrailingSlash(new URL(ruleUrl).href) === stripTrailingSlash(url.href);
  } catch {
    return false;
  }
};

const isMatchedOrigin = (ruleOrigin: HeaderRule['origin'], url: URL) => {
  // rule.origin も表示用に生入力のまま保存されている（punycode正規化はしていない）ため、
  // isMatchedUrl と同様に比較時点で `new URL().origin` を通す。
  try {
    return new URL(ruleOrigin).origin === url.origin;
  } catch {
    return false;
  }
};

const isMatchedRegexp = (pattern: HeaderRule['regexp'], url: URL) => {
  try {
    return new RegExp(pattern).test(url.href);
  } catch {
    return false;
  }
};

/** タブの現在URLに対して、ルールの matchType 条件を静的に判定する。 */
export const isMatchedRule = ({ rule, url }: { rule: HeaderRule; url: URL }) => {
  if (
    // declarativeNetRequest は chrome:// / chrome-extension:// / about: のような
    // ブラウザ内部ページのリクエストには介入できない。
    // 表示上だけ「送信されているように見える」誤表示になるの防ぐため、HTTPであることを確認する
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    // Chrome ウェブストアは https だが、ポリシーで拡張機能からの介入自体が禁止されている
    // 保護対象ドメイン。ここも declarativeNetRequest は発動しないため、同様に除外する。
    PROTECTED_HOSTNAMES.has(url.hostname)
  ) {
    return false;
  }

  switch (rule.matchType) {
    case 'url':
      return isMatchedUrl(rule.url, url);
    case 'origin':
      // origin は scheme+host+port の完全一致（Web標準のorigin定義）で判定する
      // （worker側の resolveRulesToConditions の |origin/ urlFilter と同じ基準）。
      return isMatchedOrigin(rule.origin, url);
    case 'regexp':
      return isMatchedRegexp(rule.regexp, url);
  }
};
