import {
  applyMatchTypeVisibility,
  renderMatchDatalists,
} from '@/contexts/popup/components/form/effects';
import { STATE } from '@/contexts/popup/state';
import { isMatchType, setStorage } from '@/utils';

/** matchType の選択に応じて url / prefix / regexp フィールドの表示と候補の datalist を切り替える。 */
export const onMatchTypeChange = (e: Event) => {
  if (!(e.currentTarget instanceof HTMLSelectElement)) {
    return;
  }

  const { value } = e.currentTarget;

  if (!isMatchType(value)) {
    return;
  }

  applyMatchTypeVisibility(value);
  renderMatchDatalists(value);

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
