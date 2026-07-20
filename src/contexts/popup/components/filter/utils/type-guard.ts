import { FILTER_STATUSES } from '@/contexts/popup/components/filter/constants';
import type { FilterStatus } from '@/contexts/popup/components/filter/types';

export const isFilterStatus = (value: unknown): value is FilterStatus =>
  typeof value === 'string' && (FILTER_STATUSES as readonly string[]).includes(value);
