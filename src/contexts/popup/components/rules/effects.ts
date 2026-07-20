import { applyEditMode } from '@/contexts/popup/components/form';
import { confirmModal } from '@/contexts/popup/components/modal';
import { refreshRulesViews } from '@/contexts/popup/effects';
import { STATE } from '@/contexts/popup/state';
import { getMessage, setStorage } from '@/utils';

/** グループ（matchType + 照合値）内のルール全部の isActive を isActive に揃える。 */
export const toggleGroupActive = async (ids: readonly string[], isActive: boolean) => {
  const saved = await setStorage('rules', (current) =>
    current.map((rule) => (ids.includes(rule.id) ? { ...rule, isActive } : rule)),
  );

  if (saved === null) {
    return;
  }

  STATE.rules = saved;

  refreshRulesViews();
};

/** グループ内のルールを confirm 後にまとめて削除する。編集中のルールが含まれる場合は編集状態も解除する。 */
export const deleteGroup = async (ids: readonly string[], ruleLabel: string) => {
  const confirmed = await confirmModal(
    getMessage('modal_messageConfirmDelete', ids.length),
    ruleLabel,
  );

  if (!confirmed) {
    return;
  }

  const saved = await setStorage('rules', (current) =>
    current.filter((rule) => !ids.includes(rule.id)),
  );

  if (saved === null) {
    return;
  }

  STATE.rules = saved;

  if (ids.includes(STATE.editingId)) {
    applyEditMode.end();
  }

  refreshRulesViews();
};
