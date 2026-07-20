import { isSafeUrl } from '@/validators';

/**
 * `new URL()` はスキームなしの入力（例: `heppokofrontend.dev`）を例外にする。
 * スキーム省略時は https を文字列として補って救済し、それでも不正なら null を返す。
 * origin時代の getNormalizedOrigin を踏襲するが、prefixはpathを持ちうるため
 * パス・クエリ・末尾スラッシュはそのまま保つ（isSafeUrl はそれらを許容する）。
 */
export const getNormalizedUrl = (input: string) => {
  const trimmed = input.trim();

  if (trimmed === '') {
    return null;
  }

  if (isSafeUrl(trimmed)) {
    return trimmed;
  }

  const withScheme = `https://${trimmed}`;

  return isSafeUrl(withScheme) ? withScheme : null;
};
