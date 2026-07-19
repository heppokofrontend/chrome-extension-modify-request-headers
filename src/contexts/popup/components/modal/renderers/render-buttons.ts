import { UI } from '@/contexts/popup/constants';
import { getMessage } from '@/utils';

import { buildButton } from './build-button';

interface Params {
  onClickConfirm: () => void;
  onClickCancel: () => void;
}

export const renderButtons = ({ onClickConfirm, onClickCancel }: Params) => {
  const confirm = buildButton(getMessage('modal_confirmButton'), onClickConfirm);
  const cancel = buildButton(getMessage('modal_cancelButton'), onClickCancel);

  UI.modalButtonsContainer.append(confirm, cancel);
};
