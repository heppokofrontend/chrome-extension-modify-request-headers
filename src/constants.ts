export const HEADER_OPERATIONS = ['set', 'append', 'remove'] as const;

export const MATCH_TYPES = ['url', 'origin', 'regexp'] as const;

/**
 * chrome.declarativeNetRequest がヘッダー書き換えに介入できるのは http/https/ws/wss のみ。
 * それ以外のスキーム（例: `ftp://`）は保存できても実リクエストにマッチせず、
 * 永遠に発火しないルールになるため弾く。
 */
export const URL_ALLOWED_SCHEMES = new Set(['http:', 'https:', 'ws:', 'wss:']);

/**
 * origin（matchType: 'origin'）は ws/wss を一致対象に含めないため http/https のみ許可する。
 */
export const ORIGIN_ALLOWED_SCHEMES = new Set(['http:', 'https:']);
