import { applyMatchTypeVisibility } from '@/contexts/popup/components/form/effects';
import { STATE } from '@/contexts/popup/state';
import { isMatchType, setStorage } from '@/utils';

/** matchType の選択に応じて origin / regexp フィールドの表示を切り替えるだけ。 */
export const onMatchTypeChange = (e: Event) => {
  if (!(e.currentTarget instanceof HTMLSelectElement)) {
    return;
  }

  const { value } = e.currentTarget;

  if (!isMatchType(value)) {
    return;
  }

  applyMatchTypeVisibility(value);
  void setStorage('formState', (current) => ({
    ...current,
    matchType: value,
  })).then((saved) => {
    if (saved === null) {
      return;
    }

    STATE.formState = saved;
  });
};
