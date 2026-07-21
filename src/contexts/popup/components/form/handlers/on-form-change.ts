import { STATE } from '@/contexts/popup/state';

export const onFormChange = () => {
  STATE.formState.isDirty = true;
};
