import { isAscii } from '@/validators';

/**
 * chrome.declarativeNetRequest がヘッダー書き換えに介入できるのは
 * http/https/ws/wss のみ。それ以外のスキーム（例: `ftp://`）は保存できても
 * 実リクエストにマッチせず、永遠に発火しないルールになるため保存前に弾く。
 */
const ALLOWED_URL_SCHEMES = new Set(['http:', 'https:', 'ws:', 'wss:']);

/**
 * url はリクエストURL（location.href 相当）とそのまま文字列比較する。比較対象の
 * location.href は常に絶対URLとしてパース可能な形なので、こちらも `new URL()` で
 * パースできることを要求する。
 */
export const isValidUrl = (url: string) => {
  if (!url.trim() || !isAscii(url)) {
    return false;
  }

  try {
    return ALLOWED_URL_SCHEMES.has(new URL(url).protocol);
  } catch {
    return false;
  }
};

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
