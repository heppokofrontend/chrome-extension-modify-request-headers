import { getDefaultSaveData } from '@/utils';

export const STATE = {
  /** 現在フォームで編集中のルールの id プロパティの値。空文字なら「新規作成中」。 */
  editingId: '',
  /** 現在メモリ上に保持している saveData。書き込みは setSaveData 経由に一本化する。 */
  saveData: getDefaultSaveData(),
};
