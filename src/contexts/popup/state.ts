import type { HeaderRule } from '@/types';
import { getDefaultFormState } from '@/utils';

export const STATE = {
  /** 現在フォームで編集中のルールの id プロパティの値。空文字なら「新規作成中」。 */
  editingId: '',
  /** 現在メモリ上に保持している rules/formState。書き込みは setStorage 経由に一本化する。 */
  rules: [] as HeaderRule[],
  formState: getDefaultFormState(),
};
