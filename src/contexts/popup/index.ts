import { onFilterInput, onFilterStatusChange } from '@/contexts/popup/components/filter';
import {
  onDeleteClick,
  onEditAbortClick,
  onFieldInput,
  onMatchTypeChange,
  onOperationChange,
  onSubmitForm,
  onUrlChange,
  resetFields,
} from '@/contexts/popup/components/form';
import { STATE } from '@/contexts/popup/state';
import { getStorage } from '@/utils';

import { UI } from './constants';
import { refreshRulesViews } from './effects';

const addListener = () => {
  // input 要素で Enter を押すとネイティブの form 要素の submit イベントで popup ごとリロードされ、
  // 非同期の chrome.storage.local.set が完了前に消える。save ボタン（type="submit"）押下も
  // 同じ submit イベントで拾えるので、ここに一本化する。
  UI.form.addEventListener('submit', (e) => {
    void onSubmitForm(e);
  });

  UI.matchTypeSelect.addEventListener('change', onMatchTypeChange);
  UI.operationSelect.addEventListener('change', onOperationChange);
  UI.deleteButton.addEventListener('click', (e) => {
    void onDeleteClick(e);
  });
  UI.editAbortButton.addEventListener('click', onEditAbortClick);

  UI.urlInput.addEventListener('change', onUrlChange);
  UI.urlInput.addEventListener('input', onFieldInput);
  UI.regexpInput.addEventListener('input', onFieldInput);
  UI.headerNameInput.addEventListener('input', onFieldInput);
  UI.valueInput.addEventListener('input', onFieldInput);
  UI.filterInput.addEventListener('input', onFilterInput);
  UI.filterStatusSelect.addEventListener('change', onFilterStatusChange);

  // モーダルを閉じるつもりでpopupが閉じてしまうのを防ぐ
  UI.modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
    }
  });
};

const init = async () => {
  Object.assign(STATE, await getStorage());

  const { matchType, operation } = STATE.formState;

  addListener();
  refreshRulesViews();
  resetFields.all({ matchType, operation });
};

void init();
