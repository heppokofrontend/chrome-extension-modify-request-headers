import { applyOperationVisibility } from '@/contexts/popup/components/form/effects';
import { STATE } from '@/contexts/popup/state';
import { isOperationType, setStorage } from '@/utils';

/** operation の選択に応じて value 入力欄の表示を切り替えるだけ。保存は Save ボタンで行う。 */
export const onOperationChange = (e: Event) => {
  if (!(e.currentTarget instanceof HTMLSelectElement)) {
    return;
  }

  const { value } = e.currentTarget;

  if (!isOperationType(value)) {
    return;
  }

  applyOperationVisibility(value);
  void setStorage('formState', (current) => ({
    ...current,
    operation: value,
  })).then((saved) => {
    if (saved === null) {
      return;
    }

    STATE.formState = saved;
  });
};
