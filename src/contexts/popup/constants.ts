/* eslint-disable @typescript-eslint/no-non-null-assertion */
// rules/renderers/render-rules.ts（className付与）と form/effects.ts（querySelector）の
// 両方から同じ文字列で参照されるため、片方だけの変更で壊れないようここに集約する。
export const CLASS_NAMES = { ruleEditButton: 'rule__edit' } as const;

// popup.html は静的なマークアップなので、要素の存在は保証されている前提で
// ここで一括して取得する。呼び出し側で毎回 null チェックをしなくて済むようにするため。
export const UI = {
  form: document.querySelector<HTMLFormElement>('#form')!,
  matchTypeSelect: document.querySelector<HTMLSelectElement>('#select-matchType')!,
  urlInput: document.querySelector<HTMLInputElement>('#input-url')!,
  urlDatalist: document.querySelector<HTMLDataListElement>('#datalist-url')!,
  regexpInput: document.querySelector<HTMLInputElement>('#input-regexp')!,
  regexpDatalist: document.querySelector<HTMLDataListElement>('#datalist-regexp')!,
  headerNameInput: document.querySelector<HTMLInputElement>('#input-headerName')!,
  isActiveSelect: document.querySelector<HTMLSelectElement>('#select-isActive')!,
  operationSelect: document.querySelector<HTMLSelectElement>('#select-operation')!,
  valueInput: document.querySelector<HTMLTextAreaElement>('#textarea-value')!,
  deleteButton: document.querySelector<HTMLButtonElement>('button[data-action=delete]')!,
  editAbortButton: document.querySelector<HTMLButtonElement>('button[data-action=edit-abort]')!,

  rules: document.querySelector<HTMLDivElement>('div#rules')!,

  status: document.querySelector<HTMLParagraphElement>('p#status')!,

  filterStatusSelect: document.querySelector<HTMLSelectElement>('select#filter-select')!,
  filterInput: document.querySelector<HTMLInputElement>('input#filter-input')!,
  filterResult: document.querySelector<HTMLSpanElement>('span#filter-result')!,

  modal: document.querySelector<HTMLDialogElement>('dialog#modal')!,
  modalMessage: document.querySelector<HTMLParagraphElement>('p#modal-message')!,
  modalData: document.querySelector<HTMLDivElement>('div#modal-data')!,
  modalButtonsContainer: document.querySelector<HTMLParagraphElement>('p#modal-buttons')!,
};
