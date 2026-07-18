import { setCustomValidities } from '@/contexts/popup/components/form/effects';

/**
 * url/origin/regexp/headerName/value の input イベントに束ねて登録する。setCustomValidity は
 * 明示的に呼び直すまで残り続けるため、直前の submit で付いたエラーメッセージが、値を打ち直した
 * 後まで表示され続けるのを防ぐ。
 */
export const onFieldInput = () => {
  setCustomValidities();
};
