import { STATE } from '@/contexts/popup/state';

export const getRuleById = (id: string) =>
  STATE.saveData.rules.find((rule) => rule.id === id) ?? null;
