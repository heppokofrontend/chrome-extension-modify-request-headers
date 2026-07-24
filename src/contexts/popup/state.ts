import type { HeaderRule } from '@/types';
import { getDefaultLastInput } from '@/utils';

export const STATE = {
  rules: [] as HeaderRule[],
  /**
   * フォームの入力値と編集セッションの状態。chrome.storage.local に永続化されるのは
   * matchType/operation の2つのみ（SaveData['lastInput']、UX向上のため最後に選んだ値を
   * 次回起動時にも復元する）。editingId/isDirty はポップアップを開いている間だけの
   * 状態で永続化しない。
   */
  formState: {
    ...getDefaultLastInput(),
    /** 現在フォームで編集中のルールの id プロパティの値。空文字なら「新規作成中」。 */
    editingId: '',
    isDirty: false,
  },
};
