import type { HeaderRule } from '@/types';

const PROTECTED_HOSTNAMES = new Set(['chrome.google.com', 'chromewebstore.google.com']);

const isMatchedUrl = (rule: HeaderRule['url'], url: URL) => {
  // worker側の resolveRuleToCondition と同じ基準（末尾スラッシュの有無を同一URL扱い）に揃える。
  const stripTrailingSlash = (value: string) => (value.endsWith('/') ? value.slice(0, -1) : value);

  return stripTrailingSlash(rule) === stripTrailingSlash(url.href);
};

const isMatchedRegexp = (regexp: HeaderRule['regexp'], url: URL) => {
  try {
    return new RegExp(regexp).test(url.href);
  } catch {
    return false;
  }
};

/** タブの現在URLに対して、ルールの matchType 条件を静的に判定する。 */
export const isMatchedRule = ({ rule, url }: { rule: HeaderRule; url: URL }) => {
  const isProtectedHost = (url: URL) => PROTECTED_HOSTNAMES.has(url.hostname);

  if (
    // declarativeNetRequest は chrome:// / chrome-extension:// / about: のような
    // ブラウザ内部ページのリクエストには介入できない。
    // 表示上だけ「送信されているように見える」誤表示になるの防ぐため、HTTPであることを確認する
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    // Chrome ウェブストアは https だが、ポリシーで拡張機能からの介入自体が禁止されている
    // 保護対象ドメイン。ここも declarativeNetRequest は発動しないため、同様に除外する。
    isProtectedHost(url)
  ) {
    return false;
  }

  switch (rule.matchType) {
    case 'url':
      return isMatchedUrl(rule.url, url);
    case 'origin':
      // origin は scheme+host+port の完全一致（Web標準のorigin定義）で判定する。
      // rule.origin は保存時に getNormalizedUrl で url.origin 形式へ正規化済みのため、
      // 再パースせず直接比較する（worker側の resolveRuleToCondition の |origin^ urlFilter と同じ基準）。
      return rule.origin === url.origin;
    case 'regexp':
      return isMatchedRegexp(rule.regexp, url);
  }
};
