import { applyEditMode, resetFields } from '@/contexts/popup/components/form/effects';
import { formatRuleSummary } from '@/contexts/popup/components/form/utils';
import { confirmModal } from '@/contexts/popup/components/modal';
import { refreshRulesViews } from '@/contexts/popup/effects';
import { STATE } from '@/contexts/popup/state';
import { getRuleById } from '@/contexts/popup/utils';
import { getMessage, setStorage } from '@/utils';

export const deleteRule = async () => {
  if (STATE.formState.editingId === '') {
    return;
  }

  const rule = getRuleById(STATE.formState.editingId);

  if (rule === null) {
    return;
  }

  // グループ削除（rules/effects.ts の deleteGroup）と同様、単体削除も
  // 破壊的操作として confirm を挟み、誤操作でルールが消えるのを防ぐ。
  const isConfirmed = await confirmModal(
    getMessage('modal_messageConfirmDeleteRule'),
    `${rule.headerName}: ${formatRuleSummary(rule)}`,
  );

  if (!isConfirmed) {
    return;
  }

  const saved = await setStorage('rules', (current) =>
    current.filter((r) => r.id !== STATE.formState.editingId),
  );

  if (saved === null) {
    return;
  }

  STATE.rules = saved;

  resetFields.all();

  refreshRulesViews();
  applyEditMode.end();
};

export const onDeleteClick = (e: Event) => {
  e.preventDefault();
  void deleteRule();
};
