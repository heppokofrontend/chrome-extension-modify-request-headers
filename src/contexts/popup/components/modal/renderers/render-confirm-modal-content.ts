import type { ModalData } from '@/contexts/popup/components/modal/types';
import { UI } from '@/contexts/popup/constants';
import { getMessage } from '@/utils';

interface Params {
  message: string;
  data: ModalData | undefined;
}

export const renderConfirmModalContent = ({ message, data }: Params) => {
  UI.modalMessage.textContent = message;
  UI.modalButtonsContainer.replaceChildren();
  UI.modalData.replaceChildren();

  switch (typeof data) {
    case 'string': {
      const p = document.createElement('p');

      p.textContent = data;
      UI.modalData.append(p);
      return;
    }

    case 'object': {
      const asIs = document.createElement('p');
      const toBe = document.createElement('p');

      asIs.textContent = `${getMessage('modal_asIs')}: ${data.asIs}`;
      toBe.textContent = `${getMessage('modal_toBe')}: ${data.toBe}`;
      UI.modalData.append(asIs, toBe);
      return;
    }

    default:
      return;
  }
};
