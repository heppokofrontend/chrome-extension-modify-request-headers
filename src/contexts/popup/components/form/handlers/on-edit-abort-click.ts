import {
  applyEditMode,
  focusRuleButton,
  resetFields,
} from '@/contexts/popup/components/form/effects';
import { STATE } from '@/contexts/popup/state';

export const onEditAbortClick = (e: Event) => {
  e.preventDefault();

  const { editingId } = STATE;

  if (!editingId) {
    return;
  }

  resetFields.all();
  applyEditMode.end();
  focusRuleButton(editingId);
};
