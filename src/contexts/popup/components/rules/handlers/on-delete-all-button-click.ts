import { deleteGroup } from '@/contexts/popup/components/rules/effects';

/** グループ一括削除ボタンをクリックしたときの処理。 */
export const onDeleteAllButtonClick = (ids: readonly string[], ruleLabel: string) => () => {
  void deleteGroup(ids, ruleLabel);
};
