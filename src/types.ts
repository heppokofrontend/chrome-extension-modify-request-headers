import type { HEADER_OPERATIONS, MATCH_TYPES } from '@/constants';

export type OperationType = (typeof HEADER_OPERATIONS)[number];

export type MatchType = (typeof MATCH_TYPES)[number];

/**
 * declarativeNetRequest の HeaderOperation にそのまま対応する、1件のヘッダ書き換えルール。
 * `id` は編集・rename・削除のための安定した識別子（origin / headerName は
 * ユーザーが後から書き換える対象であり、キーには使えない）。
 * `remove` は value を送信に使わないが、入力欄の値自体は保存データ上で保持し続ける。
 *
 * `matchType` はマッチ方式の切り替えフラグ。url / origin / regexp の
 * 3つの値はどれが選ばれていても常にすべて保持する（フラグを切り替えても
 * 入力し直さずに済むようにするため）。実際にルールへ使われるのは
 * `matchType` が指す値のみ。
 *
 * - `url`: 入力した URL 文字列にマッチしたときだけ適用（末尾スラッシュの有無は区別しない。
 *   保存時に urlFilter の `|...^|` アンカーへ変換する）
 * - `origin`: ドメイン全体に適用（`https://api.example.com` のような形をそのまま入力）
 * - `regexp`: 正規表現（RE2 構文）でマッチ
 *
 * @example
 * ```ts
 * const rule: HeaderRule = {
 *   id: 'a1b2c3',
 *   matchType: 'origin',
 *   url: '',
 *   origin: 'https://api.example.com',
 *   regexp: '',
 *   headerName: 'Authorization',
 *   operation: 'set',
 *   value: 'Bearer xxx',
 *   isActive: true,
 * };
 * ```
 */
export type HeaderRule = {
  id: string;
  matchType: MatchType;
  url: string;
  origin: string;
  regexp: string;
  headerName: string;
  operation: OperationType;
  /** `remove` のときも入力欄の値をそのまま保持する（operation 切り替え時に消えないように）。 */
  value: string;
  /** false のルールは worker 側の適用から除外する（削除せず一時的に無効化するように）。 */
  isActive: boolean;
};

export type SaveDataType = {
  rules: HeaderRule[];
  formState: {
    matchType: MatchType;
    operation: OperationType;
  };
};
