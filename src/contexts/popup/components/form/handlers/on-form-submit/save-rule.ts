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

  // 重複を上書き確定した場合は、重複先ルールの id に一本化する。
  // 別ルールを編集中にその重複先へ書き換えていたなら、編集元の古いルールは消す。
  const id = duplicate ? duplicate.id : candidate.id;
  const wasEditing = Boolean(STATE.formState.editingId);

  // 編集元の除去とcandidateのupsertを1つのrules配列にまとめてから1回だけpersistする。
  // deleteRule → upsertRule の2回書き込みだと、1回目成功・2回目失敗のケースで
  // メモリとストレージが食い違ってしまうため。
  const shouldDropEditingRule =
    Boolean(duplicate) &&
    Boolean(STATE.formState.editingId) &&
    STATE.formState.editingId !== duplicate?.id;
  const base = shouldDropEditingRule
    ? STATE.rules.filter((rule) => rule.id !== STATE.formState.editingId)
    : STATE.rules;
  const nextRule = { ...candidate, id };
  const index = base.findIndex((rule) => rule.id === id);
  const nextRules =
    index === -1 ? [...base, nextRule] : base.map((rule, i) => (i === index ? nextRule : rule));

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
