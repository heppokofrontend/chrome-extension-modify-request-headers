import { toggleGroupActive } from '@/contexts/popup/components/rules/effects';
import type { HeaderRule } from '@/types';

/** グループ一括の有効/無効トグルボタンをクリックしたときの処理。全部 active なら全部 inactive に、そうでなければ全部 active に揃える。 */
export const onToggleActiveButtonClick = (rules: HeaderRule[], ids: readonly string[]) => () => {
  const nextActive = !rules.every((rule) => rule.isActive);

  void toggleGroupActive(ids, nextActive);
};
