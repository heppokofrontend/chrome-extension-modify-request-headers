import type { HeaderRule } from '@/types';
import { getDefaultFormState } from '@/utils';

export const STATE = {
  /** 現在フォームで編集中のルールの id プロパティの値。空文字なら「新規作成中」。 */
  editingId: '',
  rules: [] as HeaderRule[],
  formState: getDefaultFormState(),
};
