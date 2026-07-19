/**
 * declarativeNetRequest の urlFilter / regexFilter は ASCII のみ許可。1件でも非ASCII文字が
 * 混じると updateDynamicRules がバッチ全体を拒否し、他の正常なルールまで巻き添えで
 * 消えてしまう事故につながる。regexFilter は正規表現なので非ASCII入力をこちらで直接弾くが、
 * url 側は isSafeUrl（下記）が `new URL().href` 正規化後の結果に対してこれを使う。
 */
// eslint-disable-next-line no-control-regex
export const isAscii = (value: string) => /^[\x00-\x7F]*$/.test(value);

/**
 * chrome.declarativeNetRequest がヘッダー書き換えに介入できるのは http/https/ws/wss のみ。
 * それ以外のスキーム（例: `ftp://`）は保存できても実リクエストにマッチせず、
 * 永遠に発火しないルールになるため弾く。
 */
const ALLOWED_URL_SCHEMES = new Set(['http:', 'https:', 'ws:', 'wss:']);

/**
 * url は declarativeNetRequest の urlFilter として使われるため ASCII である必要があるが、
 * 非ASCII文字を含む生の入力そのものを拒否する必要はない。`new URL().href` は
 * 非ASCII文字を必ず punycode / パーセントエンコーディングでASCIIへ正規化する
 * （http/https/ws/wss は特別スキームとして扱われ、host は常にpunycode化、
 * path/query/fragment/userinfo は常にパーセントエンコードされるため、href が
 * 非ASCIIを含むことはない）。かつ既存の `%XX` はデコードも再エンコードもされず
 * そのまま素通りするため、二重エンコードで壊れる心配もない。よって「正規化できるか」
 * だけを見れば十分で、生入力の見た目のASCII判定は不要。
 *
 * ここまでは Chrome公式ドキュメント（declarativeNetRequest の urlFilter は
 * 「hostはpunycode、それ以外の非ASCII文字はUTF-8でURLエンコードされた状態」に対して
 * マッチする、との記載）でも裏付けられており確証がある。一方、urlFilter 構文が特別に
 * 扱う `*`（ワイルドカード）・`|`（アンカー）・`^`（セパレータ）をエスケープする手段は
 * 未実装（Chrome側のドキュメントにもエスケープ方法の記載がない）。正規化後のURLに
 * これらの文字がリテラルに含まれる場合、意図しないマッチになる可能性が残る。
 * つまり「ASCIIになる」ことは確証があるが、「urlFilter として常に安全」は未確認。
 */
export const isSafeUrl = (url: string) => {
  try {
    const { protocol, href } = new URL(url);
    return ALLOWED_URL_SCHEMES.has(protocol) && isAscii(href);
  } catch {
    return false;
  }
};

/**
 * origin（matchType: 'origin'）用の検証。`url.origin` はパス・クエリ・ハッシュ・
 * 認証情報を黙って切り捨てるため、それらを入力してしまった場合に「実は無視されている」
 * ことに気づけない。ここでは scheme + host（+ port）だけの純粋な origin であることを
 * 要求し、それ以外は弾く。scheme は http/https のみ許可（ws/wss は origin 一致の対象外）。
 * isSafeUrl 同様、非ASCIIホストの生入力自体は拒否しない（正規化後にASCII化されるため）。
 */
export const isSafeOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (url.pathname === '' || url.pathname === '/') &&
      url.search === '' &&
      url.hash === '' &&
      url.username === '' &&
      url.password === '' &&
      isAscii(url.origin)
    );
  } catch {
    return false;
  }
};

/**
 * declarativeNetRequest の regexFilter は RE2 構文だが、こちらは簡易チェックとして
 * JS の RegExp でコンパイルできるか・ASCIIか・空でないかだけを見る
 * （明らかに壊れた入力を弾ければ十分なため）。
 */
export const isValidRegexp = (pattern: string) => {
  if (!pattern.trim() || !isAscii(pattern)) {
    return false;
  }

  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
};

/**
 * isValidRegexp は JS の RegExp が通るかしか見ておらず、lookbehind・後方参照など
 * JS では合法でも RE2（declarativeNetRequest の regexFilter が使う構文）では拒否される
 * ケースを見逃す。その場合 worker 側の resilient ループが該当ルールを黙ってスキップし、
 * 「保存できるのに効かない」状態になるため、保存前に検証専用APIで最終チェックする。
 */
export const isRegexSupportedByEngine = async (pattern: string) => {
  const { isSupported } = await chrome.declarativeNetRequest.isRegexSupported({
    regex: pattern,
  });
  return isSupported;
};
