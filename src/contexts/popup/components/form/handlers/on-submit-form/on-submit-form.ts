import { setCustomValidities } from '@/contexts/popup/components/form/effects';
import { getNormalizedOrigin } from '@/contexts/popup/components/form/utils';
import { UI } from '@/contexts/popup/constants';
import { STATE } from '@/contexts/popup/state';
import { getMessage, isMatchType, isOperationType } from '@/utils';
import { isRegexSupportedByEngine } from '@/validators';

import { saveRule } from './save-rule';

export const onSubmitForm = async (e: SubmitEvent) => {
  e.preventDefault();

  const matchType = UI.matchTypeSelect.value;

  if (!isMatchType(matchType)) {
    return;
  }

  const operation = UI.operationSelect.value;

  // required 属性だけでは拾えない「入力はあるが値としてパースできない」ケースを
  // カスタムメッセージでネイティブのバリデーションUIに乗せる。有効な matchType 側のみ検証する。
  setCustomValidities();

  if (!UI.form.reportValidity()) {
    return;
  }

  // isValidRegexp（JSのRegExpで通るか）は通っても、RE2構文では拒否される場合がある
  // （lookbehind・後方参照など）。その場合 worker 側が該当ルールを黙ってスキップし
  // 「保存できるのに効かない」状態になるため、保存直前に検証専用APIで最終チェックする。
  if (matchType === 'regexp') {
    const isSupported = await isRegexSupportedByEngine(UI.regexpInput.value.trim());

    if (!isSupported) {
      UI.regexpInput.setCustomValidity(getMessage('form_errUnsupportedRegexp'));
      UI.form.reportValidity();
      return;
    }

    UI.regexpInput.setCustomValidity('');
  }

  const headerName = UI.headerNameInput.value.trim();

  if (!headerName || !isOperationType(operation)) {
    return;
  }

  const origin = UI.originInput.value.trim();

  await saveRule({
    id: STATE.editingId || crypto.randomUUID(),
    matchType,
    // matchType が何であっても、3種類すべての入力値をそのまま保持する
    // （フラグを切り替えても入力し直さずに済むようにするため）。
    // url は表示・編集時に人間が読める見た目を保つため、生入力のまま保存する
    // （punycode / パーセントエンコード正規化は isMatchedRule・resolveRulesToConditions が
    // 使用直前に行う。ここで正規化すると例えば非ASCIIドメインが保存直後からpunycode表示になり、
    // 編集フォームを開いた時も入力し直したような見た目になってしまうため）。
    url: UI.urlInput.value.trim(),
    origin: getNormalizedOrigin(origin) ?? origin,
    regexp: UI.regexpInput.value.trim(),
    headerName,
    operation,
    value: UI.valueInput.value,
    isActive: UI.isActiveSelect.value === 'true',
  });
};
