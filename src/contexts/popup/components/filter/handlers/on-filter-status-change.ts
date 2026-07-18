import { FILTER_STATE } from '@/contexts/popup/components/filter/constants';
import { applyFilter } from '@/contexts/popup/components/filter/effects';
import { isFilterStatus } from '@/contexts/popup/components/filter/utils';

/**
 * all / active / inactive で行（tr）の表示を絞り込む。加えて、セクション内が
 * 全部逆状態（例: active フィルタ中に全部 inactive のセクション）なら、
 * 空の見出しだけが残るのを避けるためセクションごと隠す。
 */
export const onFilterStatusChange = (e: Event) => {
  if (!(e.currentTarget instanceof HTMLSelectElement)) {
    return;
  }

  const { value } = e.currentTarget;

  if (!isFilterStatus(value)) {
    return;
  }

  FILTER_STATE.statusValue = value;
  applyFilter();
};
