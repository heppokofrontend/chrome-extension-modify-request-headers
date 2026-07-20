import { CLASS_NAMES, UI } from '@/contexts/popup/constants';
import { STATE } from '@/contexts/popup/state';
import type { OperationType, HeaderRule, MatchType } from '@/types';
import { getMessage } from '@/utils';
import { isSafeUrl, isValidRegexp } from '@/validators';

import { getNormalizedUrl } from './utils';
import { isValidHeaderName, isValidHeaderValue } from './validators';

const MATCH_FIELD_INPUTS = {
  url: UI.urlInput,
  origin: UI.originInput,
  regexp: UI.regexpInput,
} as const satisfies Record<MatchType, HTMLInputElement>;

/**
 * 選択中の matchType を form 要素の data-match-type 属性へ反映する。表示の出し分け
 * （url / origin / regexp の3フィールド）は CSS 側（`[data-match-type=...]`）が担う。
 * 値そのものは消さない。全種類の入力を保持しておき、フラグの切り替えだけで
 * 入力し直さずに済むようにするため。
 *
 * `display: none` にしても `required` 属性は外れない（ブラウザによっては非表示の
 * required 属性付き項目がバリデーションをブロックしたまま気づけない、という既知のハマりどころ）。
 * そのため required 属性は表示の出し分けとは別に、ここで明示的に切り替える。
 */
export const applyMatchTypeVisibility = (matchType: MatchType) => {
  UI.form.dataset['matchType'] = matchType;

  for (const [type, input] of Object.entries(MATCH_FIELD_INPUTS)) {
    input.required = type === matchType;
  }
};

/**
 * 選択中の operation を form 要素の data-operation 属性へ反映するだけ。表示の出し分け
 * （value 入力要素を remove のとき隠す）は CSS 側（`[data-operation='remove']`）が担う。
 */
export const applyOperationVisibility = (operation: OperationType) => {
  UI.form.dataset['operation'] = operation;
};

interface MatchParams {
  matchType?: MatchType | undefined;
}
interface HeaderParams {
  origin?: HeaderRule['origin'];
  isActive?: HeaderRule['isActive'];
  operation?: HeaderRule['operation'] | undefined;
}

export const resetFields = {
  /**
   * matchType / url / origin / regexp を未入力状態に戻す。matchType を省略した場合は
   * 新規作成時のデフォルト（url）になる。
   */
  match: (params: MatchParams = {}) => {
    const matchType = params.matchType ?? 'url';

    UI.matchTypeSelect.value = matchType;
    applyMatchTypeVisibility(matchType);

    UI.urlInput.value = '';
    UI.originInput.value = '';
    UI.regexpInput.value = '';
  },

  /**
   * headerName / isActive / operation / value / origin を、呼び出し元から渡された値で初期化する。
   * 引数を省略した場合は新規作成時の初期値（isActive: true, operation: set, origin: 空）になる。
   * 保存直後は続けて同じ相手にルールを足していけるよう candidate.origin だけ渡す。
   */
  header: (params: HeaderParams = {}) => {
    const isActive = params.isActive ?? true;
    const operation = params.operation ?? 'set';

    UI.headerNameInput.value = '';
    UI.isActiveSelect.value = isActive ? 'true' : 'false';
    UI.operationSelect.value = operation;
    applyOperationVisibility(operation);
    UI.valueInput.value = '';
    UI.originInput.value = params.origin ?? '';
  },

  all: ({ matchType, operation }: MatchParams & HeaderParams = {}) => {
    resetFields.match({ matchType });
    resetFields.header({ operation });
  },
};

const clearEditButtonMark = () => {
  UI.rules
    .querySelector<HTMLButtonElement>(`button.${CLASS_NAMES.ruleEditButton}[data-edit="true"]`)
    ?.removeAttribute('data-edit');
};

/**
 * ルール一覧のクリック時に呼ぶ。以後 Save はこのルールの id プロパティを上書きする
 * （origin / headerName をここで変えても rename として扱われ、複製にならない）。
 */
