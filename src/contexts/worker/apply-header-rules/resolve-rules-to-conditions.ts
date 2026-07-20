import type { HeaderRule } from '@/types';
import { stripTrailingSlash } from '@/utils';
import { isSafeUrl, isValidRegexp } from '@/validators';

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
      const withoutTrailingSlash = stripTrailingSlash(href);
      // Chrome 118+ は urlFilter がデフォルトで大文字小文字無視。popup 側 isMatchedRule は
      // `===` の完全一致（大文字小文字を区別）なので、ここで明示的に区別させて両者を揃える。
      return {
        urlFilter: `|${withoutTrailingSlash}^|`,
        isUrlFilterCaseSensitive: true,
      };
    }

    case 'prefix': {
      if (!isSafeUrl(rule.url)) {
        console.warn(`Skipping invalid url in saved rule: ${rule.url}`);
        return null;
      }
      // url型と同じ理由（生入力のまま保存されている）で `new URL().href` を通す。
      // 前方一致なので url型と異なり末尾アンカー "^|" は付けない
      // （それを付けると完全一致になり、prefix の意味がなくなる）。
      const href = new URL(rule.url).href;
      return {
        urlFilter: `|${href}`,
        isUrlFilterCaseSensitive: true,
      };
    }

    case 'regexp': {
      if (!isValidRegexp(rule.regexp)) {
        console.warn(`Skipping invalid regexp in saved rule: ${rule.regexp}`);
        return null;
      }
      // isUrlFilterCaseSensitive は urlFilter だけでなく regexFilter にも効く。
      // url型と同様、popup側 isMatchedRule の `new RegExp(pattern).test()`（大文字小文字を
      // 区別）に揃えるため、Chrome 118+ の既定値（大文字小文字無視）を明示的に上書きする。
      return { regexFilter: rule.regexp, isUrlFilterCaseSensitive: true };
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
