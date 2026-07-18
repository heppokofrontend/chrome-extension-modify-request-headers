import { onFilterInput, onFilterStatusChange } from '@/contexts/popup/components/filter';
import {
  onDeleteClick,
  onEditAbortClick,
  onFieldInput,
  onMatchTypeChange,
  onOperationChange,
  onOriginChange,
  onSubmitForm,
  resetFields,
} from '@/contexts/popup/components/form';
import { renderRules } from '@/contexts/popup/components/rules';
import { renderStatus } from '@/contexts/popup/components/status';
import { STATE } from '@/contexts/popup/state';
import { getSaveData } from '@/utils';

import { UI } from './constants';

const addListener = () => {
  // input 要素で Enter を押すとネイティブの form 要素の submit イベントで popup ごとリロードされ、
  // 非同期の chrome.storage.local.set が完了前に消える。save ボタン（type="submit"）押下も
  // 同じ submit イベントで拾えるので、ここに一本化する。
  UI.form.addEventListener('submit', (e) => {
    void onSubmitForm(e);
  });

  UI.matchTypeSelect.addEventListener('change', onMatchTypeChange);
  UI.originInput.addEventListener('change', onOriginChange);
  UI.operationSelect.addEventListener('change', onOperationChange);
  UI.deleteButton.addEventListener('click', (e) => {
    void onDeleteClick(e);
  });
  UI.editAbortButton.addEventListener('click', onEditAbortClick);

  UI.urlInput.addEventListener('input', onFieldInput);
  UI.originInput.addEventListener('input', onFieldInput);
  UI.regexpInput.addEventListener('input', onFieldInput);
  UI.headerNameInput.addEventListener('input', onFieldInput);
  UI.valueInput.addEventListener('input', onFieldInput);
  UI.filterInput.addEventListener('input', onFilterInput);
  UI.filterStatusSelect.addEventListener('change', onFilterStatusChange);

  UI.modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
    }
  });
};

const init = async () => {
  STATE.saveData = await getSaveData();

  const { matchType, operation } = STATE.saveData.formState;

  addListener();
  renderRules();
  void renderStatus();
  resetFields.all({ matchType, operation });
};

void init();
