/** CSS文字列リテラル内で `"` と `\` を無害化する。属性セレクタへの値埋め込み用。 */
export const escapeAttrValue = (value: string) =>
  value.replaceAll('\\', String.raw`\\`).replaceAll('"', String.raw`\"`);
