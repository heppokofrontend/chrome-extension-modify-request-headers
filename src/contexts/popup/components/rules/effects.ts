import { applyEditMode } from '@/contexts/popup/components/form';
import { confirmModal } from '@/contexts/popup/components/modal';
import { renderRules } from '@/contexts/popup/components/rules/renderers/render-rules';
import { renderStatus } from '@/contexts/popup/components/status';
import { STATE } from '@/contexts/popup/state';
import { getMessage, setSaveData } from '@/utils';

/** グループ（matchType + 照合値）内のルール全部の isActive を isActive に揃える。 */
export const toggleGroupActive = async (ids: readonly string[], isActive: boolean) => {
  const saved = await setSaveData((current) => ({
    ...current,
    rules: current.rules.map((rule) => (ids.includes(rule.id) ? { ...rule, isActive } : rule)),
  }));

  if (saved === null) {
    return;
  }

  STATE.saveData = saved;

  renderRules();
  void renderStatus();
};

/** グループ内のルールを confirm 後にまとめて削除する。編集中のルールが含まれる場合は編集状態も解除する。 */
export const deleteGroup = async (ids: readonly string[], ruleLabel: string) => {
  const confirmed = await confirmModal(
    getMessage('modal_messageConfirmDelete', [String(ids.length)]),
    ruleLabel,
  );

  if (!confirmed) {
    return;
  }

  const saved = await setSaveData((current) => ({
    ...current,
    rules: current.rules.filter((rule) => !ids.includes(rule.id)),
  }));

  if (saved === null) {
    return;
  }

  STATE.saveData = saved;

  if (ids.includes(STATE.editingId)) {
    applyEditMode.end();
  }

  renderRules();
  void renderStatus();
};
