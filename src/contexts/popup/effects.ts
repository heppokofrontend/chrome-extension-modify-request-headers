// rules/filter バレル経由だと rules/effects.ts や form/handlers 側から見て循環importになりうるため、
// ここでは各コンポーネントの定義ファイルを直接参照する。
import { refreshFilterResultDefault } from '@/contexts/popup/components/filter/effects';
import { renderRules } from '@/contexts/popup/components/rules/renderers/render-rules';
import { renderStatus } from '@/contexts/popup/components/status';

/** ルール一覧・ステータス・フィルタのデフォルト結果表示を、STATE.rules の内容に合わせて作り直す。 */
export const refreshRulesViews = () => {
  renderRules();
  void renderStatus();
  refreshFilterResultDefault();
};
