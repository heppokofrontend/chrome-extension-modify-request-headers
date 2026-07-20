import { isSafeUrl } from '@/validators';

/**
 * `new URL()` はスキームなしの入力（例: `heppokofrontend.dev`）を例外にする。
 * スキーム省略時は https を文字列として補って救済し、それでも不正なら null を返す。
 * origin時代の getNormalizedOrigin を踏襲するが、prefixはpathを持ちうるため
 * パス・クエリ・末尾スラッシュはそのまま保つ（isSafeUrl はそれらを許容する）。
 * ただし入力が origin と一致する（パス/クエリ/フラグメントを持たない）場合だけは、
 * 末尾スラッシュを補って「ドメイン全体にマッチする」ことを表示上も分かりやすくする。
 * href（punycode正規化済み）は判定にのみ使い、返す値は生の candidate を使うことで
 * 非ASCIIドメインをpunycodeに書き換えてしまわないようにする。
 */
export const getNormalizedUrl = (input: string) => {
  const trimmed = input.trim();

  if (trimmed === '') {
    return null;
  }

  const candidate = isSafeUrl(trimmed) ? trimmed : `https://${trimmed}`;

  if (!isSafeUrl(candidate)) {
    return null;
  }

  const parsed = new URL(candidate);
  const isBareOrigin = parsed.href === `${parsed.origin}/`;

  return isBareOrigin && !candidate.endsWith('/') ? `${candidate}/` : candidate;
};
