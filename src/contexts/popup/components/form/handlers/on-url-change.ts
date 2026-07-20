import { setCustomValidities } from '@/contexts/popup/components/form/effects';
import { getNormalizedUrl } from '@/contexts/popup/components/form/utils';
import { UI } from '@/contexts/popup/constants';

/**
 * url入力欄のblur時、matchTypeがurl/prefixの場合にスキーム省略(例: `heppokofrontend.dev`)を
 * https:// で補い、originのみの入力なら末尾スラッシュも補って表示に反映する。
 * origin時代の onOriginChange の挙動を url/prefix 双方に引き継ぐ形。
 * matchType: regexp は対象の入力欄（regexpInput）自体が異なるため対象外。
 * 正規化後は setCustomValidities を明示的に呼び直す（後述）。
 */
export const onUrlChange = (e: Event) => {
  const input = e.currentTarget;

  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  if (UI.matchTypeSelect.value !== 'url' && UI.matchTypeSelect.value !== 'prefix') {
    return;
  }

  const normalized = getNormalizedUrl(input.value);

  if (normalized === null) {
    return;
  }

  input.value = normalized;

  // .value への直接代入は input イベントを発火しない。onFieldInput（=setCustomValidities）が
  // 呼ばれないと、正規化前の値に対して付いた customValidity のエラーメッセージが値が有効に
  // なった後も残り続け、次の submit 時に素の required 違反より先に古いメッセージが表示され
  // 原因を誤認させる。ここで明示的に呼び直して即座に消す。
  setCustomValidities();
};
