import { getNormalizedUrl } from '@/contexts/popup/components/form/utils';
import { UI } from '@/contexts/popup/constants';

/**
 * url入力欄のblur時、matchTypeがprefixの場合に限りスキーム省略(例: `heppokofrontend.dev`)を
 * https:// で補って表示に反映する。origin時代の onOriginChange の挙動を prefix に引き継ぐ。
 * matchType: url は完全一致を要求する入力のため対象外（従来どおりスキーム必須のまま）。
 */
export const onUrlChange = (e: Event) => {
  if (!(e.currentTarget instanceof HTMLInputElement)) {
    return;
  }

  if (UI.matchTypeSelect.value !== 'prefix') {
    return;
  }

  const normalized = getNormalizedUrl(e.currentTarget.value);

  if (normalized !== null) {
    e.currentTarget.value = normalized;
  }
};
