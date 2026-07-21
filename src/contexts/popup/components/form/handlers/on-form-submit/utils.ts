import type { HeaderRule } from '@/types';

interface UpsertRuleParams {
  editingId: string;
  duplicate: HeaderRule | null;
}

/**
 * candidate を rules 配列へアップサートする。duplicate（重複を上書き確定した対象）が
 * あればその id に一本化する。別ルールを編集中に duplicate へ書き換えていた場合は、
 * 編集元の古いルールを rules から除いてから追加/上書きする。
 */
export const upsertRule = (
  rules: HeaderRule[],
  candidate: HeaderRule,
  { editingId, duplicate }: UpsertRuleParams,
): { nextRules: HeaderRule[]; id: string } => {
  const id = duplicate ? duplicate.id : candidate.id;

  const shouldDropEditingRule =
    duplicate !== null && editingId !== '' && editingId !== duplicate.id;
  const base = shouldDropEditingRule ? rules.filter((rule) => rule.id !== editingId) : rules;

  const nextRule = { ...candidate, id };
  const index = base.findIndex((rule) => rule.id === id);
  const nextRules =
    index === -1 ? [...base, nextRule] : base.map((rule, i) => (i === index ? nextRule : rule));

  return { nextRules, id };
};
