import type { ModalData } from '@/contexts/popup/components/modal/types';
import { UI } from '@/contexts/popup/constants';
import { getMessage } from '@/utils';

export const renderData = (data: ModalData | undefined) => {
  UI.modalData.replaceChildren();

  if (data === undefined) {
    return;
  }

  if (typeof data === 'string') {
    const p = document.createElement('p');

    p.textContent = data;
    UI.modalData.append(p);
    return;
  }

  const asIs = document.createElement('p');
  const toBe = document.createElement('p');

  asIs.textContent = `${getMessage('modal_asIs')}: ${data.asIs}`;
  toBe.textContent = `${getMessage('modal_toBe')}: ${data.toBe}`;
  UI.modalData.append(asIs, toBe);
};
