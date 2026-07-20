import { editAbort } from '@/contexts/popup/components/form/effects';

export const onEditAbortClick = (e: Event) => {
  e.preventDefault();
  editAbort();
};
