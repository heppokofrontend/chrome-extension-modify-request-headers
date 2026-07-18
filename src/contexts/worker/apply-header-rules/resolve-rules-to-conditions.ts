import type { HeaderRule } from '@/types';
import { isAscii, isValidRegexp } from '@/validators';

const OPERATION_MAP = {
  set: chrome.declarativeNetRequest.HeaderOperation.SET,
  append: chrome.declarativeNetRequest.HeaderOperation.APPEND,
  remove: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
} as const;

const isValidOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    return url.origin === origin;
  } catch {
    return false;
  }
};

const RESOURCE_TYPES = Object.values(chrome.declarativeNetRequest.ResourceType);

const toCondition = (rule: HeaderRule) => {
  const resourceTypes = RESOURCE_TYPES;

  switch (rule.matchType) {
    case 'url': {
      if (!rule.url.trim() || !isAscii(rule.url)) {
        console.warn(`Skipping invalid url in saved rule: ${rule.url}`);
        return undefined;
      }
      // urlFilter の "^" はセパレータ1文字またはURL終端にマッチするトークン。
      // 末尾を "^|" にすると「区切り文字1個（末尾スラッシュ想定）で終わるか、そこで終わるか」に
      // 限定でき、正規表現なしで末尾スラッシュの有無だけを同一URL扱いにできる。
      const withoutTrailingSlash = rule.url.replace(/\/$/, '');
      // Chrome 118+ は urlFilter がデフォルトで大文字小文字無視。popup 側 isMatchedRule は
      // `===` の完全一致（大文字小文字を区別）なので、ここで明示的に区別させて両者を揃える。
      return {
        urlFilter: `|${withoutTrailingSlash}^|`,
        resourceTypes,
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
      if (!isValidOrigin(rule.origin)) {
        console.warn(`Skipping invalid origin in saved rule: ${rule.origin}`);
        return undefined;
      }
      return { urlFilter: `|${rule.origin}/`, resourceTypes };
    }

    case 'regexp': {
      if (!isValidRegexp(rule.regexp)) {
        console.warn(`Skipping invalid regexp in saved rule: ${rule.regexp}`);
        return undefined;
      }
      return { regexFilter: rule.regexp, resourceTypes };
    }
  }
};

export const resolveRulesToConditions = (
  rules: HeaderRule[],
): NonNullable<chrome.declarativeNetRequest.UpdateRuleOptions['addRules']> => {
  return rules.flatMap((rule, index) => {
    if (!rule.isActive) {
      return [];
    }

    const condition = toCondition(rule);

    if (condition === undefined) {
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
        condition,
      },
    ];
  });
};
