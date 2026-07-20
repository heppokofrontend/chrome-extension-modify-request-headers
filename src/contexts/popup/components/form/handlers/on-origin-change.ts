import { getNormalizedOrigin } from '@/contexts/popup/components/form/utils';

/** origin 入力欄の blur 時、スキーム省略(例: `heppokofrontend.dev`)を https:// で補って表示に反映する。 */
export const onOriginChange = (e: Event) => {
  if (!(e.currentTarget instanceof HTMLInputElement)) {
    return;
  }

  const normalized = getNormalizedOrigin(e.currentTarget.value);

  if (normalized !== null) {
    e.currentTarget.value = normalized;
  }
};
