import { FILTER_STATE } from '@/contexts/popup/components/filter/constants';
import { applyFilter } from '@/contexts/popup/components/filter/effects';

export const onFilterInput = (e: Event) => {
  if (!(e.currentTarget instanceof HTMLInputElement)) {
    return;
  }

  FILTER_STATE.textValue = e.currentTarget.value;
  applyFilter();
};
