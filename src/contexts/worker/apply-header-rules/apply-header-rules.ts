import type { HeaderRule } from '@/types';

import { resolveRulesToConditions } from './resolve-rules-to-conditions';

/**
 * updateDynamicRules が「Rule with id N ...」形式で報告してくる、個別ルールの
 * 拒否理由からその id プロパティの値を取り出す。例: append 操作は Chrome 内部の非公開な許可リスト
 * （複数値を許すヘッダーのみ）に無いヘッダー名だと拒否される、など。ホワイトリストを
 * こちら側で決め打ちすると Chrome のバージョンアップで簡単にズレるため、
 * エラーメッセージから該当ルールを特定して弾く方式にしている。
 */
const RULE_ID_PATTERN = /Rule with id (\d+)/;

const extractRejectedRuleId = (error: unknown) => {
  if (!(error instanceof Error)) {
    return null;
  }

  const match = RULE_ID_PATTERN.exec(error.message);
  const id = match ? Number(match[1]) : Number.NaN;

  return Number.isFinite(id) ? id : null;
};

/**
 * 保存済みルールごとに1つの動的ルールを組み立てる。ルールIDは配列の登場順で
 * 振り直すため、呼び出しのたびに前回分を全消しした上で addRules する。
 * declarativeNetRequest 側の rule.id は数値限定なので、UI 側の安定した id プロパティ
 * （crypto.randomUUID）とは別物として扱う。
 */
export const applyHeaderRules = async (rules: HeaderRule[]) => {
  let addRules = resolveRulesToConditions(rules);

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((rule) => rule.id);

  // 拒否のたびに該当ルールを1件ずつ addRules から除去するため、
  // 呼び出し回数は高々もとの addRules.length 回で収束する（無限ループしない）。
  for (;;) {
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({ addRules, removeRuleIds });
      return;
    } catch (error) {
      const rejectedId = extractRejectedRuleId(error);

      if (rejectedId === null) {
        throw error;
      }

      const before = addRules.length;
      addRules = addRules.filter((rule) => rule.id !== rejectedId);

      // addRules が縮まらない = rejectedId が addRules 側に無い
      // （removeRuleIds 側の id、または並行呼び出しによるスナップショットのずれ）。
      // 同じエラーを繰り返す無限ループを避けるためここで打ち切る。
      if (addRules.length === before) {
        throw error;
      }

      console.warn(`Skipping rule id ${rejectedId}: rejected by declarativeNetRequest.`, error);
    }
  }
};

/**
 * getDynamicRules 取得〜updateDynamicRules 確定の間に別呼び出しが割り込むと
 * removeRuleIds がずれて例外→打ち切りになる（上記コメント参照）。
 * storage.onChanged は短時間に連続発火し得るため、呼び出し自体を1本のキューに
 * 直列化して重ならないようにする。前段が reject しても後続は止めたいので、
 * onFulfilled/onRejected の両方に run を渡している。
 */
let queue = Promise.resolve();

export const queueApplyHeaderRules = (rules: HeaderRule[]) => {
  const run = () => applyHeaderRules(rules);

  const result = queue.then(run, run);

  queue = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
};
