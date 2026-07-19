import { UI } from '@/contexts/popup/constants';
import { getMessage } from '@/utils';

import { buildButton, renderData } from './renderers';
import type { ModalData } from './types';

/**
 * window.confirm の代わりに使う dialog要素版。OK/Cancel をボタンで選ばせて Promise<boolean> で結果を返す。
 *
 * `message` は静的な文言（i18nメッセージ本文）、`data` はルールの値そのものなど
 * ユーザー入力を含みうる可変部分。両方とも textContent で描画し、HTML文字列の組み立てを
 * 経由しないことで、ユーザー入力に含まれるマークアップがそのまま実行される事故を防ぐ。
 */
export const confirmModal = (message: string, data?: ModalData) => {
  UI.modalMessage.textContent = message;
  renderData(data);
  UI.modalButtonsContainer.replaceChildren();

  UI.modal.showModal();
  UI.modal.focus();

  return new Promise<boolean>((resolve) => {
    const finish = (result: boolean) => {
      UI.modalButtonsContainer.replaceChildren();
      UI.modal.close();
      resolve(result);
    };

    UI.modalButtonsContainer.append(
      buildButton(getMessage('modal_confirmButton'), () => {
        finish(true);
      }),
      buildButton(getMessage('modal_cancelButton'), () => {
        finish(false);
      }),
    );
  });
};
