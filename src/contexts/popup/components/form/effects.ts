import { CLASS_NAMES, UI } from '@/contexts/popup/constants';
import { STATE } from '@/contexts/popup/state';
import type { OperationType, HeaderRule, MatchType } from '@/types';
import { getMessage } from '@/utils';
import { isSafeUrl, isValidRegexp } from '@/validators';

import { isValidHeaderName, isValidHeaderValue } from './validators';

// matchType ごとにどの入力欄が必須になるかのマッピング。prefix は url 欄を共有するため、
// url と prefix の2キーが同じ input 要素を指す（=値としては重複がある）。
const MATCH_FIELD_INPUTS = {
  url: UI.urlInput,
  prefix: UI.urlInput,
  regexp: UI.regexpInput,
} as const satisfies Record<MatchType, HTMLInputElement>;

/**
 * 選択中の matchType を form 要素の data-match-type 属性へ反映する。表示の出し分け
 * （url / prefix / regexp の3フィールド）は CSS 側（`[data-match-type=...]`）が担う。
 * 値そのものは消さない。全種類の入力を保持しておき、フラグの切り替えだけで
 * 入力し直さずに済むようにするため。
 *
 * `display: none` にしても `required` 属性は外れない（ブラウザによっては非表示の
 * required 属性付き項目がバリデーションをブロックしたまま気づけない、という既知のハマりどころ）。
 * そのため required 属性は表示の出し分けとは別に、ここで明示的に切り替える。
 *
 * MATCH_FIELD_INPUTS は url/prefix のように複数キーが同じ input 要素を指しうるため、
 * Object.entries でキーごとに required を代入すると後発キーの判定が先発を上書きしてしまう。
 * そのため input 要素側から「今回選ばれた matchType の入力欄と同じか」を判定する。
 */
export const applyMatchTypeVisibility = (matchType: MatchType) => {
  UI.form.dataset['matchType'] = matchType;

  const requiredInput = MATCH_FIELD_INPUTS[matchType];

  for (const input of Object.values(MATCH_FIELD_INPUTS)) {
    input.required = input === requiredInput;
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
  isActive?: HeaderRule['isActive'];
  operation?: HeaderRule['operation'] | undefined;
}

export const resetFields = {
  /**
   * matchType / url / regexp を未入力状態に戻す。matchType を省略した場合は
   * 新規作成時のデフォルト（url）になる。
   */
  match: (params: MatchParams = {}) => {
    const matchType = params.matchType ?? 'url';

    UI.matchTypeSelect.value = matchType;
    applyMatchTypeVisibility(matchType);

    UI.urlInput.value = '';
    UI.regexpInput.value = '';
  },

  /**
   * headerName / isActive / operation / value を、呼び出し元から渡された値で初期化する。
   * 引数を省略した場合は新規作成時の初期値（isActive: true, operation: set）になる。
   * 保存直後は続けて同じ相手にルールを足していけるよう save-rule.ts が candidate をそのまま渡す
   * （isActive/operation は引き継がれ、headerName/value だけここで空になる）。
   */
  header: (params: HeaderParams = {}) => {
    const isActive = params.isActive ?? true;
    const operation = params.operation ?? 'set';

    UI.headerNameInput.value = '';
    UI.isActiveSelect.value = isActive ? 'true' : 'false';
    UI.operationSelect.value = operation;
    applyOperationVisibility(operation);
    UI.valueInput.value = '';
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

export const applyEditMode = {
  /**
   * ルール一覧のクリック時に呼ぶ。以後 Save はこのルールの id プロパティを上書きする
   * （url / headerName をここで変えても rename として扱われ、複製にならない）。
   */
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
  const operation = UI.operationSelect.value;

  // ガードは value.trim() ではなく value !== '' で行う。required 属性は空文字しか
  // 弾かないため、空白のみの入力は required を素通りしてここに来る。trim() の真偽で
  // ガードすると空白のみの入力が「未入力」と誤認されて検証自体がスキップされ、
  // isSafeUrl 等で本来弾かれるべき値がそのまま保存されてしまう
  // （空文字のときだけ required 側のメッセージに委ねてここでは何もしない）。
  const customValidities = {
    // matchType が url/prefix（ともに url 欄を共有）のときのみ検証。非ASCII文字は
    // isSafeUrl 内部の href 正規化で ASCII 化されるため、ここでは弾かれない。
    url:
      (matchType === 'url' || matchType === 'prefix') &&
      UI.urlInput.value !== '' &&
      !isSafeUrl(UI.urlInput.value)
        ? getMessage('form_errInvalidUrl')
        : '',

    // matchType が regexp のときのみ検証。
    regexp:
      matchType === 'regexp' && UI.regexpInput.value !== '' && !isValidRegexp(UI.regexpInput.value)
        ? getMessage('form_errInvalidRegexp')
        : '',

    // operation が remove のときは value を使わないため対象外。
    value:
      operation !== 'remove' && !isValidHeaderValue(UI.valueInput.value)
        ? getMessage('form_errInvalidHeaderValue')
        : '',

    headerName:
      UI.headerNameInput.value !== '' && !isValidHeaderName(UI.headerNameInput.value)
        ? getMessage('form_errInvalidHeaderName')
        : '',
  };

  UI.urlInput.setCustomValidity(customValidities.url);
  UI.regexpInput.setCustomValidity(customValidities.regexp);
  UI.valueInput.setCustomValidity(customValidities.value);
  UI.headerNameInput.setCustomValidity(customValidities.headerName);
};
