import type { HeaderRule, SaveData } from '@/types';

import { getMessage } from './i18n';
import { isHeaderRule, isMatchType, isOperationType, isRecord } from './type-guards';

const defaultFormState = {
  matchType: 'url',
  operation: 'set',
} as const satisfies SaveData['formState'];

export const getDefaultFormState = (): SaveData['formState'] => ({
  ...defaultFormState,
});

// key ごとに chrome.storage.local の別々のトップレベルエントリとして永続化するため、
// 読み取り・サニタイズも key 単位で完結させる。
const sanitize: { [K in keyof SaveData]: (value: unknown) => SaveData[K] } = {
  rules: (rules: unknown): HeaderRule[] => {
    if (!Array.isArray(rules)) {
      return [];
    }

    return rules.filter((rule, index): rule is HeaderRule => {
      if (isHeaderRule(rule)) {
        return true;
      }
      console.warn(`Skipping malformed rule at index ${index} in saved data.`, rule);
      return false;
    });
  },
  formState: (formState: unknown): SaveData['formState'] => {
    if (!isRecord(formState)) {
      return { ...defaultFormState };
    }

    return {
      matchType: isMatchType(formState['matchType'])
        ? formState['matchType']
        : defaultFormState.matchType,
      operation: isOperationType(formState['operation'])
        ? formState['operation']
        : defaultFormState.operation,
    };
  },
};

export function getStorage(): Promise<SaveData>;
export function getStorage<K extends keyof SaveData>(key: K): Promise<SaveData[K]>;
export async function getStorage<K extends keyof SaveData>(
  key?: K,
): Promise<SaveData | SaveData[K]> {
  if (key !== undefined) {
    const stored = await chrome.storage.local.get(key);
    return sanitize[key](stored[key]);
  }

  const stored = await chrome.storage.local.get(['rules', 'formState']);
  return {
    rules: sanitize.rules(stored['rules']),
    formState: sanitize.formState(stored['formState']),
  };
}

// 呼び出し側には await せず setStorage を撃ちっぱなしにする箇所があるため、
// 直列化しないと後発の読み取りが先発の書き込み前の値を拾って更新を握りつぶす。
// key ごとに独立したエントリへ書き込むため、キューも key ごとに持ち、
// 無関係な key への書き込みまで互いを待たせない。
const writeQueues = new Map<keyof SaveData, Promise<unknown>>();

/**
 * SaveData の特定の key を書き換える唯一の入口。key ごとに chrome.storage.local
 * の別々のトップレベルエントリとして永続化する。第2引数は React の setState
 * 同様、値そのものか current から次の値を組み立てる updater 関数のどちらかを
 * 渡す。updater を渡した場合の current は呼び出し側が持つUIステートのキャッシュ
 * ではなく、必ず getStorage(key) で実際の永続化先から読み直す。
 * このモジュールは popup 専用の STATE（UIステート）を知らないレイヤーに
 * 置くため、STATE への反映は行わない。呼び出し側は戻り値（成功時は次の
 * SaveData[K]、失敗時は null）を await または then() で受け取り、成功時に
 * 自分の持つ UI ステートへ書き込むこと。
 */
export const setStorage = <K extends keyof SaveData>(
  key: K,
  value: SaveData[K] | ((current: SaveData[K]) => SaveData[K]),
): Promise<SaveData[K] | null> => {
  const write = async (): Promise<SaveData[K] | null> => {
    const nextValue = typeof value === 'function' ? value(await getStorage(key)) : value;

    try {
      await chrome.storage.local.set({ [key]: nextValue });
    } catch (error) {
      console.error(error);
      window.alert(getMessage('form_errSaveFailed'));

      return null;
    }

    return nextValue;
  };

  const queued = writeQueues.get(key) ?? Promise.resolve();
  const result = queued.then(write, write);

  writeQueues.set(
    key,
    result.catch(() => undefined),
  );

  return result;
};
