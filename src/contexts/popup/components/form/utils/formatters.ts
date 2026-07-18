import type { HeaderRule } from '@/types';

/** 重複確認ダイアログの as-is / to-be 表示用に、operation + value を1行にする。 */
export const formatRuleSummary = (rule: Pick<HeaderRule, 'operation' | 'value'>) =>
  rule.operation === 'remove' ? rule.operation : `${rule.operation}: ${rule.value}`;
