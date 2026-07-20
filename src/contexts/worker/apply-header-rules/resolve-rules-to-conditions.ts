import type { HeaderRule } from '@/types';
import { isSafeOrigin, isSafeUrl, isValidRegexp } from '@/validators';

const OPERATION_MAP = {
  set: chrome.declarativeNetRequest.HeaderOperation.SET,
  append: chrome.declarativeNetRequest.HeaderOperation.APPEND,
  remove: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
} as const;

const RESOURCE_TYPES = Object.values(chrome.declarativeNetRequest.ResourceType);

const toCondition = (rule: HeaderRule) => {
  switch (rule.matchType) {
    case 'url': {
      if (!isSafeUrl(rule.url)) {
        console.warn(`Skipping invalid url in saved rule: ${rule.url}`);
        return null;
      }
      // 保存時点で popup 側が正規化済みのはずだが、手動編集された旧データ等が
      // 非正規化のまま残っている可能性もあるため、ここでも `new URL().href` を
      // 通してから使う（isSafeUrl はASCIIに正規化できるかどうかしか見ておらず、
      // rule.url そのものがASCIIである保証はしていないため）。
      const href = new URL(rule.url).href;
      // urlFilter の "^" はセパレータ1文字またはURL終端にマッチするトークン。
      // 末尾を "^|" にすると「区切り文字1個（末尾スラッシュ想定）で終わるか、そこで終わるか」に
      // 限定でき、正規表現なしで末尾スラッシュの有無だけを同一URL扱いにできる。
      const withoutTrailingSlash = href.replace(/\/$/, '');
      // Chrome 118+ は urlFilter がデフォルトで大文字小文字無視。popup 側 isMatchedRule は
      // `===` の完全一致（大文字小文字を区別）なので、ここで明示的に区別させて両者を揃える。
      return {
        urlFilter: `|${withoutTrailingSlash}^|`,
        isUrlFilterCaseSensitive: true,
      };
    }

    case 'origin': {
      // requestDomains はscheme・ポートを区別できない（パース済みドメインのみでマッチする）ため、
      // http/https の取り違えや localhost の別ポートを同一視してしまう。
      // Web標準のorigin定義（scheme+host+portの完全一致）に揃え、url型と同じ
      // "|" 絶対アンカーで直接組み立てる（サブドメインへは一致させない）。
      // 末尾は区切り文字1文字にマッチする "^" ではなくリテラルの "/" にする。"^" は ":" にも
      // マッチするため、"^" のままだと同一ホストの別ポート（例: https://example.com:8443）にも
      // 誤マッチしてしまう。http/https の実URLはブラウザ正規化により origin 直後が必ず "/" に
      // なるため、"/" 固定で「同一 origin 配下すべてに一致・別ポートは不一致」を表現できる。
      if (!isSafeOrigin(rule.origin)) {
        console.warn(`Skipping invalid origin in saved rule: ${rule.origin}`);
        return null;
      }
      // rule.origin は表示用に生入力のまま保存されている（punycode正規化はしていない）ため、
      // url型と同様にここで `new URL().origin` を通してからurlFilterを組み立てる。
      const origin = new URL(rule.origin).origin;
      return { urlFilter: `|${origin}/` };
    }

    case 'regexp': {
      if (!isValidRegexp(rule.regexp)) {
        console.warn(`Skipping invalid regexp in saved rule: ${rule.regexp}`);
        return null;
      }
      return { regexFilter: rule.regexp };
    }

    default:
      return null;
  }
};

export const resolveRulesToConditions = (rules: HeaderRule[]) => {
  return rules.flatMap((rule, index) => {
    if (!rule.isActive) {
      return [];
    }

    const condition = toCondition(rule);

    if (condition === null) {
      return [];
    }

    return [
      {
        id: index + 1,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            {
              header: rule.headerName,
              operation: OPERATION_MAP[rule.operation],
              ...(rule.operation === 'remove' ? {} : { value: rule.value }),
            },
          ],
        },
        condition: {
          resourceTypes: RESOURCE_TYPES,
          ...condition,
        },
      },
    ];
  });
};
