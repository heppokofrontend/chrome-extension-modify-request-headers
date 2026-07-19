import { isSafeOrigin } from '@/validators';

// origin の pathname は isSafeOrigin により '' か '/' のみ許可されるため、末尾スラッシュは
// 有無で意味が変わらない。放置すると同一originなのに見た目違いで重複保存されてしまうため、
// ここだけは正規化（trim）の対象にする。
const stripTrailingSlash = (value: string) => (value.endsWith('/') ? value.slice(0, -1) : value);

/**
 * `new URL()` はスキームなしの入力（例: `heppokofrontend.dev`）を例外にする。
 * スキーム省略時は https を文字列として補って救済し、それでも不正なら undefined を返す。
 * 検証には isSafeOrigin（URL パース）を使うが、返す値は `url.origin` を読み返さない
 * （非ASCIIホストが常にpunycode化されてしまい、表示が読めなくなるため）。
 * ここでの「正規化」はスキーマ補完と末尾スラッシュのtrimに留め、生入力はそれ以外そのまま保存する。
 */
export const getNormalizedUrl = {
  asOrigin: (input: string) => {
    const trimmed = input.trim();

    if (trimmed === '') {
      return undefined;
    }

    if (isSafeOrigin(trimmed)) {
      return stripTrailingSlash(trimmed);
    }

    const withScheme = `https://${trimmed}`;

    return isSafeOrigin(withScheme) ? stripTrailingSlash(withScheme) : undefined;
  },
};
