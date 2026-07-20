import { STATE } from '@/contexts/popup/state';

export const getRuleById = (id: string) => STATE.rules.find((rule) => rule.id === id) ?? null;
