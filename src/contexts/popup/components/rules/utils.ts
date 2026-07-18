/**
 * insertAdjacentHTML でHTML文字列を組み立てる際、ユーザー入力（origin/url/regexp/headerName
 * などルールの値）を埋め込む箇所は必ずこれを通す。素通しするとマークアップとして解釈され、
 * ポップアップの特権コンテキスト内でHTMLインジェクションが成立してしまう。
 */
export const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
