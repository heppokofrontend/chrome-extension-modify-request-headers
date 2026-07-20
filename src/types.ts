import type { HEADER_OPERATIONS, MATCH_TYPES } from '@/constants';

export type OperationType = (typeof HEADER_OPERATIONS)[number];

export type MatchType = (typeof MATCH_TYPES)[number];

/**
 * declarativeNetRequest の HeaderOperation に対応する1件のヘッダ書き換えルール。
 * id は安定識別子（origin/headerName はユーザーが書き換える対象のためキーに使えない）。
 * matchType が url/origin/regexp のどれでも、3値は常にすべて保持する
 * （切り替え時に入力し直さずに済むように）。実際に使われるのは matchType が指す値のみ。
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

export type SaveData = {
  rules: HeaderRule[];
  formState: {
    matchType: MatchType;
    operation: OperationType;
  };
};
