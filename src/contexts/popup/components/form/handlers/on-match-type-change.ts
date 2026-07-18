import { applyMatchTypeVisibility } from '@/contexts/popup/components/form/effects';
import { STATE } from '@/contexts/popup/state';
import { isMatchType, setSaveData } from '@/utils';

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
  void setSaveData((current) => ({
    ...current,
    formState: { ...current.formState, matchType: value },
  })).then((saved) => {
    if (saved === null) {
      return;
    }

    STATE.saveData = saved;
  });
};
