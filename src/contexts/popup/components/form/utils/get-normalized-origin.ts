import { stripTrailingSlash } from '@/contexts/popup/utils';
import { isSafeOrigin } from '@/validators';

/**
 * `new URL()` はスキームなしの入力（例: `heppokofrontend.dev`）を例外にする。
 * スキーム省略時は https を文字列として補って救済し、それでも不正なら null を返す。
 * 検証には isSafeOrigin（URL パース）を使うが、返す値は `url.origin` を読み返さない
 * （非ASCIIホストが常にpunycode化されてしまい、表示が読めなくなるため）。
 * ここでの「正規化」はスキーマ補完と末尾スラッシュのtrimに留め、生入力はそれ以外そのまま保存する。
 */
export const getNormalizedOrigin = (input: string) => {
  const trimmed = input.trim();

  if (trimmed === '') {
    return null;
  }

  if (isSafeOrigin(trimmed)) {
    return stripTrailingSlash(trimmed);
  }

  const withScheme = `https://${trimmed}`;

  return isSafeOrigin(withScheme) ? stripTrailingSlash(withScheme) : null;
};
