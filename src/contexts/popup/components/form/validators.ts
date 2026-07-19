/**
 * RFC 7230 の header-field name（token）が許可する文字集合。
 * これを満たさない名前は chrome.declarativeNetRequest 側でルールごと拒否される
 * （worker 側の `applyHeaderRules` が個別スキップするだけで、保存はできてしまい
 * 「保存したのに何も起きない」状態になる）ため、保存前にUI側で弾く。
 */
const HEADER_NAME_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export const isValidHeaderName = (value: string) => HEADER_NAME_TOKEN.test(value.trim());

/**
 * ヘッダー値は textarea 入力のため改行を含められてしまうが、HTTPヘッダーの値として
 * 改行は許容されない（CRLFインジェクションにつながる）。chrome.declarativeNetRequest 側でも
 * 拒否されるが、保存前にUI側で弾いてエラーを分かりやすくする。
 */
export const isValidHeaderValue = (value: string) => !/[\r\n]/.test(value);