export const applyEditMode = {
  start: (rule: HeaderRule) => {
    STATE.editingId = rule.id;

    clearEditButtonMark();
    UI.rules
      .querySelector<HTMLButtonElement>(
        `button.${CLASS_NAMES.ruleEditButton}[data-id="${rule.id}"]`,
      )
      ?.setAttribute('data-edit', 'true');

    UI.form.dataset['mode'] = 'edit';
    UI.matchTypeSelect.value = rule.matchType;
    UI.urlInput.value = rule.url;
    UI.originInput.value = rule.origin;
    UI.regexpInput.value = rule.regexp;
    applyMatchTypeVisibility(rule.matchType);

    UI.headerNameInput.value = rule.headerName;
    UI.isActiveSelect.value = String(rule.isActive);
    UI.operationSelect.value = rule.operation;
    applyOperationVisibility(rule.operation);
    UI.valueInput.value = rule.value;

    UI.matchTypeSelect.focus();
  },

  /**
   * フォームを「新規作成中」の状態に戻す。renderRules() を経由しないキャンセル操作
   * （on-edit-abort-click.ts）では一覧の DOM が作り直されず data-edit 属性が残り続けるため、
   * ここで明示的に外す（delete 側は renderRules() で一覧ごと作り直されるため実質無害）。
   */
  end: () => {
    STATE.editingId = '';
    UI.form.dataset['mode'] = 'create';

    clearEditButtonMark();
  },
};

/** renderRules() で作り直された一覧の中から、指定した data-id 属性の値の編集ボタンにフォーカスを戻す。 */
export const focusRuleButton = (id: string) => {
  UI.rules
    .querySelector<HTMLButtonElement>(`button.${CLASS_NAMES.ruleEditButton}[data-id="${id}"]`)
    ?.focus();
};

/**
 * required 属性だけでは拾えない「入力はあるが値としてパースできない」ケースを
 * カスタムメッセージでネイティブのバリデーションUIに乗せる。有効な matchType 側のみ検証する。
 *
 * setCustomValidity は明示的に呼び直すまでクリアされないため、submit 時だけでなく
 * 各入力欄の input イベント（handlers/on-field-input.ts）からも呼び、値を打ち直した後まで
 * 古いエラーメッセージが残り続けないようにする。
 */
export const setCustomValidities = () => {
  const matchType = UI.matchTypeSelect.value as MatchType;
  const normalizedOrigin = getNormalizedUrl.asOrigin(UI.originInput.value);
  const operation = UI.operationSelect.value;

  // url 入力: matchType が url のときのみ検証。非ASCII文字は isSafeUrl 側で
  // 正規化して受理するため、ここでは URL として妥当かどうかだけを見る。
  const urlMessage = (() => {
    const url = UI.urlInput.value;

    if (matchType !== 'url' || !url.trim()) {
      return '';
    }

    return isSafeUrl(url) ? '' : getMessage('form_errInvalidUrl');
  })();

  UI.urlInput.setCustomValidity(urlMessage);

  // origin 入力: matchType が origin のときのみ検証。
  UI.originInput.setCustomValidity(
    matchType === 'origin' && UI.originInput.value.trim() && normalizedOrigin === undefined
      ? getMessage('form_errInvalidOrigin')
      : '',
  );

  // regexp 入力: matchType が regexp のときのみ検証。
  UI.regexpInput.setCustomValidity(
    matchType === 'regexp' && UI.regexpInput.value.trim() && !isValidRegexp(UI.regexpInput.value)
      ? getMessage('form_errInvalidRegexp')
      : '',
  );

  // value 入力: operation が remove のときは value を使わないため対象外。
  UI.valueInput.setCustomValidity(
    operation !== 'remove' && !isValidHeaderValue(UI.valueInput.value)
      ? getMessage('form_errInvalidHeaderValue')
      : '',
  );

  // headerName 入力
  UI.headerNameInput.setCustomValidity(
    UI.headerNameInput.value.trim() && !isValidHeaderName(UI.headerNameInput.value)
      ? getMessage('form_errInvalidHeaderName')
      : '',
  );
};
