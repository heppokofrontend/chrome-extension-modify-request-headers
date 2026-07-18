import type { HeaderRule, SaveDataType } from '@/types';

import { getMessage } from './i18n';
import { isHeaderRule, isMatchType, isOperationType, isRecord } from './type-guards';

const defaultFormState = {
  matchType: 'url',
  operation: 'set',
} as const satisfies SaveDataType['formState'];

export const getDefaultSaveData = (): SaveDataType => ({
  rules: [],
  formState: { ...defaultFormState },
});

const sanitizeRules = (rules: unknown[]): HeaderRule[] =>
  rules.filter((rule, index): rule is HeaderRule => {
    if (isHeaderRule(rule)) {
      return true;
    }
    console.warn(`Skipping malformed rule at index ${index} in saved data.`, rule);
    return false;
  });

const sanitizeFormState = (formState: unknown): SaveDataType['formState'] => {
  const defaults = getDefaultSaveData().formState;

  if (!isRecord(formState)) {
    return defaults;
  }

  return {
    matchType: isMatchType(formState['matchType']) ? formState['matchType'] : defaults.matchType,
    operation: isOperationType(formState['operation'])
      ? formState['operation']
      : defaults.operation,
  };
};

const sanitizeSaveData = (saveData: unknown): SaveDataType => {
  if (!isRecord(saveData)) {
    return getDefaultSaveData();
  }

  return {
    rules: Array.isArray(saveData['rules']) ? sanitizeRules(saveData['rules']) : [],
    formState: sanitizeFormState(saveData['formState']),
  };
};

export const getSaveData = async () => {
  const { saveData } = await chrome.storage.local.get('saveData');

  return sanitizeSaveData(saveData);
};

// 呼び出し側には await せず setSaveData を撃ちっぱなしにする箇所があるため、
// 直列化しないと後発の読み取りが先発の書き込み前の値を拾って更新を握りつぶす。
let writeQueue = Promise.resolve<SaveDataType | null | undefined>(undefined);

/**
 * SaveData を書き換える唯一の入口。呼び出し側は現在値を意識せず、
 * 現在値から次の値を組み立てる updater だけを渡す。previous は
 * 呼び出し側が持つUIステートのキャッシュではなく、必ず getSaveData() で
 * 実際の永続化先から読み直す。
 * このモジュールは popup 専用の STATE（UIステート）を知らないレイヤーに
 * 置くため、STATE への反映は行わない。呼び出し側は戻り値（成功時は次の
 * saveData、失敗時は null）を await または then() で受け取り、成功時に
 * 自分の持つ UI ステートへ書き込むこと。
 */
export const setSaveData = (
  updater: (current: SaveDataType) => SaveDataType,
): Promise<SaveDataType | null> => {
  const write = async (): Promise<SaveDataType | null> => {
    const previous = await getSaveData();
    const next = updater(previous);

    try {
      await chrome.storage.local.set({ saveData: next });
    } catch (error) {
      console.error(error);
      window.alert(getMessage('form_errSaveFailed'));

      return null;
    }

    return next;
  };

  const result = writeQueue.then(write, write);

  writeQueue = result.catch(() => undefined);

  return result;
};
