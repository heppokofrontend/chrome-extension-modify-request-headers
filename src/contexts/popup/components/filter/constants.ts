import type { FilterStatus } from '@/contexts/popup/components/filter/types';

export const FILTER_STATUSES = ['all', 'active', 'inactive'] as const;

// テキスト検索とステータス（all/active/inactive）セレクトは独立した軸だが、
// #filter-result の件数はその両方を組み合わせた「実際に見えている行数」にしたいので、
// 現在値をここに保持しておき、どちらの入力が変わっても両方まとめて再計算できるようにする。
// defaultResultText（フィルタ未適用時に出すデフォルト表示）は refreshFilterResultDefault()
// が STATE.rules から自分で組み立てる。他コンポーネントから値を渡してもらう形にはしない。
export const FILTER_STATE = {
  textValue: '',
  statusValue: 'all' as FilterStatus,
  defaultResultText: '',
};
