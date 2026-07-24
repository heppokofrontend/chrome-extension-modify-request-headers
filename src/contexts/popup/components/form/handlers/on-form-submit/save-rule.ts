import {
  applyEditMode,
  focusRuleButton,
  resetFields,
} from '@/contexts/popup/components/form/effects';
import { formatRuleSummary } from '@/contexts/popup/components/form/utils';
import { confirmModal } from '@/contexts/popup/components/modal';
import { refreshRulesViews } from '@/contexts/popup/effects';
import { STATE } from '@/contexts/popup/state';
import { findDuplicateRule } from '@/contexts/popup/utils';
import type { HeaderRule } from '@/types';
import { getMessage, setStorage } from '@/utils';

import { upsertRule } from './utils';

/** 重複確認・保存確定・保存後のフォーム/一覧の後始末をまとめて行う。 */
export const saveRule = async (candidate: HeaderRule) => {
  // 同じ対象（matchType + 値）に同じヘッダー名がすでにあれば、サイレントに
  // 追加/上書きせず as-is / to-be を見せて確認する。
  const duplicate = findDuplicateRule(candidate);

  if (duplicate) {
    const confirmed = await confirmModal(getMessage('form_confirmOverwriteRule'), {
      asIs: formatRuleSummary(duplicate),
      toBe: formatRuleSummary(candidate),
    });

    if (!confirmed) {
      return;
    }
  }

  const wasEditing = STATE.formState.editingId !== '';

  // 編集元ルールの削除とcandidateの追加/上書きを別々に2回persistすると、
  // 1回目成功・2回目失敗のケースでメモリとストレージが食い違ってしまうため、
  // 1つのrules配列にまとめてから1回だけpersistする。
  const { nextRules, id } = upsertRule(STATE.rules, candidate, {
    editingId: STATE.formState.editingId,
    duplicate,
  });

  const saved = await setStorage('rules', nextRules);

  if (saved === null) {
    return;
  }

  STATE.rules = saved;

  refreshRulesViews();

  // 編集モードからの保存なら、作り直された一覧の中でも同じルールの編集ボタンに
  // フォーカスを戻す（renderRules() が DOM を全部作り直すため、フォーカスが消えてしまう）。
  if (wasEditing) {
    focusRuleButton(id);
  }

  resetFields.header(candidate);
  applyEditMode.end();
};
